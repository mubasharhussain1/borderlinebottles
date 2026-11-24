import { shopifyGraphQL } from './src/shopify/client.js';
import { syncInventoryQuantity } from './src/sync/sync_engine.js';

async function updateAllTestTo6() {
  const skus = ['18', '34', '42', '67', '91', '166', '240', '000240', '281', '307', '356'];
  console.log(`Setting all test products to standard buffer of 6 units (Half Case)...`);

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
                  tracked
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
        await syncInventoryQuantity(invId, 6);
        console.log(`✅ SKU: ${sku} ("${product.title}") -> Updated to 6 Available units.`);
      }
    }
  }
  console.log('\n🎉 Done! All test products updated to standard buffer of 6.');
}

updateAllTestTo6().catch(console.error);
