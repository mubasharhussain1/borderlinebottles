import { shopifyGraphQL } from './src/shopify/client.js';

const skus = ['42', '67', '2196', '7617', '18', '240', '539', '53978', '109711'];

async function fetchDirectUrls() {
  console.log('Finding direct Shopify numeric IDs for test products...\n');
  for (const sku of skus) {
    const query = `
      query {
        products(first: 3, query: "sku:${sku}") {
          nodes {
            id
            title
            variants(first: 3) {
              nodes {
                id
                sku
                price
              }
            }
          }
        }
      }
    `;
    try {
      const res = await shopifyGraphQL(query);
      const nodes = res.products.nodes;
      if (nodes.length > 0) {
        const p = nodes[0];
        const numId = p.id.split('/').pop();
        console.log(`SKU: ${sku.padEnd(8)} -> https://admin.shopify.com/store/borderline-bottles/products/${numId} ("${p.title}")`);
      } else {
        console.log(`SKU: ${sku.padEnd(8)} -> NOT FOUND`);
      }
    } catch (e) {
      console.log(`Error on ${sku}:`, e.message);
    }
  }
}

fetchDirectUrls();
