/**
 * Mass Fix: 645 Products with Sale Price Discrepancy
 * 
 * These products have BSW/ZYN running a sale (compareAtPrice != price).
 * Previously our engine used sale price as competitor reference → wrong price on Shopify.
 * Now we use REGULAR price (compareAtPrice) → correct 14% off regular, correct compareAt badge.
 * 
 * Flow:
 * 1. Scan full CSV, match against ZYN/BSW
 * 2. Find products where competitor is ON SALE (compareAtPrice != price)
 * 3. Recalculate correct price using regular price
 * 4. Update Shopify via productVariantsBulkUpdate
 * 5. Checkpoint resume support
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { buildCatalogIndex, matchProduct } from './src/matching/product_matcher.js';
import { calculatePrice } from './src/pricing/pricing_engine.js';
import { shopifyGraphQL } from './src/shopify/client.js';

const STATE_FILE = 'fix_sale_price_state.json';

// ─── Load Catalogs ────────────────────────────────────────────────────────────
console.log('📦 Loading catalogs...');
const bswRaw = JSON.parse(fs.readFileSync('bsw_catalog.json', 'utf8'));
const bsw = Array.isArray(bswRaw) ? bswRaw : Object.values(bswRaw);
const bswIndex = buildCatalogIndex(bsw, 'bsw');

const zynRaw = JSON.parse(fs.readFileSync('zyn_catalog.json', 'utf8'));
const zyn = Array.isArray(zynRaw) ? zynRaw : zynRaw;
const zynIndex = buildCatalogIndex(zyn, 'zyn');

const csvContent = fs.readFileSync('shopify_all_products_import.csv', 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });
console.log(`📄 Total LC products: ${records.length}`);

// ─── Build Fix List ───────────────────────────────────────────────────────────
console.log('🔍 Scanning for sale-price discrepancies...');
const fixList = [];

for (const r of records) {
  const sku = (r['Variant SKU'] || '').trim();
  const title = (r['Title'] || '').trim();
  const cost = parseFloat((r['Variant Compare At Price'] || '0').replace(/[$,]/g, ''));
  const tags = r['Tags'] || '';
  const isStock = tags.includes('In-Stock');

  if (!sku || isNaN(cost) || cost <= 0) continue;

  const matches = matchProduct({ sku, title, size: '' }, zynIndex, bswIndex);

  const zynRaw2 = matches.zyn?.candidate?.raw;
  const bswRaw2 = matches.bsw?.candidate?.raw;

  // Check if competitor is running a sale (regular != sale price)
  const zynHasSale = zynRaw2?.compareAtPrice && zynRaw2?.price && 
                     parseFloat(zynRaw2.compareAtPrice) !== parseFloat(zynRaw2.price);
  const bswHasSale = bswRaw2?.compareAtPrice && bswRaw2?.price && 
                     parseFloat(bswRaw2.compareAtPrice) !== parseFloat(bswRaw2.price);

  if (!zynHasSale && !bswHasSale) continue; // No sale, skip

  // Get correct regular prices
  const zynRegular = zynHasSale ? parseFloat(zynRaw2.compareAtPrice) : (parseFloat(zynRaw2?.price) || null);
  const zynInStock = matches.zyn ? matches.zyn.available : false;
  const bswRegular = bswHasSale ? parseFloat(bswRaw2.compareAtPrice) : (parseFloat(bswRaw2?.price) || null);
  const bswInStock = matches.bsw ? matches.bsw.available : false;

  // Recalculate correct price using regular prices
  const priceResult = calculatePrice(cost, zynRegular, zynInStock, bswRegular, bswInStock);

  if (priceResult.flagForReview || !priceResult.finalPrice) continue; // Skip floor-flagged

  fixList.push({
    sku,
    title,
    cost,
    newPrice: priceResult.finalPrice.toFixed(2),
    newCompareAt: priceResult.compareAtPrice ? priceResult.compareAtPrice.toFixed(2) : null,
    discount: priceResult.discountApplied,
    zynRegular,
    bswRegular,
  });
}

console.log(`\n✅ Found ${fixList.length} products needing price correction\n`);
if (fixList.length === 0) {
  console.log('Nothing to fix!');
  process.exit(0);
}

// Show first 5 as preview
console.log('Sample fixes:');
fixList.slice(0, 5).forEach(f => {
  console.log(`  SKU ${f.sku}: "${f.title.substring(0,45)}..." → $${f.newPrice} (compareAt: $${f.newCompareAt})`);
});

// ─── Checkpoint Resume ────────────────────────────────────────────────────────
let startIdx = 0;
if (fs.existsSync(STATE_FILE)) {
  try {
    const st = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (typeof st.lastIndex === 'number' && st.lastIndex < fixList.length) {
      startIdx = st.lastIndex;
      console.log(`\n♻️ Resuming from checkpoint: ${startIdx}/${fixList.length}`);
    }
  } catch {}
}

function saveCheckpoint(idx) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastIndex: idx, updatedAt: new Date().toISOString() }));
}

// ─── Helper: Find + Update Shopify Product ────────────────────────────────────
async function fixProduct(item) {
  // Find by SKU
  const findQuery = `
    query($q: String!) {
      products(first: 1, query: $q) {
        nodes {
          id
          variants(first: 1) {
            nodes { id sku price compareAtPrice }
          }
        }
      }
    }
  `;
  const found = await shopifyGraphQL(findQuery, { q: `sku:${item.sku} status:active` });
  const product = found?.products?.nodes?.[0];
  if (!product) return { status: 'not_found' };

  const variant = product.variants.nodes[0];

  // Skip if already correct
  if (parseFloat(variant.price) === parseFloat(item.newPrice) &&
      (item.newCompareAt ? parseFloat(variant.compareAtPrice) === parseFloat(item.newCompareAt) : !variant.compareAtPrice)) {
    return { status: 'skipped_already_correct' };
  }

  // Update
  const updateMut = `
    mutation U($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price compareAtPrice }
        userErrors { field message }
      }
    }
  `;
  const updated = await shopifyGraphQL(updateMut, {
    productId: product.id,
    variants: [{
      id: variant.id,
      price: item.newPrice,
      compareAtPrice: item.newCompareAt || null
    }]
  });

  const errs = updated?.productVariantsBulkUpdate?.userErrors;
  if (errs?.length > 0) return { status: 'error', errors: errs };
  return { status: 'updated' };
}

// ─── Main Loop ────────────────────────────────────────────────────────────────
let updated = 0, skipped = 0, errors = 0, notFound = 0;
const BATCH = 5;

console.log(`\n🚀 Starting Shopify updates (${fixList.length - startIdx} remaining)...\n`);

for (let i = startIdx; i < fixList.length; i += BATCH) {
  const chunk = fixList.slice(i, i + BATCH);

  const results = await Promise.allSettled(chunk.map(item => fixProduct(item)));

  results.forEach((r, idx) => {
    const item = chunk[idx];
    if (r.status === 'fulfilled') {
      const s = r.value.status;
      if (s === 'updated') { updated++; }
      else if (s === 'skipped_already_correct') { skipped++; }
      else if (s === 'not_found') { notFound++; }
      else { errors++; console.error(`  ❌ ${item.sku}: ${JSON.stringify(r.value.errors)}`); }
    } else {
      errors++;
      console.error(`  ❌ ${item.sku}: ${r.reason?.message}`);
    }
  });

  const nextIdx = Math.min(i + BATCH, fixList.length);
  saveCheckpoint(nextIdx);

  console.log(`⚡ [${nextIdx}/${fixList.length}] Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors} | Not Found: ${notFound}`);

  await new Promise(r => setTimeout(r, 600));
}

// Cleanup checkpoint
if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);

console.log('\n' + '='.repeat(60));
console.log('🎉 SALE PRICE FIX COMPLETE!');
console.log(`   Updated:   ${updated}`);
console.log(`   Skipped:   ${skipped} (already correct)`);
console.log(`   Not Found: ${notFound}`);
console.log(`   Errors:    ${errors}`);
console.log('='.repeat(60));
