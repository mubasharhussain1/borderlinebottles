import { shopifyGraphQL } from './src/shopify/client.js';

async function checkArchiveStatus() {
  console.log('Checking current live product counts on Shopify...\n');

  try {
    // 1. Total Active Products
    const activeQuery = `
      query {
        productsCount(query: "status:active") {
          count
          precision
        }
      }
    `;
    const resActive = await shopifyGraphQL(activeQuery);
    console.log(`📦 Currently ACTIVE Products: ${resActive.productsCount.count} (${resActive.productsCount.precision})`);

    // 2. Total Archived Products
    const archivedQuery = `
      query {
        productsCount(query: "status:archived") {
          count
          precision
        }
      }
    `;
    const resArchived = await shopifyGraphQL(archivedQuery);
    console.log(`🗄️ Currently ARCHIVED Products: ${resArchived.productsCount.count} (${resArchived.productsCount.precision})`);

    // 3. Check sample legacy product (ID starting with 9290)
    const legacyCheckQuery = `
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
    const resSample = await shopifyGraphQL(legacyCheckQuery);
    console.log('\nSample First 5 Active Products:');
    resSample.products.nodes.forEach(p => {
      console.log(`  ID: ${p.id.split('/').pop()} | Status: ${p.status} | Title: "${p.title}"`);
    });

  } catch (e) {
    console.error('Error fetching status:', e.message);
  }
}

checkArchiveStatus();
