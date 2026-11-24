import { shopifyGraphQL } from './src/shopify/client.js';
import { syncInventoryQuantity } from './src/sync/sync_engine.js';

async function setAllTestTo50() {
  const skus = ['18', '34', '42', '67', '91', '166', '240', '000240', '281', '307', '356'];
  console.log('🔄 Setting all test products to store standard 50 units...');

  for (const sku of skus) {
    const q = `
      query getInv($query: String!) {
        products(first: 1, query: $query) {
          nodes {
            id
            title
            variants(first: 1) {
              nodes {
                id
                sku
                inventoryItem {
                  id
                }
              }
            }
          }
        }
      }
    `;
    const res = await shopifyGraphQL(q, { query: `sku:${sku}` });
    const product = res.products.nodes[0];
    if (product) {
      const invId = product.variants.nodes[0].inventoryItem?.id;
      if (invId) {
        await syncInventoryQuantity(invId, 50);
        console.log(`✅ SKU: ${sku} ("${product.title}") -> Set to 50 Available.`);
      }
    }
  }
  console.log('\n🎉 Done! All test products match the store standard of 50 units.');
}

setAllTestTo50().catch(console.error);
