import { shopifyGraphQL } from './client.js';

async function testSetSku() {
  const productId = "gid://shopify/Product/16255064375599";
  const variantId = "gid://shopify/ProductVariant/58829281788207";

  const mutation = `
    mutation UpdateProductVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          sku
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    productId,
    variants: [
      {
        id: variantId,
        price: "24.99",
        barcode: "3170870001265",
        inventoryItem: {
          sku: "CSPC-18",
          tracked: true
        }
      }
    ]
  };

  try {
    const data = await shopifyGraphQL(mutation, variables);
    console.log('Result with SKU:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSetSku();
