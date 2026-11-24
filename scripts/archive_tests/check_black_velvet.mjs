import { shopifyGraphQL } from './src/shopify/client.js';

async function checkBlackVelvetLive() {
  const query = `
    query {
      products(first: 5, query: "sku:539") {
        nodes {
          id
          title
          status
          variants(first: 5) {
            nodes {
              id
              sku
              inventoryPolicy
              inventoryQuantity
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

  try {
    const res = await shopifyGraphQL(query);
    console.log('Result for SKU 539:');
    for (const p of res.products.nodes) {
      console.log(`Product: "${p.title}" | ID: ${p.id.split('/').pop()} | Status: ${p.status}`);
      for (const v of p.variants.nodes) {
        console.log(`  Variant SKU: ${v.sku} | Qty: ${v.inventoryQuantity} | Policy: ${v.inventoryPolicy} | Tracked: ${v.inventoryItem?.tracked}`);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkBlackVelvetLive();
