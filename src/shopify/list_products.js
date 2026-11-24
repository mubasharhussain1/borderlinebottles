import { shopifyGraphQL } from './client.js';

async function listStoreProducts() {
  const query = `
    query {
      products(first: 10) {
        nodes {
          id
          title
          productType
          vendor
          tags
          variants(first: 1) {
            nodes {
              id
              sku
              barcode
              price
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query);
  console.log('\n--- Live Products in mubashar-liquor-test ---');
  data.products.nodes.forEach((p, idx) => {
    const v = p.variants.nodes[0] || {};
    console.log(`${idx + 1}. [${p.productType}] ${p.title}`);
    console.log(`   SKU: ${v.sku} | Barcode: ${v.barcode} | Price: $${v.price} | Vendor: ${p.vendor}`);
    console.log(`   Tags: ${p.tags.slice(0, 4).join(', ')}...`);
  });
}

listStoreProducts();
