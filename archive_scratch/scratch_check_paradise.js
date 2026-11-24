import { shopifyGraphQL } from './src/shopify/client.js';

async function checkParadise() {
  const query = `
    query {
      products(first: 1, query: "sku:34") {
        nodes {
          id
          title
          status
          variants(first: 1) {
            nodes {
              id
              sku
              price
              inventoryItem {
                id
                tracked
                inventoryLevels(first: 1) {
                  nodes {
                    location { name }
                    quantities(names: ["available", "on_hand"]) { name quantity }
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
  console.log(JSON.stringify(res, null, 2));
}

checkParadise().catch(console.error);
