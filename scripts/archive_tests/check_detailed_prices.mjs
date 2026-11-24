import { shopifyGraphQL } from './src/shopify/client.js';

async function checkDetailed() {
  const query = `
    query {
      p42: product(id: "gid://shopify/Product/9290170728660") {
        title
        tags
        variants(first: 1) { nodes { price compareAtPrice } }
      }
      p67: product(id: "gid://shopify/Product/9290173087956") {
        title
        tags
        variants(first: 1) { nodes { price compareAtPrice } }
      }
      p7617: product(id: "gid://shopify/Product/9290168828116") {
        title
        tags
        variants(first: 1) { nodes { price compareAtPrice } }
      }
    }
  `;
  const res = await shopifyGraphQL(query);
  console.log(JSON.stringify(res, null, 2));
}

checkDetailed();
