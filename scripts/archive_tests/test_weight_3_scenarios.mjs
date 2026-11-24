import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { loadCompetitorIndices, syncProductToShopify, findShopifyProductBySku } from './src/sync/sync_engine.js';
import { calculateShippingWeight } from './src/utils/weight_calculator.js';

const targetSkus = [
  { sku: '7617', label: 'SCENARIO 1: Weight from ZYN' },
  { sku: '53978', label: 'SCENARIO 2: Weight from BSW (ZYN has no weight)' },
  { sku: '4648', label: 'SCENARIO 3: Neither competitor has weight -> Formula Fallback' }
];

async function syncAndTest3WeightScenarios() {
  console.log('====================================================');
  console.log('   🧪 Testing 3 Weight Scenarios Live on Shopify');
  console.log('====================================================\n');

  const { zynIndex, bswIndex } = loadCompetitorIndices();

  const csvText = fs.readFileSync('shopify_all_products_import.csv', 'utf8');
  const records = parse(csvText, { columns: true, skip_empty_lines: true });

  for (const t of targetSkus) {
    console.log(`\n▶️ Running ${t.label} (SKU: ${t.sku})...`);
    const record = records.find(r => (r['Variant SKU'] || '').trim() === t.sku);
    if (!record) {
      console.log(`   ❌ Record for SKU ${t.sku} not found in CSV`);
      continue;
    }

    const item = {
      SKU: t.sku,
      Name: record['Title']?.trim(),
      Cost: record['Variant Compare At Price']?.trim(),
      Size: '',
      AvailabilityDisplay: (record['Tags'] || '').includes('In-Stock') ? 'In Stock' : 'Out of Stock'
    };

    await syncProductToShopify(item, zynIndex, bswIndex);
    await new Promise(r => setTimeout(r, 1500));

    // Fetch live product from Shopify
    const liveProd = await findShopifyProductBySku(t.sku);
    if (liveProd) {
      const v = liveProd.variants.nodes[0];
      const prodNumId = liveProd.id.split('/').pop();
      console.log(`   ✅ Live Shopify Title: "${liveProd.title}"`);
      console.log(`   Price: $${v.price} | Compare-At: $${v.compareAtPrice || 'N/A'}`);
      console.log(`   Admin Direct Link: https://admin.shopify.com/store/borderline-bottles/products/${prodNumId}`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 3 Weight Scenarios Sync Completed!');
  console.log('====================================================');
}

syncAndTest3WeightScenarios();
