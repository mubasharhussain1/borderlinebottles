import { shopifyGraphQL } from './src/shopify/client.js';

const testSkus = ['42', '67', '2196', '7617', '18', '240', '539', '53978', '109711'];

async function scanDuplicates() {
  console.log('Scanning for duplicate listings across test SKUs...\n');
  for (const sku of testSkus) {
    const query = `
      query {
        products(first: 10, query: "sku:${sku}") {
          nodes {
            id
            title
            handle
            status
            variants(first: 5) {
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
      if (nodes.length > 1) {
        console.log(`⚠️ SKU ${sku} has ${nodes.length} DUPLICATES:`);
        nodes.forEach(n => {
          console.log(`   - ID: ${n.id.split('/').pop()} | Handle: "${n.handle}" | Title: "${n.title}" | Status: ${n.status}`);
        });
      } else if (nodes.length === 1) {
        console.log(`✅ SKU ${sku} has only 1 product: ID ${nodes[0].id.split('/').pop()}`);
      } else {
        console.log(`❌ SKU ${sku} not found`);
      }
    } catch (e) {
      console.error(`Error on SKU ${sku}:`, e.message);
    }
  }
}

scanDuplicates();
