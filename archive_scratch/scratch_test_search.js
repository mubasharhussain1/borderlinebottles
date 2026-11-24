import { shopifyGraphQL } from './src/shopify/client.js';

async function testInventorySearch() {
  const queries = [
    'HEINEKEN LAGER',
    'ANDRES BABY DUCK',
    'WALKERS SPECIAL OLD',
    'DUBONNET ROUGE',
    'SMIRNOFF 375ML'
  ];

  for (const q of queries) {
    const query = `
      query searchInventory($query: String!) {
        inventoryItems(first: 5, query: $query) {
          edges {
            node {
              id
              sku
              variant {
                id
                title
                product {
                  title
                }
              }
            }
          }
        }
      }
    `;
    const res = await shopifyGraphQL(query, { query: q });
    console.log(`Query: "${q}" -> Found: ${res.inventoryItems.edges.length}`);
    for (const e of res.inventoryItems.edges) {
      console.log(`   Found: ${e.node.variant?.product?.title} (SKU: ${e.node.sku})`);
    }
  }
}

testInventorySearch().catch(console.error);
