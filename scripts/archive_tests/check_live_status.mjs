import { shopifyGraphQL } from './src/shopify/client.js';

async function checkLiveProducts() {
  const query = `
    query {
      products(first: 10, query: "sku:42 OR sku:67 OR sku:18 OR sku:7617 OR sku:539 OR sku:2196") {
        nodes {
          id
          title
          descriptionHtml
          variants(first: 1) {
            nodes {
              sku
              price
              compareAtPrice
            }
          }
        }
      }
    }
  `;
  const res = await shopifyGraphQL(query);
  for (const p of res.products.nodes) {
    const v = p.variants.nodes[0];
    const descExcerpt = (p.descriptionHtml || '').substring(0, 100).replace(/\n/g, ' ');
    const hasZynOrBsw = /zyn|bsw/i.test(p.descriptionHtml || '') || /zyn|bsw/i.test(p.title);
    console.log(`Product: ${p.title} (SKU: ${v.sku})`);
    console.log(`  ID: ${p.id.split('/').pop()}`);
    console.log(`  Price: $${v.price} | CompareAt: $${v.compareAtPrice || 'None'}`);
    console.log(`  Brand mentions found: ${hasZynOrBsw ? '⚠️ YES' : '✅ NO (Clean)'}`);
    console.log(`  Desc: "${descExcerpt}..."\n`);
  }
}

checkLiveProducts();
