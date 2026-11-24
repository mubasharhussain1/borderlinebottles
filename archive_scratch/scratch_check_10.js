import { shopifyGraphQL } from './src/shopify/client.js';

async function check10Products() {
  const skus = ['18', '42', '67', '91', '166', '240', '000240', '281', '307', '356'];
  for (const sku of skus) {
    const query = `
      query getProductBySku($query: String!) {
        products(first: 3, query: $query) {
          edges {
            node {
              id
              title
              status
              variants(first: 5) {
                edges {
                  node {
                    id
                    sku
                    price
                    compareAtPrice
                    inventoryItem {
                      id
                      tracked
                      inventoryLevels(first: 5) {
                        edges {
                          node {
                            location {
                              id
                              name
                            }
                            quantities(names: ["available", "on_hand"]) {
                              name
                              quantity
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const res = await shopifyGraphQL(query, { query: `sku:${sku}` });
    const products = res.products.edges;
    console.log(`=== SKU: ${sku} (Found: ${products.length}) ===`);
    for (const p of products) {
      console.log(`Product: "${p.node.title}" (ID: ${p.node.id}, Status: ${p.node.status})`);
      for (const v of p.node.variants.edges) {
        const inv = v.node.inventoryItem;
        const levels = inv.inventoryLevels.edges.map(e => {
          const q = e.node.quantities.map(x => `${x.name}:${x.quantity}`).join(', ');
          return `${e.node.location.name}: [${q}]`;
        }).join(' | ');
        console.log(`  Variant SKU: ${v.node.sku}, Tracked: ${inv.tracked}, Levels: ${levels || 'None'}`);
      }
    }
  }
}

check10Products().catch(console.error);
