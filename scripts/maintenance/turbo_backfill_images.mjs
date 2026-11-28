import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { shopifyGraphQL } from '../../src/shopify/client.js';
import { loadCompetitorIndices } from '../../src/sync/sync_engine.js';
import { matchProduct } from '../../src/matching/product_matcher.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function attachProductMedia(productId, imageUrl) {
  const mutation = `
    mutation CreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { id status }
        userErrors { field message }
      }
    }
  `;
  return await shopifyGraphQL(mutation, {
    productId,
    media: [{
      originalSource: imageUrl,
      mediaContentType: 'IMAGE'
    }]
  });
}

// Fast check for Azure blob
async function checkAzureBlob(sku) {
  if (!sku || !/^\d+$/.test(sku)) return null;
  const url = `https://connectstorageprd.blob.core.windows.net/productimages/${sku}.jpg`;
  try {
    const res = await axios.head(url, {
      timeout: 1500,
      validateStatus: s => s === 200
    });
    return res.status === 200 ? url : null;
  } catch {
    return null;
  }
}

async function run() {
  console.log('='.repeat(65));
  console.log('⚡ TURBO IMAGE BACKFILL ENGINE (Targeting ONLY media_count:0)');
  console.log('='.repeat(65));

  // 1. Load competitor catalogs into memory
  const { zynIndex, bswIndex } = loadCompetitorIndices();

  let hasNextPage = true;
  let cursor = null;
  let totalProcessed = 0;
  let attachedCount = 0;
  let attachedZyn = 0;
  let attachedBsw = 0;
  let attachedLc = 0;
  const missingEverywhere = [];

  const stateFile = path.resolve('turbo_image_state.json');
  if (fs.existsSync(stateFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (saved.cursor) {
        cursor = saved.cursor;
        totalProcessed = saved.totalProcessed || 0;
        attachedCount = saved.attachedCount || 0;
        attachedZyn = saved.attachedZyn || 0;
        attachedBsw = saved.attachedBsw || 0;
        attachedLc = saved.attachedLc || 0;
        console.log(`♻️ Resuming turbo backfill from cursor...`);
      }
    } catch {}
  }

  while (hasNextPage) {
    try {
      const q = cursor
        ? `query($c: String) {
            products(first: 50, after: $c, query: "status:active media_count:0") {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                title
                variants(first: 1) {
                  nodes { id sku }
                }
              }
            }
          }`
        : `query {
            products(first: 50, query: "status:active media_count:0") {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                title
                variants(first: 1) {
                  nodes { id sku }
                }
              }
            }
          }`;

      const res = await shopifyGraphQL(q, cursor ? { c: cursor } : {});
      const products = res?.products?.nodes || [];
      if (products.length === 0) {
        console.log('No more products without media found!');
        break;
      }

      console.log(`\n📦 Batch of ${products.length} products without images loaded...`);

      // Process in parallel chunks of 5
      for (let i = 0; i < products.length; i += 5) {
        const chunk = products.slice(i, i + 5);
        await Promise.all(chunk.map(async (prod) => {
          totalProcessed++;
          const sku = prod.variants?.nodes?.[0]?.sku?.replace('CSPC-', '').trim();

          let targetImg = null;
          let source = null;

          // 1. Check in-memory competitors first (Instant 0ms!)
          const match = matchProduct({ title: prod.title, sku }, zynIndex, bswIndex);
          if (match.zyn?.matched) {
            const img = match.zyn.image || match.zyn.candidate?.primaryImage || match.zyn.candidate?.images?.[0];
            if (img) {
              targetImg = img;
              source = 'ZYN';
            }
          }
          if (!targetImg && match.bsw?.matched) {
            const img = match.bsw.image || match.bsw.candidate?.image || match.bsw.candidate?.images?.[0];
            if (img) {
              targetImg = img;
              source = 'BSW';
            }
          }

          // 2. Fallback to LiquorConnect Azure Blob
          if (!targetImg && sku) {
            const lcUrl = await checkAzureBlob(sku);
            if (lcUrl) {
              targetImg = lcUrl;
              source = 'LiquorConnect';
            }
          }

          // 3. Attach if found
          if (targetImg) {
            try {
              console.log(`[ATTACH] "${prod.title}" (SKU: ${sku}) -> Found in ${source}`);
              await attachProductMedia(prod.id, targetImg);
              attachedCount++;
              if (source === 'ZYN') attachedZyn++;
              else if (source === 'BSW') attachedBsw++;
              else if (source === 'LiquorConnect') attachedLc++;
            } catch (err) {
              console.error(`Attach failed for ${prod.title}:`, err.message);
            }
          } else {
            missingEverywhere.push({
              id: prod.id,
              title: prod.title,
              sku: sku || 'NO_SKU'
            });
          }
        }));

        await sleep(100);
      }

      hasNextPage = res?.products?.pageInfo?.hasNextPage;
      cursor = res?.products?.pageInfo?.endCursor;

      // Save state
      fs.writeFileSync(stateFile, JSON.stringify({
        cursor,
        totalProcessed,
        attachedCount,
        attachedZyn,
        attachedBsw,
        attachedLc,
        nowhereCount: missingEverywhere.length
      }, null, 2));

      console.log(`⚡ Processed: ${totalProcessed} | Attached: ${attachedCount} (ZYN: ${attachedZyn}, BSW: ${attachedBsw}, LC: ${attachedLc}) | Nowhere: ${missingEverywhere.length}`);
      await sleep(200);

    } catch (e) {
      console.error('Error in batch, retrying in 3s...', e.message);
      await sleep(3000);
    }
  }

  // Save report of missing everywhere
  fs.writeFileSync('missing_everywhere_products.json', JSON.stringify(missingEverywhere, null, 2));

  console.log('\n' + '='.repeat(65));
  console.log('🎉 TURBO BACKFILL COMPLETE!');
  console.log('='.repeat(65));
  console.log(`Total Products Missing Media Checked: ${totalProcessed}`);
  console.log(`Total Images Successfully Attached: ${attachedCount}`);
  console.log(`  - Attached from ZYN: ${attachedZyn}`);
  console.log(`  - Attached from BSW: ${attachedBsw}`);
  console.log(`  - Attached from LiquorConnect: ${attachedLc}`);
  console.log(`Products Missing Everywhere (No Image Available): ${missingEverywhere.length}`);
  console.log(`Saved nowhere list to: missing_everywhere_products.json`);
}

run();
