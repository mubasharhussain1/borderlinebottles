import { shopifyGraphQL } from './src/shopify/client.js';

async function checkMoreOriginal() {
  const titles = ['12C AMERICAN VINTAGE*', '12C BUD LIGHT*', '12C BUDWEISER*'];
  for (const t of titles) {
    const q = `
      query getOriginal($query: String!) {
        products(first: 1, query: $query) {
          nodes {
            id
            title
            createdAt
            variants(first: 1) {
              nodes {
                sku
                inventoryItem {
                  inventoryLevels(first: 1) {
                    nodes {
                      quantities(names: ["available"]) { name quantity }
                      updatedAt
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const res = await shopifyGraphQL(q, { query: `title:${t}` });
    const p = res.products.nodes[0];
    if (p) {
      const inv = p.variants.nodes[0].inventoryItem.inventoryLevels.nodes[0];
      console.log(`Product: "${p.title}" | Created: ${p.createdAt} | Stock: ${inv?.quantities[0]?.quantity} | Inv UpdatedAt: ${inv?.updatedAt}`);
    }
  }
}

checkMoreOriginal().catch(console.error);
