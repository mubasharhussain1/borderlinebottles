import { shopifyGraphQL } from './src/shopify/client.js';

async function checkMaxCount() {
  console.log('Querying precise products count via GraphQL...\n');
  const query = `
    query {
      productsCount(query: "status:active OR status:draft OR status:archived") {
        count
        precision
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    console.log('Count Result:', res.productsCount);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkMaxCount();
