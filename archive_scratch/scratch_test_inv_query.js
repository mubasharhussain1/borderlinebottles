import { shopifyGraphQL } from './src/shopify/client.js';

async function testInventoryQueries() {
  const testTerms = [
    'sku:18',
    'sku:000240',
    'sku:240',
    'sku:356',
    'Heineken',
    'Dubonnet',
    '000240',
    '356'
  ];

  for (const term of testTerms) {
    const q = `
      query searchInv($query: String!) {
        inventoryItems(first: 5, query: $query) {
          edges {
            node {
              id
              sku
              tracked
              variant {
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
    const res = await shopifyGraphQL(q, { query: term });
    console.log(`Term: "${term}" -> Found ${res.inventoryItems.edges.length}`);
    for (const edge of res.inventoryItems.edges) {
      console.log(`  SKU: ${edge.node.sku}, Product: ${edge.node.variant?.product?.title}`);
    }
  }
}

testInventoryQueries().catch(console.error);
