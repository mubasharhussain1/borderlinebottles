import { shopifyGraphQL } from './src/shopify/client.js';

async function verifyProductOrigin() {
  const query = `
    query {
      product(id: "gid://shopify/Product/9290170728660") {
        id
        title
        handle
        createdAt
        vendor
        variants(first: 1) {
          nodes {
            id
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

verifyProductOrigin().catch(console.error);
