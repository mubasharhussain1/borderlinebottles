import { shopifyGraphQL } from './src/shopify/client.js';
import fs from 'fs';

console.log('Loading competitor catalogs and legacy data...');
const zynObj = JSON.parse(fs.readFileSync('zyn_catalog.json', 'utf8'));
const bswObj = JSON.parse(fs.readFileSync('bsw_catalog.json', 'utf8'));
const legacyMap = fs.existsSync('legacy_descriptions.json') ? JSON.parse(fs.readFileSync('legacy_descriptions.json', 'utf8')) : {};

// Build competitor lookup sets
const competitorSkus = new Set();
const competitorBarcodes = new Set();

for (const p of Object.values(zynObj)) {
  if (p.sku) competitorSkus.add(p.sku.toString().trim());
  if (p.barcode) competitorBarcodes.add(p.barcode.toString().trim());
}
for (const p of Object.values(bswObj)) {
  if (p.sku) competitorSkus.add(p.sku.toString().trim());
  if (p.barcode) competitorBarcodes.add(p.barcode.toString().trim());
}

console.log(`Competitor SKUs indexed: ${competitorSkus.size}`);

function cleanText(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function generateBrandedDescription(title, sku, category, size) {
  const cleanCat = category ? category.trim() : 'Beverage';
  const cleanSz = size ? size.trim() : '';
  
  return `<p>Discover <strong>${title}</strong>, a distinguished selection in our <strong>${cleanCat}</strong> collection${cleanSz ? ` (${cleanSz})` : ''}. Sourced directly through verified Alberta distribution channels, this authentic bottle delivers guaranteed quality, provenance, and outstanding craftsmanship for casual enjoyment and special gatherings alike.</p>
<p>Order online today from <strong>Borderline Bottles</strong> for competitive Alberta pricing, rapid fulfillment, and dedicated local customer service.</p>
<hr/>
<ul>
<li><strong>SKU:</strong> ${sku || 'N/A'}</li>
<li><strong>Category:</strong> ${cleanCat}</li>
${cleanSz ? `<li><strong>Size:</strong> ${cleanSz}</li>` : ''}
<li><strong>Provenance:</strong> Alberta Distribution Sourced</li>
</ul>`;
}

const STATE_FILE = 'fix_state.json';

const BULK_VARIANT_MUTATION = `
  mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price compareAtPrice }
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `
  mutation UpdateProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }
