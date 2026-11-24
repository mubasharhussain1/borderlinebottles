import { shopifyGraphQL } from './client.js';

async function testConnection() {
  console.log('Testing connection to Shopify Store...');

  const query = `
    query {
      shop {
        name
        myshopifyDomain
        plan {
          displayName
        }
      }
    }
  `;

  try {
    const data = await shopifyGraphQL(query);
    console.log(' Successfully connected to Shopify!');
    console.log(`Store Name: ${data.shop.name}`);
    console.log(`Domain: ${data.shop.myshopifyDomain}`);
    console.log(`Plan: ${data.shop.plan.displayName}`);
  } catch (error) {
    console.error(' Connection failed:', error.message);
  }
}

testConnection();
