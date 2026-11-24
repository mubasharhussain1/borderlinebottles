import { shopifyGraphQL } from './src/shopify/client.js';

async function checkActiveCaptainMorgan() {
  console.log('Searching for ACTIVE Captain Morgan Dark Rum on Shopify...\n');
  const query = `
    query {
      products(first: 5, query: "sku:2196") {
        nodes {
          id
          title
          status
          featuredImage { url }
          variants(first: 1) {
            nodes { sku price }
          }
        }
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    res.products.nodes.forEach(p => {
      console.log(`Product ID: ${p.id.split('/').pop()} | Status: ${p.status} | Title: "${p.title}"`);
      console.log(`  Featured Image: ${p.featuredImage?.url || 'No Image'}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkActiveCaptainMorgan();
