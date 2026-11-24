import axios from 'axios';
import { config } from './src/config.js';
import { shopifyGraphQL } from './src/shopify/client.js';

async function findAndSetWeight() {
  const store = config.shopify.domain;
  const token = config.shopify.accessToken;
  const testSku = '288563'; // Canadian Club Premium

  // Step 1: Find variant via GraphQL
  console.log(`🔍 Finding product with SKU: ${testSku}...`);
  const query = `
    query FindBySku($q: String!) {
      products(first: 1, query: $q) {
        nodes {
          id
          title
          variants(first: 1) {
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

  const data = await shopifyGraphQL(query, { q: `sku:${testSku}` });
  const product = data.products.nodes[0];

  if (!product) {
    console.error('❌ Product not found!');
    return;
  }

  const variant = product.variants.nodes[0];
  console.log(`✅ Found: "${product.title}"`);
  console.log(`   Variant GID: ${variant.id}`);
  console.log(`   Price: $${variant.price} | Compare-at: $${variant.compareAtPrice}`);

  // Extract numeric ID from GID
  const numericId = variant.id.split('/').pop();
  console.log(`   Numeric Variant ID: ${numericId}`);

  // Step 2: Set weight via REST API
  console.log(`\n⚖️ Setting weight to 1.4 kg via REST API...`);
  try {
    const res = await axios.put(
      `https://${store}/admin/api/2024-10/variants/${numericId}.json`,
      {
        variant: {
          id: parseInt(numericId),
          weight: 1.4,
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

    console.log('✅ WEIGHT SET SUCCESSFUL!');
    console.log(`   Weight: ${res.data.variant.weight} ${res.data.variant.weight_unit}`);
  } catch (e) {
    console.error('❌ REST Error:', e.response?.data || e.message);
  }
}

findAndSetWeight();
