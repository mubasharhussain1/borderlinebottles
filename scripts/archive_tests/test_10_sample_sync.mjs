import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { loadCompetitorIndices, syncProductToShopify } from './src/sync/sync_engine.js';

async function runSampleTest() {
  console.log('====================================================');
  console.log('   🧪 Running Live 10-Product Sync Test (TASK-06)');
  console.log('====================================================\n');

  // 1. Load competitor indices
  const { zynIndex, bswIndex } = loadCompetitorIndices();

  // 2. Parse CSV properly with standard csv-parse library (no split comma bugs)
  const csvText = fs.readFileSync('shopify_all_products_import.csv', 'utf8');
  const records = parse(csvText, { columns: true, skip_empty_lines: true });

  const first10 = records.slice(0, 10);

  console.log(`\nTesting first 10 products properly parsed:`);
  first10.forEach((r, i) => {
    console.log(`${i + 1}. SKU: "${r['Variant SKU']}" | "${r['Title']}" | Price: $${r['Variant Price']} | Cost: $${r['Variant Compare At Price']}`);
  });

  let count = 1;
  for (const r of first10) {
    const item = {
      SKU: r['Variant SKU']?.trim(),
      Name: r['Title']?.trim(),
      Cost: r['Variant Compare At Price']?.trim(), // This is the original LiquorConnect wholesale unit cost
      Size: '',
      AvailabilityDisplay: (r['Tags'] || '').includes('In-Stock') ? 'In Stock' : 'Out of Stock'
    };

    console.log(`\n▶️ [${count}/10] Processing SKU: ${item.SKU} - "${item.Name}" (Cost: $${item.Cost})...`);
    try {
      await syncProductToShopify(item, zynIndex, bswIndex);
    } catch (e) {
      console.error(`❌ Error on SKU ${item.SKU}:`, e.message);
    }

    count++;
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log('\n====================================================');
  console.log('🎉 10-Product Sample Sync Test Completed!');
  console.log('====================================================\n');
}

runSampleTest();
