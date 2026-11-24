import { shopifyGraphQL } from './src/shopify/client.js';

const skus = ['42', '91', '166', '67', '7617', '3558', '21097', '150659', '157277', '240'];

async function getLiveDetails() {
  console.log('Fetching live URLs for the 10 target products...\n');
  for (const sku of skus) {
    const query = `
      query {
        products(first: 5, query: "sku:${sku}") {
          nodes {
            id
            title
            tags
            variants(first: 5) {
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
    try {
      const res = await shopifyGraphQL(query);
      const matches = res.products.nodes;
      if (matches.length === 0) {
        console.log(`SKU: ${sku} -> NOT FOUND`);
      } else {
        const p = matches[0];
        const v = p.variants.nodes.find(v => (v.sku || '').trim() === sku) || p.variants.nodes[0];
        const numId = p.id.split('/').pop();
        console.log(`SKU: ${sku.padEnd(8)} | Price: $${(v.price || '').padEnd(7)} | URL: https://admin.shopify.com/store/borderline-bottles/products/${numId} | "${p.title}"`);
      }
    } catch (e) {
      console.error(`Error on ${sku}:`, e.message);
    }
  }
}

getLiveDetails();
