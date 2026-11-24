import { shopifyGraphQL } from './src/shopify/client.js';

// Clean specific test duplicate: e.g., archive/delete older duplicate for SKU 7617
async function archiveOldDuplicate(oldProductId) {
  console.log(`Archiving old duplicate product: ${oldProductId}...`);
  const mutation = `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  try {
    const res = await shopifyGraphQL(mutation, {
      input: {
        id: oldProductId,
        status: "ARCHIVED"
      }
    });
    console.log('Result:', res.productUpdate);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
