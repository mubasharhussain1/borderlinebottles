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

async function checkUrlExists(url) {
  try {
    const res = await axios.head(url, {
      timeout: 4000,
      validateStatus: s => s === 200
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function run() {
  console.log('='.repeat(65));
  console.log('🖼️ STARTING IMAGE AUDIT & BACKFILL ENGINE');
  console.log('='.repeat(65));

  // 1. Load competitor indexes
  const { zynIndex, bswIndex } = loadCompetitorIndices();

  let cursor = null;
  let totalChecked = 0;
  let alreadyHasImage = 0;
  let missingInitial = 0;

  let attachedFromLC = 0;
  let attachedFromZYN = 0;
  let attachedFromBSW = 0;
  const missingEverywhere = [];

  const stateFile = path.resolve('image_sync_state.json');
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (state.cursor) {
        cursor = state.cursor;
        totalChecked = state.totalChecked || 0;
        alreadyHasImage = state.alreadyHasImage || 0;
        attachedFromLC = state.attachedFromLC || 0;
        attachedFromZYN = state.attachedFromZYN || 0;
        attachedFromBSW = state.attachedFromBSW || 0;
        console.log(`♻️ Resuming image sync from cursor: ${cursor}`);
      }
    } catch (e) {}
  }

  let hasNextPage = true;

  while (hasNextPage) {
    try {
      const queryStr = cursor
        ? `query($cursor: String) {
            products(first: 50, after: $cursor, query: "status:active") {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                title
                featuredMedia { id }
                variants(first: 1) {
                  nodes {
                    id
                    sku
                  }
                }
              }
            }
          }`
        : `query {
            products(first: 50, query: "status:active") {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                title
                featuredMedia { id }
                variants(first: 1) {
                  nodes {
                    id
                    sku
                  }
                }
              }
            }
          }`;

      const res = await shopifyGraphQL(queryStr, cursor ? { cursor } : {});
      const page = res?.products;
      if (!page || !page.nodes || page.nodes.length === 0) break;

      for (const prod of page.nodes) {
        totalChecked++;
        if (prod.featuredMedia?.id) {
          alreadyHasImage++;
          continue;
        }

        missingInitial++;
        const sku = prod.variants?.nodes?.[0]?.sku?.replace('CSPC-', '').trim();
        let targetImg = null;
        let sourceName = null;

        // Source 1: LiquorConnect Azure Blob CDN
        if (sku && /^\d+$/.test(sku)) {
          const lcUrl = `https://connectstorageprd.blob.core.windows.net/productimages/${sku}.jpg`;
          const exists = await checkUrlExists(lcUrl);
          if (exists) {
            targetImg = lcUrl;
            sourceName = 'LiquorConnect';
          }
        }

        // Source 2: ZYN & BSW Competitor Matching
        if (!targetImg) {
          const match = matchProduct({ title: prod.title, sku }, zynIndex, bswIndex);
          if (match.zyn?.matched) {
            const zImg = match.zyn.image || match.zyn.candidate?.primaryImage || match.zyn.candidate?.images?.[0];
            if (zImg) {
              targetImg = zImg;
              sourceName = 'ZYN';
            }
          }
          if (!targetImg && match.bsw?.matched) {
            const bImg = match.bsw.image || match.bsw.candidate?.image || match.bsw.candidate?.images?.[0];
            if (bImg) {
              targetImg = bImg;
              sourceName = 'BSW';
            }
          }
        }

        // Attach Image if found
        if (targetImg) {
          try {
            console.log(`[ATTACH] "${prod.title}" (SKU: ${sku}) -> Source: ${sourceName}`);
            await attachProductMedia(prod.id, targetImg);
            if (sourceName === 'LiquorConnect') attachedFromLC++;
            else if (sourceName === 'ZYN') attachedFromZYN++;
            else if (sourceName === 'BSW') attachedFromBSW++;
            await sleep(200);
          } catch (err) {
            console.error(`Failed to attach image to ${prod.title}:`, err.message);
          }
        } else {
          missingEverywhere.push({
            id: prod.id,
            title: prod.title,
            sku
          });
        }
      }

      hasNextPage = page.pageInfo?.hasNextPage;
      cursor = page.pageInfo?.endCursor;

      // Save checkpoint state
      fs.writeFileSync(stateFile, JSON.stringify({
        cursor,
        totalChecked,
        alreadyHasImage,
        attachedFromLC,
        attachedFromZYN,
        attachedFromBSW,
        missingEverywhereCount: missingEverywhere.length
      }, null, 2));

      if (totalChecked % 250 === 0) {
        console.log(`📊 Progress: Checked ${totalChecked} | Has Image: ${alreadyHasImage} | Attached New: ${attachedFromLC + attachedFromZYN + attachedFromBSW} (LC: ${attachedFromLC}, ZYN: ${attachedFromZYN}, BSW: ${attachedFromBSW}) | Nowhere: ${missingEverywhere.length}`);
      }
      await sleep(150);

    } catch (e) {
      console.error('Batch error, retrying in 3s...', e.message);
      await sleep(3000);
    }
  }

  // Save missing everywhere list
  fs.writeFileSync('missing_everywhere_products.json', JSON.stringify(missingEverywhere, null, 2));

  console.log('\n' + '='.repeat(65));
  console.log('🎉 IMAGE SYNC & BACKFILL COMPLETED!');
  console.log('='.repeat(65));
  console.log(`Total Products Scanned: ${totalChecked}`);
  console.log(`Already Had Image: ${alreadyHasImage}`);
  console.log(`Total New Images Attached: ${attachedFromLC + attachedFromZYN + attachedFromBSW}`);
  console.log(`  - From LiquorConnect CDN: ${attachedFromLC}`);
  console.log(`  - From ZYN: ${attachedFromZYN}`);
  console.log(`  - From BSW: ${attachedFromBSW}`);
  console.log(`Products Missing Everywhere: ${missingEverywhere.length}`);
  console.log(`Saved nowhere list to: missing_everywhere_products.json`);
}

run();
