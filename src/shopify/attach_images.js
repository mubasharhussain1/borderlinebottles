import { shopifyGraphQL } from './client.js';

async function attachImagesToExistingProducts() {
  console.log('Attaching live LiquorConnect images to Shopify products...\n');

  // 1. Fetch current products from store
  const getProductsQuery = `
    query {
      products(first: 10) {
        nodes {
          id
          title
          variants(first: 1) {
            nodes {
              sku
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(getProductsQuery);
  const products = data.products.nodes;

  const createMediaMutation = `
    mutation CreateProductMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
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

  for (const p of products) {
    const sku = p.variants.nodes[0]?.sku;
    if (!sku) continue;

    const cleanSku = sku.replace('CSPC-', '').trim();
    const imageUrl = `https://connectstorageprd.blob.core.windows.net/productimages/${cleanSku}.jpg`;

    console.log(`Attaching image to "${p.title}" (SKU: ${cleanSku})...`);

    try {
      const res = await shopifyGraphQL(createMediaMutation, {
        productId: p.id,
        media: [
          {
            originalSource: imageUrl,
            mediaContentType: "IMAGE",
            alt: p.title
          }
        ]
      });

      if (res.productCreateMedia.userErrors.length > 0) {
        console.log(`❌ Error:`, res.productCreateMedia.userErrors);
      } else {
        console.log(`✅ Image attached successfully to "${p.title}"!`);
      }
    } catch (err) {
      console.log(`❌ Failed:`, err.message);
    }
  }

  console.log('\n🎉 All product images have been attached!');
}

attachImagesToExistingProducts();
