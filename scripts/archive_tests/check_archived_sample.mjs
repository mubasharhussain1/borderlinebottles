import { shopifyGraphQL } from './src/shopify/client.js';

async function checkArchivedSample() {
  console.log('Inspecting 10 random ARCHIVED products to verify IDs...\n');
  const query = `
    query {
      products(first: 10, query: "status:archived") {
        nodes {
          id
          title
          handle
          status
        }
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    console.log('Archived Sample Products:');
    res.products.nodes.forEach(p => {
      const numId = p.id.split('/').pop();
      console.log(`  ID: ${numId} | Status: ${p.status} | Title: "${p.title}"`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkArchivedSample();
