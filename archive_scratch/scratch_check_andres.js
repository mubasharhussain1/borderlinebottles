import { shopifyGraphQL } from './src/shopify/client.js';

async function checkWhyNoInv() {
  const query = `
    query getVariant($id: ID!) {
      productVariant(id: $id) {
        id
        title
        displayName
        inventoryItem {
          id
          tracked
          inventoryLevel(locationId: "gid://shopify/Location/92324233428") {
            id
            quantities(names: ["available", "on_hand"]) {
              name
              quantity
            }
          }
        }
      }
    }
  `;

  // Check Andres Baby Duck (product 9290196287700)
  const pQuery = `
    query getProduct {
      product(id: "gid://shopify/Product/9290196287700") {
        id
        title
        status
        totalInventory
        tracksInventory
        variants(first: 2) {
          nodes {
            id
            title
            sku
            inventoryQuantity
            inventoryItem {
              id
              tracked
              inventoryLevels(first: 2) {
                nodes {
                  location { id name }
                  quantities(names: ["available", "on_hand"]) {
                    name quantity
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const res = await shopifyGraphQL(pQuery);
  console.log(JSON.stringify(res, null, 2));
}

checkWhyNoInv().catch(console.error);
