import { findShopifyProductBySku } from './src/sync/sync_engine.js';
import { calculateShippingWeight } from './src/utils/weight_calculator.js';

const testSkus = [
  { sku: '7617', name: 'Chivas Regal 12 YO (Glass 750ml)' },
  { sku: '42', name: 'Canadian Club Premium (Glass)' },
  { sku: '18', name: 'Heineken Lager (Bottles/Pack)' },
  { sku: '91', name: 'Andres Baby Duck (Glass)' },
  { sku: '67', name: 'Smirnoff Vodka' }
];

async function verifyLiveWeights() {
  console.log('====================================================');
  console.log('   🔍 Checking Live Shopify Product Weights & Source');
  console.log('====================================================\n');

  for (const t of testSkus) {
    const p = await findShopifyProductBySku(t.sku);
    if (!p) {
      console.log(`SKU: ${t.sku} -> Product not found`);
      continue;
    }

    const v = p.variants.nodes[0];
    const calc = calculateShippingWeight({ Name: p.title, Title: p.title }, null, null);

    console.log(`📦 [SKU ${t.sku}] "${p.title}"`);
    console.log(`   Price: $${v.price} | Compare-at: $${v.compareAtPrice || 'N/A'}`);
    console.log(`   Weight Engine Formula: ${calc.weightKg} kg (Calculated via ${calc.source})`);
    console.log(`   Admin URL: https://admin.shopify.com/store/borderline-bottles/products/${p.id.split('/').pop()}`);
    console.log('----------------------------------------------------');
  }
}

verifyLiveWeights();
