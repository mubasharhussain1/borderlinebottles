import { shopifyGraphQL } from './src/shopify/client.js';

async function checkProduct() {
  const query = `
    query {
      product(id: "gid://shopify/Product/15501354008788") {
        id
        title
        variants(first: 1) {
          nodes {
            id
            sku
            price
            compareAtPrice
            weight
            weightUnit
            inventoryItem {
              id
              measurement {
                weight {
                  value
                  unit
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    console.log('LIVE SHOPIFY PRODUCT DETAILS:');
    console.log(JSON.stringify(res.product, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkProduct();
