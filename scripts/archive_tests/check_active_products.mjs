import { shopifyGraphQL } from './src/shopify/client.js';

async function checkActive() {
  const query = `
    query {
      products(first: 10, query: "status:active") {
        nodes {
          id
          title
          status
          descriptionHtml
          variants(first: 1) {
            nodes {
              sku
              price
              compareAtPrice
            }
          }
        }
      }
    }
  `;
  const res = await shopifyGraphQL(query);
  console.log(JSON.stringify(res.products.nodes, null, 2));
}

checkActive();
