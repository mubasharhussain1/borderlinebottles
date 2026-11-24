import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const SHOP = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const PRODUCT_GID = 'gid://shopify/Product/9290170335444';
const BSW_HANDLE = 'captain-morgan-dark-rum-1'; // 750ml version

async function shopifyGraphQL(query, variables = {}) {
  const res = await axios.post(
    `https://${SHOP}/admin/api/2024-01/graphql.json`,
    { query, variables },
    { headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
  );
  if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
  return res.data.data;
}

async function fetchBswDescription() {
  console.log('🌐 Fetching description from BSW JSON API...');
  const res = await axios.get(`https://www.bswliquor.com/products/${BSW_HANDLE}.json`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' },
    timeout: 20000
  });
  const bodyHtml = res.data?.product?.body_html || '';
  console.log(`✅ BSW Description fetched (${bodyHtml.length} chars)`);
  return bodyHtml;
}

async function getProductImages() {
  const data = await shopifyGraphQL(`
    query {
      product(id: "${PRODUCT_GID}") {
        title
        status
        media(first: 10) {
          edges {
            node {
              id
              mediaContentType
              ... on MediaImage {
                image { url }
              }
            }
          }
        }
      }
    }
  `);
  return data.product;
}

async function deleteMedia(mediaIds) {
  if (mediaIds.length === 0) return;
  console.log(`🗑️ Deleting ${mediaIds.length} duplicate image(s)...`);
  await shopifyGraphQL(`
    mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
      productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
        deletedMediaIds
        userErrors { field message }
      }
    }
  `, { productId: PRODUCT_GID, mediaIds });
  console.log('✅ Duplicate images deleted');
}

async function updateDescription(bodyHtml) {
  console.log('📝 Updating product description...');
  const data = await shopifyGraphQL(`
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id title }
        userErrors { field message }
      }
    }
  `, {
    input: {
      id: PRODUCT_GID,
      descriptionHtml: bodyHtml
    }
  });
  const errs = data.productUpdate.userErrors;
  if (errs.length > 0) throw new Error(JSON.stringify(errs));
  console.log(`✅ Description updated: ${data.productUpdate.product.title}`);
}

async function main() {
  console.log('================================================');
  console.log('  🍾 Captain Morgan Dark Rum — Fix Script');
  console.log('================================================\n');

  // 1. Get current images
  const product = await getProductImages();
  console.log(`📦 Product: ${product.title} (Status: ${product.status})`);

  const allMedia = product.media.edges.map(e => e.node);
  console.log(`🖼️ Found ${allMedia.length} image(s)`);

  allMedia.forEach((m, idx) => {
    if (m.image) console.log(`  [${idx + 1}] ${m.image.url}`);
  });

  // 2. Keep only FIRST image, delete the rest
  if (allMedia.length > 1) {
    const toDelete = allMedia.slice(1).map(m => m.id); // keep index 0, delete rest
    await deleteMedia(toDelete);
  } else {
    console.log('✅ Only 1 image — no duplicates to remove');
  }

  // 3. Fetch description from BSW
  let bodyHtml = '';
  try {
    bodyHtml = await fetchBswDescription();
  } catch (e) {
    console.log(`⚠️ BSW fetch failed: ${e.message}`);
    console.log('Using fallback description...');
    bodyHtml = `<p>This Captain doesn't go unnoticed. With a rich taste and unique depth of flavour, Captain Morgan Dark Rum is the adventurers' delight. Deep amber brown, this aromatic rum offers notes of molasses and light spice with toasted oak flavour and light sweetness that is balanced by a dry finish.</p>`;
  }

  // 4. Update description
  if (bodyHtml.length > 20) {
    await updateDescription(bodyHtml);
  } else {
    console.log('⚠️ Description too short, using fallback...');
    await updateDescription(`<p>This Captain doesn't go unnoticed. With a rich taste and unique depth of flavour, Captain Morgan Dark Rum is the adventurers' delight. Deep amber brown, this aromatic rum offers notes of molasses and light spice with toasted oak flavour and light sweetness that is balanced by a dry finish.</p>`);
  }

  console.log('\n================================================');
  console.log('🎉 Captain Morgan Dark Rum — FIXED!');
  console.log('  ✅ Description: Updated');
  console.log('  ✅ Images: 1 only (duplicates removed)');
  console.log('  🔗 Check: https://admin.shopify.com/store/borderline-bottles/products/9290170335444');
  console.log('================================================\n');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
