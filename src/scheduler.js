import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { loadCompetitorIndices, syncProductToShopify } from './sync/sync_engine.js';
import { logSyncSummary, logSyncError } from './utils/logger.js';

/**
 * Master Sync Pipeline
 * 1. Checks LiquorConnect Master CSV
 * 2. Loads Competitor Indexes (ZYN + BSW)
 * 3. Compares Prices with 14% -> 10% -> 5% Cascade (5% profit floor)
 * 4. Applies 27% Markup when competitors are OOS
 * 5. Applies Verified or Packaging Formula Weights
 * 6. Updates Shopify Inventory + Prices + Tags
 */
export async function runFullSync(batchLimit = null) {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(65));
  console.log(`🚀 [${new Date().toISOString()}] Starting Master Daily Sync Pipeline`);
  console.log('='.repeat(65));

  const csvFile = path.resolve('shopify_all_products_import.csv');
  if (!fs.existsSync(csvFile)) {
    const errMsg = 'CRITICAL: LiquorConnect master catalog CSV not found!';
    console.error(`❌ ${errMsg}`);
    logSyncError({ error: errMsg });
    return;
  }

  // 1. Load Competitor Catalogs
  const { zynIndex, bswIndex } = loadCompetitorIndices();

  // 2. Read Master Products
  console.log('📄 Reading master products catalogue...');
  const csvContent = fs.readFileSync(csvFile, 'utf8');
  let records = parse(csvContent, { columns: true, skip_empty_lines: true });

  if (batchLimit && batchLimit > 0) {
    console.log(`⚠️ Batch Limit Applied: Running on first ${batchLimit} products only.`);
    records = records.slice(0, batchLimit);
  }

  console.log(`📦 Total Products to Process: ${records.length}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const sku = (r['Variant SKU'] || '').trim();
    const title = (r['Title'] || '').trim();
    const cost = (r['Variant Compare At Price'] || '0').trim();
    const tags = r['Tags'] || '';
    const isStock = tags.includes('In-Stock');

    if (!sku) {
      skippedCount++;
      continue;
    }

    const item = {
      SKU: sku,
      Name: title,
      Cost: cost,
      Size: '',
      AvailabilityDisplay: isStock ? 'In Stock' : 'Out of Stock'
    };

    try {
      const res = await syncProductToShopify(item, zynIndex, bswIndex);
      if (res) {
        updatedCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      errorCount++;
      logSyncError({ sku, title, error: err.message });
    }

    // Rate-limiting delay for Shopify API compliance
    if ((i + 1) % 50 === 0) {
      console.log(`⏳ Progress: [${i + 1}/${records.length}] products processed...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const durationSec = +((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(65));
  console.log('🎉 Master Daily Sync Pipeline Completed!');
  console.log(`   • Total Processed: ${records.length}`);
  console.log(`   • Updated:         ${updatedCount}`);
  console.log(`   • Skipped:         ${skippedCount}`);
  console.log(`   • Errors:          ${errorCount}`);
  console.log(`   • Duration:        ${durationSec} seconds`);
  console.log('='.repeat(65) + '\n');

  // Record summary to logs/sync_history.json
  logSyncSummary({
    totalProductsProcessed: records.length,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errorCount,
    durationSeconds: durationSec
  });
}

// Zero-dependency Daily Timer: Schedule at target hour (Default 00:00 / 12:00 AM Midnight)
function startDailyTimer(targetHour = 0) {
  console.log(`⏰ ShopifySynq Daily Daemon Active.`);
  console.log(`   Target Schedule: Every night at 12:00 AM Midnight (${targetHour.toString().padStart(2, '0')}:00)`);

  function scheduleNext() {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(targetHour, 0, 0, 0);

    if (now >= nextRun) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilRun = nextRun.getTime() - now.getTime();
    console.log(`   Next scheduled sync in ${(msUntilRun / 1000 / 60 / 60).toFixed(2)} hours (at ${nextRun.toLocaleString()})...`);

    setTimeout(async () => {
      console.log(`⏰ Triggering daily scheduled sync at ${new Date().toLocaleTimeString()}!`);
      try {
        await runFullSync();
      } catch (e) {
        console.error('Scheduler sync error:', e);
      }
      scheduleNext();
    }, msUntilRun);
  }

  scheduleNext();
}

// CLI Interface
const args = process.argv.slice(2);
const isManualRun = args.includes('--now') || args.includes('-n');
const limitIndex = args.indexOf('--limit');
const limitVal = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null;

if (isManualRun) {
  console.log('⚡ Manual one-off sync triggered by user/operator.');
  runFullSync(limitVal);
} else {
  startDailyTimer(0); // Runs at 12:00 AM Midnight
}
