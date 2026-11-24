import { shopifyGraphQL } from './src/shopify/client.js';

async function verifySmirnoff() {
  const query = `
    query {
      product(id: "gid://shopify/Product/9290173087956") {
        id
        title
        createdAt
        vendor
        variants(first: 1) {
          nodes {
            sku
            price
            compareAtPrice
            createdAt
          }
        }
      }
    }
  `;
  const res = await shopifyGraphQL(query);
  console.log(JSON.stringify(res, null, 2));
}

verifySmirnoff().catch(console.error);
