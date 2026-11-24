import { shopifyGraphQL } from './src/shopify/client.js';

async function checkChivasVariants() {
  console.log('Checking all products and variants for SKU 7617 on Shopify...\n');
  const query = `
    query {
      products(first: 5, query: "sku:7617") {
        nodes {
          id
          title
          variants(first: 5) {
            nodes {
              id
              sku
              price
              compareAtPrice
              inventoryItem { id }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    for (const p of res.products.nodes) {
      console.log(`Product: "${p.title}" | ID: ${p.id.split('/').pop()}`);
      for (const v of p.variants.nodes) {
        console.log(`  Variant ID: ${v.id.split('/').pop()} | SKU: ${v.sku} | Price: $${v.price} | CompareAt: $${v.compareAtPrice}`);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkChivasVariants();
