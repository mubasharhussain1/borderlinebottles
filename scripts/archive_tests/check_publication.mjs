import { shopifyGraphQL } from './src/shopify/client.js';

async function checkPublication() {
  const query = `
    query {
      product(id: "gid://shopify/Product/9290414653652") {
        id
        title
        handle
        status
        publishedAt
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    const p = res.product;
    console.log('Black Velvet Publication Check:');
    console.log(`Title: ${p.title}`);
    console.log(`Handle: ${p.handle}`);
    console.log(`Status: ${p.status}`);
    console.log(`PublishedAt: ${p.publishedAt}`);
    console.log(`Exact Live URL: https://borderline-bottles.myshopify.com/products/${p.handle}`);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkPublication();
