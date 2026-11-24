import { shopifyGraphQL } from './src/shopify/graphql_client.js';

async function checkProducts() {
  const query = `
    query getRecentProducts {
      products(first: 15, sortKey: UPDATED_AT, reverse: true) {
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
                  title
                  price
                  compareAtPrice
                  inventoryItem {
                    id
                    tracked
                    inventoryLevels(first: 5) {
                      edges {
                        node {
                          quantities(names: ["available", "on_hand"]) {
                            name
                            quantity
                          }
                          location {
                            id
                            name
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
  const res = await shopifyGraphQL(query);
  for (const edge of res.data.products.edges) {
    const p = edge.node;
    console.log(`Product: "${p.title}" (Status: ${p.status})`);
    for (const vEdge of p.variants.edges) {
      const v = vEdge.node;
      const inv = v.inventoryItem;
      const levels = inv.inventoryLevels.edges.map(e => {
        const q = e.node.quantities.map(x => `${x.name}:${x.quantity}`).join(', ');
        return `Location: ${e.node.location.name} -> [${q}]`;
      }).join(' | ');
      console.log(`  Variant SKU: "${v.sku}", Tracked: ${inv.tracked}, Price: ${v.price}, CompareAt: ${v.compareAtPrice}, Levels: ${levels || 'None'}`);
    }
  }
}

checkProducts().catch(console.error);
