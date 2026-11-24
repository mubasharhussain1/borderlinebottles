import { shopifyGraphQL } from './src/shopify/client.js';

async function checkRemainingOld() {
  const query = `
    query {
      productsCount(query: "status:active AND -id:1549* AND -id:1550*") {
        count
      }
    }
  `;
  try {
    const res = await shopifyGraphQL(query);
    console.log(`Remaining legacy products to check: ${res.productsCount?.count}`);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkRemainingOld();
