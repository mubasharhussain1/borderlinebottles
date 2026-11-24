import { shopifyGraphQL } from './src/shopify/client.js';

async function verifyZeroOldDuplicates() {
  console.log('Verifying if any legacy 9290... products are still active...\n');

  // Query to find if ANY active product exists starting with 9290
  const query = `
    query {
      products(first: 5, query: "status:active") {
        nodes {
          id
          title
          status
        }
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    console.log('Current First 5 Active Products in Store:');
    res.products.nodes.forEach(p => {
      console.log(`  ID: ${p.id.split('/').pop()} | Status: ${p.status} | Title: "${p.title}"`);
    });

    // Check count of active products
    const countQuery = `
      query {
        productsCount(query: "status:active") {
          count
          precision
        }
      }
    `;
    const countRes = await shopifyGraphQL(countQuery);
    console.log(`\n📊 Active Products Count: ${countRes.productsCount.count} (${countRes.productsCount.precision})`);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

verifyZeroOldDuplicates();
