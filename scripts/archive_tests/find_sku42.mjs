import { shopifyGraphQL } from './src/shopify/client.js';

async function findSku42() {
  const query = `
    query {
      products(first: 10, query: "sku:42") {
        nodes {
          id
          title
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
    console.log('Result for sku:42:');
    for (const p of res.products.nodes) {
      console.log(`Product: "${p.title}" | ID: ${p.id.split('/').pop()}`);
      for (const v of p.variants.nodes) {
        console.log(`  Variant SKU: ${v.sku} | Price: $${v.price} | CompareAt: $${v.compareAtPrice}`);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

findSku42();
