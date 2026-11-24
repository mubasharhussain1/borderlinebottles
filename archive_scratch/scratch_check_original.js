import { shopifyGraphQL } from './src/shopify/client.js';

async function checkOriginalProducts() {
  const query = `
    query getOriginalProducts {
      products(first: 5, query: "title:12B CANADIAN*") {
        nodes {
          id
          title
          createdAt
          updatedAt
          vendor
          productType
          tags
          variants(first: 1) {
            nodes {
              id
              sku
              createdAt
              updatedAt
              inventoryItem {
                id
                tracked
                createdAt
                updatedAt
                inventoryLevels(first: 2) {
                  nodes {
                    location { name }
                    quantities(names: ["available", "on_hand"]) { name quantity }
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
  const res = await shopifyGraphQL(query);
  console.log(JSON.stringify(res, null, 2));
}

checkOriginalProducts().catch(console.error);
