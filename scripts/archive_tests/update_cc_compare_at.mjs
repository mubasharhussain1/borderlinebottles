import { shopifyGraphQL } from './src/shopify/client.js';

async function updateExactCompareAt() {
  const query = `
    query {
      product(id: "gid://shopify/Product/9290170728660") {
        variants(first: 1) {
          nodes { id price compareAtPrice }
        }
      }
    }
  `;
  const data = await shopifyGraphQL(query);
  const vId = data.product.variants.nodes[0].id;
  console.log('Real Variant ID:', vId);

  const mut = `
    mutation updatePrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price compareAtPrice }
        userErrors { field message }
      }
    }
  `;
  const res = await shopifyGraphQL(mut, {
    productId: 'gid://shopify/Product/9290170728660',
    variants: [{
      id: vId,
      price: '27.86',
      compareAtPrice: '32.40'
    }]
  });
  console.log('Result:', JSON.stringify(res.productVariantsBulkUpdate, null, 2));
}

updateExactCompareAt();
