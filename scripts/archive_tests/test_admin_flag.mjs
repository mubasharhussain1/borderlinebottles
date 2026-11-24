import { shopifyGraphQL } from './src/shopify/client.js';
import { findShopifyProductBySku } from './src/sync/sync_engine.js';
import { logFlaggedProduct } from './src/utils/logger.js';

async function testFlaggedTagLive() {
  console.log('====================================================');
  console.log('   🧪 Live Test: Auto-Tagging Flagged Product');
  console.log('====================================================\n');

  const sku = '7617'; // Chivas Regal on Shopify
  console.log(`🔍 Finding Shopify product with SKU ${sku}...`);

  const product = await findShopifyProductBySku(sku);
  if (!product) {
    console.error('❌ Product not found on store!');
    return;
  }

  console.log(`✅ Found: "${product.title}"`);
  console.log(`   Current ID: ${product.id}`);

  // 1. Simulate Flag For Review Trigger (Below 5% floor)
  console.log('\n🚩 Triggering "Below 5% Profit Floor" safety rule...');
  logFlaggedProduct({
    sku: sku,
    title: product.title,
    cost: 42.17,
    competitorPrice: 43.00,
    floorPrice: 44.28,
    reason: 'Below 5% profit floor (Candidate $40.85 < Floor $44.28)'
  });

  // 2. Add Tag directly to Shopify product
  console.log('🏷️ Adding Tag "Review-Needed-Price-Floor" to Shopify Admin...');
  const tagMutation = `
    mutation addTags($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        userErrors { field message }
      }
    }
  `;

  await shopifyGraphQL(tagMutation, {
    id: product.id,
    tags: ["Review-Needed-Price-Floor"]
  });

  const numericId = product.id.split('/').pop();
  console.log('\n====================================================');
  console.log('🎉 SUCCESS! Tag Added to Shopify Product!');
  console.log(`🔗 Admin Direct Link: https://admin.shopify.com/store/borderline-bottles/products/${numericId}`);
  console.log('\n👀 Now check this product in Shopify Admin:');
  console.log('   1. Right side Tags section mein "Review-Needed-Price-Floor" add ho gaya!');
  console.log('   2. Store owner Shopify search bar mein "Review-Needed-Price-Floor" filter kar sakta hai!');
  console.log('====================================================\n');
}

testFlaggedTagLive();
