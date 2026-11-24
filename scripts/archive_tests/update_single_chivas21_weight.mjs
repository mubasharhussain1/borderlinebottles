import axios from 'axios';
import { config } from './src/config.js';
import { shopifyGraphQL } from './src/shopify/client.js';

async function findAndSetChivas21Weight() {
  const store = config.shopify.domain;
  const token = config.shopify.accessToken;
  const sku = '109711';

  console.log(`🔍 Finding live product & variant ID for SKU: ${sku}...`);

  const query = `
    query {
      products(first: 5, query: "sku:${sku}") {
        nodes {
          id
          title
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
    if (nodes.length === 0) {
      console.log('❌ Product not found!');
      return;
    }

    for (const p of nodes) {
      console.log(`📦 Product: "${p.title}" | ID: ${p.id.split('/').pop()}`);
      for (const v of p.variants.nodes) {
        const numVariantId = v.id.split('/').pop();
        console.log(`   Setting weight 2.2 kg on Variant: ${numVariantId}...`);

        try {
          const apiRes = await axios.put(
            `https://${store}/admin/api/2024-10/variants/${numVariantId}.json`,
            {
              variant: {
                id: parseInt(numVariantId),
                weight: 2.2,
                weight_unit: 'kg'
              }
            },
            {
              headers: {
                'X-Shopify-Access-Token': token,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log(`   ✅ SUCCESS! Weight is now: ${apiRes.data.variant.weight} ${apiRes.data.variant.weight_unit}`);
        } catch (err) {
          console.log(`   ❌ Error on variant ${numVariantId}:`, err.response?.data?.errors || err.message);
        }
      }
    }
  } catch (e) {
    console.error('GraphQL Error:', e.message);
  }
}

findAndSetChivas21Weight();
