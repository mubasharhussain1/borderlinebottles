import { shopifyGraphQL } from './src/shopify/client.js';

async function countAdminProducts() {
  console.log('Fetching live product count from Shopify Admin...\n');
  const query = `
    query {
      productsCount {
        count
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    console.log(`📊 TOTAL PRODUCTS IN SHOPIFY ADMIN: ${res.productsCount.count}`);
  } catch (e) {
    console.error('Error fetching count:', e.message);
  }
}

countAdminProducts();
