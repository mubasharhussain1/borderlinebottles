import { shopifyGraphQL } from './src/shopify/client.js';

async function checkPrices() {
  const skus = ['42', '67'];
  for (const sku of skus) {
    const q = `
      query getPrice($query: String!) {
        products(first: 1, query: $query) {
          nodes {
            id
            title
            variants(first: 1) {
              nodes {
                id
                sku
                price
                compareAtPrice
              }
            }
          }
        }
      }
    `;
    const res = await shopifyGraphQL(q, { query: `sku:${sku}` });
    const p = res.products.nodes[0];
    const v = p.variants.nodes[0];
    console.log(`Title: "${p.title}" | SKU: ${v.sku} | Price (Sale): $${v.price} | CompareAt (Original Store Price): $${v.compareAtPrice}`);
  }
}

checkPrices().catch(console.error);