`;

async function run() {
  console.log('🚀 Starting Bulletproof Mass Fix: Null Fake Compare-At & Upgrade Descriptions...');
  
  let cursor = null;
  let totalScanned = 0;
  let compareAtFixed = 0;
  let descriptionsUpgraded = 0;

  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      cursor = state.cursor || null;
      totalScanned = state.totalScanned || 0;
      compareAtFixed = state.compareAtFixed || 0;
      descriptionsUpgraded = state.descriptionsUpgraded || 0;
      console.log(`📍 Resuming from checkpoint: scanned=${totalScanned}, badgesFixed=${compareAtFixed}`);
    } catch (e) {}
  }

  let hasNext = true;

  while (hasNext) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `
      query {
        products(first: 50, query: "status:active"${afterClause}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            productType
            descriptionHtml
            variants(first: 1) {
              nodes {
                id
                sku
                barcode
                price
                compareAtPrice
              }
            }
          }
        }
      }
    `;

    try {
      const res = await shopifyGraphQL(query);
      const products = res.products.nodes;
      
      const variantFixes = [];
      const productFixes = [];

      for (const p of products) {
        totalScanned++;
        const variant = p.variants?.nodes?.[0];
        if (!variant) continue;

        const sku = (variant.sku || '').trim();
        const barcode = (variant.barcode || '').trim();
        const price = parseFloat(variant.price);
        const compareAt = parseFloat(variant.compareAtPrice);
        const hasCompetitor = (sku && competitorSkus.has(sku)) || (barcode && competitorBarcodes.has(barcode));

        // 1. FIX FAKE DISCOUNT BADGE:
        // If product is NOT in competitor catalog AND compareAtPrice is set -> NULL IT OUT!
        // Also if compareAt <= price or near identical, NULL IT OUT!
        if (!hasCompetitor) {
          if (variant.compareAtPrice !== null && !isNaN(compareAt) && compareAt > 0) {
            variantFixes.push({
              productId: p.id,
              variantId: variant.id
            });
          }
        } else if (compareAt > 0 && Math.abs(compareAt - price) < 0.05) {
          variantFixes.push({
            productId: p.id,
            variantId: variant.id
          });
        }

        // 2. FIX MISSING / BULLET-ONLY DESCRIPTIONS
        const currDesc = (p.descriptionHtml || '').trim();
        const isBasicDesc = currDesc.length < 150 || currDesc.startsWith('<ul>') || currDesc.startsWith('<p><ul>');

        if (isBasicDesc) {
          let richHtml = null;
          if (sku && legacyMap[sku] && legacyMap[sku].length > 50) {
            richHtml = legacyMap[sku];
          } else {
            const tClean = cleanText(p.title);
            const foundKey = Object.keys(legacyMap).find(k => {
              const kClean = cleanText(k);
              return kClean === tClean || (tClean.length > 8 && kClean.includes(tClean));
            });
            if (foundKey && legacyMap[foundKey].length > 50) {
              richHtml = legacyMap[foundKey];
            }
          }

          if (!richHtml) {
            const sizeMatch = p.title.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|oz|cl|pack|pk))\b/i);
            const sizeStr = sizeMatch ? sizeMatch[0] : '';
            richHtml = generateBrandedDescription(p.title, sku, p.productType, sizeStr);
          }

          productFixes.push({
            productId: p.id,
            descriptionHtml: richHtml
          });
        }
      }

      // Execute variant compareAtPrice: null updates (batches of 10)
      if (variantFixes.length > 0) {
        for (let i = 0; i < variantFixes.length; i += 10) {
          const chunk = variantFixes.slice(i, i + 10);
          await Promise.all(chunk.map(async item => {
            try {
              await shopifyGraphQL(BULK_VARIANT_MUTATION, {
                productId: item.productId,
                variants: [
                  {
                    id: item.variantId,
                    compareAtPrice: null
                  }
                ]
              });
              compareAtFixed++;
            } catch (err) {}
          }));
        }
      }

      // Execute product description updates (batches of 10)
      if (productFixes.length > 0) {
        for (let i = 0; i < productFixes.length; i += 10) {
          const chunk = productFixes.slice(i, i + 10);
          await Promise.all(chunk.map(async prod => {
            try {
              await shopifyGraphQL(PRODUCT_UPDATE_MUTATION, {
                input: {
                  id: prod.productId,
                  descriptionHtml: prod.descriptionHtml
                }
              });
              descriptionsUpgraded++;
            } catch (err) {}
          }));
        }
      }

      hasNext = res.products.pageInfo.hasNextPage;
      cursor = res.products.pageInfo.endCursor;

      // Save state checkpoint
      try {
        fs.writeFileSync(STATE_FILE, JSON.stringify({
          cursor,
          totalScanned,
          compareAtFixed,
          descriptionsUpgraded
        }));
      } catch (e) {}

      process.stdout.write(`Scanned: ${totalScanned} | Badges Removed: ${compareAtFixed} | Descs Upgraded: ${descriptionsUpgraded}\r`);
    } catch (err) {
      console.error('\nBatch error:', err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);

  console.log('\n\n======================================================');
  console.log('🎉 BULLETPROOF AUDIT & REPAIR COMPLETE!');
  console.log(`   • Total Products Scanned:     ${totalScanned}`);
  console.log(`   • Fake Sale Badges Removed:  ${compareAtFixed}`);
  console.log(`   • Descriptions Upgraded:     ${descriptionsUpgraded}`);
  console.log('======================================================\n');
}

run();
