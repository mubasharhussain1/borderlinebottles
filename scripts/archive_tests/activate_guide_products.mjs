import { shopifyGraphQL } from './src/shopify/client.js';

async function activateProducts() {
  const mut = `
    mutation activateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id title status }
        userErrors { field message }
      }
    }
  `;
  const ids = ['9290170728660', '9290173087956', '9290170335444', '9290168828116', '9290414653652'];
  for (const id of ids) {
    try {
      const res = await shopifyGraphQL(mut, { input: { id: `gid://shopify/Product/${id}`, status: 'ACTIVE' } });
      console.log(`Activated: ${res.productUpdate.product.title} -> ${res.productUpdate.product.status}`);
    } catch (e) {
      console.error(`Error on ${id}:`, e.message);
    }
  }
}

activateProducts();
