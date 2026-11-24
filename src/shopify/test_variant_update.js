import { shopifyGraphQL } from './client.js';

async function testBulkVariantUpdate() {
  const productId = "gid://shopify/Product/16255064375599";
  const variantId = "gid://shopify/ProductVariant/58829281788207";

  const mutation = `
    mutation UpdateProductVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
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
        price: "18.99",
        barcode: "3170870001265"
      }
    ]
  };

  try {
    const data = await shopifyGraphQL(mutation, variables);
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testBulkVariantUpdate();
