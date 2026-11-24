import { shopifyGraphQL } from './src/shopify/client.js';

async function fixChivasPriceLive() {
  console.log('Directly pushing $44.99 to Chivas Regal on Shopify...\n');

  // Both variants for 7617
  const targets = [
    { productId: 'gid://shopify/Product/9290168828116', variantId: 'gid://shopify/ProductVariant/48409167724756' },
    { productId: 'gid://shopify/Product/15499756503252', variantId: 'gid://shopify/ProductVariant/68424890646740' }
  ];

  const mutation = `
    mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          compareAtPrice
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  for (const t of targets) {
    try {
      const res = await shopifyGraphQL(mutation, {
        productId: t.productId,
        variants: [{
          id: t.variantId,
          price: "44.99",
          compareAtPrice: "53.56"
        }]
      });
      const data = res.productVariantsBulkUpdate;
      if (data.userErrors && data.userErrors.length > 0) {
        console.error(`❌ UserError on ${t.variantId}:`, data.userErrors);
      } else {
        const v = data.productVariants[0];
        console.log(`✅ Success on Product ${t.productId.split('/').pop()}: Price = $${v.price} | CompareAt = $${v.compareAtPrice}`);
      }
    } catch (e) {
      console.error(`❌ Exception on ${t.variantId}:`, e.message);
    }
  }

  console.log('\n🎉 Finished updating Chivas Regal to $44.99!');
}

fixChivasPriceLive();
