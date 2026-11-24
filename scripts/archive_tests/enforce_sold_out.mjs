import { shopifyGraphQL } from './src/shopify/client.js';

async function setBlackVelvetSoldOut() {
  console.log('Enforcing "Sold Out" on Black Velvet (SKU: 539)...\n');

  // Product ID: 9290414653652
  // Variant ID: 48409748668724
  const mutation = `
    mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          inventoryPolicy
        }
        userErrors { field message }
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(mutation, {
      productId: "gid://shopify/Product/9290414653652",
      variants: [{
        id: "gid://shopify/ProductVariant/48409748668724",
        inventoryPolicy: "DENY"
      }]
    });

    console.log('✅ Inventory Policy set to DENY (Continue selling when out of stock = OFF)!');
    console.log('   Now when quantity is 0, storefront will display "Sold Out" button!');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

setBlackVelvetSoldOut();
