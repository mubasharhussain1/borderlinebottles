import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { shopifyGraphQL } from '../shopify/client.js';
import { config } from '../config.js';
import { buildCatalogIndex, matchProduct } from '../matching/product_matcher.js';
import { calculatePrice } from '../pricing/pricing_engine.js';
import { calculateShippingWeight } from '../utils/weight_calculator.js';

import { logFlaggedProduct, logSyncError } from '../utils/logger.js';

export function loadCompetitorIndices() {
  console.log('📦 Loading and Indexing Competitor Catalogs at startup...');

  const zynPath = path.resolve('zyn_catalog.json');
  const bswPath = path.resolve('bsw_catalog.json');

  let zynIndex = null;
  if (fs.existsSync(zynPath)) {
    const zynRaw = JSON.parse(fs.readFileSync(zynPath, 'utf8'));
    zynIndex = buildCatalogIndex(zynRaw, 'zyn');
    console.log(`✅ ZYN Index built: ${zynRaw.length} items`);
  }

  let bswIndex = null;
  if (fs.existsSync(bswPath)) {
    const bswRaw = JSON.parse(fs.readFileSync(bswPath, 'utf8'));
    bswIndex = buildCatalogIndex(bswRaw, 'bsw');
    const bswCount = Array.isArray(bswRaw) ? bswRaw.length : Object.keys(bswRaw).length;
    console.log(`✅ BSW Index built: ${bswCount} items`);
  }

  return { zynIndex, bswIndex };
}

export async function findShopifyProductsBySkuBatch(skus) {
  if (!skus || skus.length === 0) return {};
  const queryStr = `status:active AND (${skus.map(s => `sku:${s}`).join(' OR ')})`;
  const query = `
    query FindBySkuBatch($query: String!) {
      products(first: 50, query: $query) {
        nodes {
          id
          title
          variants(first: 1) {
            nodes {
              id
              sku
              price
              compareAtPrice
              inventoryItem { id }
            }
          }
        }
      }
    }
  `;
  try {
    const data = await shopifyGraphQL(query, { query: queryStr });
    const map = {};
    if (data?.products?.nodes) {
      for (const prod of data.products.nodes) {
        const sku = prod.variants?.nodes?.[0]?.sku;
        if (sku && !map[sku]) {
          map[sku] = prod;
        }
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

export async function findShopifyProductBySku(sku) {
  const query = `
    query FindBySku($query: String!) {
      products(first: 1, query: $query) {
        nodes {
          id
          title
          variants(first: 1) {
            nodes {
              id
              sku
              price
              compareAtPrice
              inventoryItem { id }
            }
          }
        }
      }
    }
  `;
  try {
    const data = await shopifyGraphQL(query, { query: `status:active sku:${sku}` });
    return data.products.nodes[0] || null;
  } catch (e) {
    return null;
  }
}

export async function syncProductToShopify(item, zynIndex, bswIndex, preloadedProduct = null) {
  const sku = (item.SKU || '').toString().trim();
  const title = (item.Name || 'Unknown Product').trim();
  const cost = parseFloat((item.Cost || '0').toString().replace(/[$,]/g, ''));
  const size = item.Size || '';
  const isLcInStock = item.AvailabilityDisplay
    ? item.AvailabilityDisplay.toLowerCase().includes('in stock')
    : true;

  if (!sku || isNaN(cost) || cost <= 0) {
    logSyncError({ sku, title, cost, error: 'Invalid SKU or missing cost' });
    return null;
  }

  // 1. MATCH PRODUCT
  const matches = matchProduct({ sku, title, size }, zynIndex, bswIndex);

  // ✅ FIX: Use REGULAR price (compareAtPrice) as competitor reference, NOT sale price (price).
  // BSW/ZYN often run promotions. We must base our 14% discount on their REGULAR retail price.
  // If compareAtPrice is missing (no ongoing sale), fallback to price field (which IS the regular price when no sale).
  const zynPrice = matches.zyn ? (parseFloat(matches.zyn.candidate?.raw?.compareAtPrice) || parseFloat(matches.zyn.price) || null) : null;
  const zynInStock = matches.zyn ? matches.zyn.available : false;
  const bswPrice = matches.bsw ? (parseFloat(matches.bsw.candidate?.raw?.compareAtPrice) || parseFloat(matches.bsw.price) || null) : null;
  const bswInStock = matches.bsw ? matches.bsw.available : false;

  // 2. PRICING
  const priceResult = calculatePrice(cost, zynPrice, zynInStock, bswPrice, bswInStock);

  // 3. SHIPPING WEIGHT (ZYN -> BSW -> Jevon Reverse-Engineered Packaging Formula)
  const weightCalc = calculateShippingWeight({ Name: title, Size: size }, matches.zyn, matches.bsw);
  const weightKg = weightCalc.weightKg;

  // 3. UPSERT (Use preloaded product if available from batch, else single query)
  const existing = preloadedProduct !== null ? preloadedProduct : await findShopifyProductBySku(sku);

  if (existing) {
    const variant = existing.variants.nodes[0];

    if (priceResult.flagForReview) {
      console.warn(`🚩 [FLAG FOR REVIEW] "${title}" (SKU: ${sku}): ${priceResult.reason}`);
      logFlaggedProduct({ sku, title, cost, zynPrice, bswPrice, reason: priceResult.reason });

      // Auto-tag product on Shopify and REMOVE any fake compareAtPrice so customers never see a fake sale badge!
      try {
        const tagMutation = `
          mutation addTags($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              userErrors { field message }
            }
          }
        `;
        await shopifyGraphQL(tagMutation, {
          id: existing.id,
          tags: ["Review-Needed-Price-Floor"]
        });

        // If product still has a compareAtPrice, strip it immediately
        if (variant.compareAtPrice !== null) {
          await shopifyGraphQL(`
            mutation StripBadge($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                userErrors { field message }
              }
            }
          `, {
            productId: existing.id,
            variants: [{ id: variant.id, compareAtPrice: null }]
          });
        }
      } catch (e) {}

      return existing;
    }

    const targetPrice = priceResult.finalPrice.toFixed(2);
    // If compareAtPrice returned from competitor (e.g. regular price), use it. When unlisted, compareAtPrice MUST BE NULL (no fake discount badge).
    const targetCompareAt = priceResult.compareAtPrice ? priceResult.compareAtPrice.toFixed(2) : null;

    console.log(`🔄 Updating "${title}" (SKU: ${sku}): $${targetPrice} [${priceResult.discountApplied}] (Weight: ${weightKg}kg, Stock: ${isLcInStock ? 50 : 0})`);

    // 1. Media & Content Enrichment
    const mediaUrl = matches.zyn?.primaryImage || matches.zyn?.images?.[0] || matches.bsw?.image || null;
    let descriptionHtml = matches.zyn?.bodyHtml || matches.bsw?.bodyHtml || null;
    if (descriptionHtml) {
      descriptionHtml = sanitizeDescription(descriptionHtml);
    }

    // 2. Run media, weight, and inventory updates in parallel
    const asyncTasks = [];

    if (mediaUrl || descriptionHtml) {
      asyncTasks.push(enrichProductContent(existing.id, mediaUrl, descriptionHtml));
    }

    asyncTasks.push(updateVariant(existing.id, variant.id, targetPrice, targetCompareAt, variant.inventoryItem?.id, weightKg));

    if (variant.inventoryItem?.id) {
      const buffer = config.inventory?.defaultBuffer || 50;
      asyncTasks.push(enableAndSyncInventory(variant.inventoryItem.id, isLcInStock ? buffer : 0));
    }

    await Promise.allSettled(asyncTasks);

    return existing;
  }

  // 4. AUTO-CREATE: If product doesn't exist on Shopify, automatically create it!
  try {
    const targetPrice = priceResult.finalPrice ? priceResult.finalPrice.toFixed(2) : (cost * 1.27).toFixed(2);
    const targetCompareAt = priceResult.compareAtPrice ? priceResult.compareAtPrice.toFixed(2) : null;
    const mediaUrl = matches.zyn?.primaryImage || matches.zyn?.images?.[0] || matches.bsw?.image || null;
    let descriptionHtml = matches.zyn?.bodyHtml || matches.bsw?.bodyHtml || null;
    if (descriptionHtml) {
      descriptionHtml = sanitizeDescription(descriptionHtml);
    } else {
      descriptionHtml = generateBrandedDescription(title, sku, item.Category || 'Beverage', size);
    }

    const tags = ['LiquorConnect-Sync'];
    if (size) tags.push(size);
    if (isLcInStock) tags.push('In-Stock');
    if (priceResult.flagForReview) tags.push('Review-Needed-Price-Floor');

    console.log(`✨ [AUTO-CREATE] Creating new product "${title}" (SKU: ${sku}): $${targetPrice} on Shopify...`);

    const createMutation = `
      mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            variants(first: 1) {
              nodes {
                id
                inventoryItem { id }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;

    const createRes = await shopifyGraphQL(createMutation, {
      input: {
        title,
        vendor: "Borderline Bottles",
        productType: item.Category || "Beverage",
        tags,
        descriptionHtml
      }
    });

    const newProd = createRes?.productCreate?.product;
    if (newProd) {
      const newVariant = newProd.variants.nodes[0];
      const asyncTasks = [];

      if (mediaUrl) {
        asyncTasks.push(enrichProductContent(newProd.id, mediaUrl, null));
      }

      asyncTasks.push(updateVariant(newProd.id, newVariant.id, targetPrice, targetCompareAt, newVariant.inventoryItem?.id, weightKg, sku));

      if (newVariant.inventoryItem?.id) {
        const buffer = config.inventory?.defaultBuffer || 50;
        asyncTasks.push(enableAndSyncInventory(newVariant.inventoryItem.id, isLcInStock ? buffer : 0));
      }

      await Promise.allSettled(asyncTasks);
      console.log(`✅ [AUTO-CREATE SUCCESS] "${title}" (SKU: ${sku}) created & published live!`);
      return newProd;
    }
  } catch (err) {
    console.error(`❌ Auto-create failed for SKU ${sku}:`, err.message);
  }

  return null;
}

export function generateBrandedDescription(title, sku, category, size) {
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

/**
 * Sanitizes description HTML by completely removing competitor brand mentions
 * (ZYN, ZYN.ca, BSW, BSW Liquor) in accordance with client instructions.
 */
export function sanitizeDescription(html) {
  if (!html) return '';
  let cleaned = html;

  // 1. Remove URLs and links mentioning zyn or bsw
  cleaned = cleaned.replace(/https?:\/\/(www\.)?(zyn\.ca|bswliquor\.com)[^\s"'<>"]*/gi, '');
  cleaned = cleaned.replace(/<a\b[^>]*>(.*?)<\/a>/gi, (match, p1) => {
    if (/zyn|bsw/i.test(match)) return p1; // strip link tag if points to competitor
    return match;
  });

  // 2. Specific domain & company phrases
  cleaned = cleaned.replace(/\b(www\.)?(zyn\.ca|bswliquor\.com|bswliquor)\b/gi, 'Borderline Bottles');
  cleaned = cleaned.replace(/\b(BSW\s*Liquor|ZYN\s*Wine\s*and\s*Spirits|ZYN\s*Calgary)\b/gi, 'Borderline Bottles');

  // 3. Contextual prepositions
  cleaned = cleaned.replace(/\b(at|from|on|by|visit)\s+(ZYN|BSW)\b/gi, '$1 Borderline Bottles');

  // 4. Standalone mentions (case-insensitive)
  cleaned = cleaned.replace(/\bZYN\b/gi, 'Borderline Bottles');
  cleaned = cleaned.replace(/\bBSW\b/gi, 'Borderline Bottles');

  // 5. Clean up any accidental double spaces
  cleaned = cleaned.replace(/Borderline Bottles\.com/gi, 'Borderline Bottles');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  return cleaned.trim();
}

async function enrichProductContent(productId, imageUrl, descriptionHtml) {
  try {
    // 1. Update Description if available and currently empty/needed
    if (descriptionHtml) {
      const updateProductMutation = `
        mutation updateProductDescription($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id }
            userErrors { field message }
          }
        }
      `;
      await shopifyGraphQL(updateProductMutation, {
        input: {
          id: productId,
          descriptionHtml: descriptionHtml
        }
      });
    }

    // 2. Attach Image (ZYN or BSW fallback)
    if (imageUrl) {
      const createMediaMutation = `
        mutation CreateProductMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media { id status }
            userErrors { field message }
          }
        }
      `;
      await shopifyGraphQL(createMediaMutation, {
        productId,
        media: [{
          originalSource: imageUrl,
          mediaContentType: "IMAGE"
        }]
      });
    }
  } catch (err) {
    // Silently continue if media already attached or rate limited
  }
}

async function updateVariant(productId, variantId, price, compareAtPrice, inventoryItemId, weightKg, sku = null) {
  // 1. Bulk update for price via GraphQL
  const priceMutation = `
    mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price compareAtPrice inventoryPolicy }
        userErrors { field message }
      }
    }
  `;
  const vInput = { id: variantId, price, compareAtPrice: compareAtPrice || null, inventoryPolicy: "DENY" };
  if (sku) {
    vInput.inventoryItem = { sku };
  }
  await shopifyGraphQL(priceMutation, { productId, variants: [vInput] });

  // 2. Set weight via REST API with automatic rate-limit retry
  if (weightKg > 0) {
    const numericId = variantId.split('/').pop();
    let attempts = 0;
    let weightUpdated = false;

    while (!weightUpdated && attempts < 3) {
      attempts++;
      try {
        await axios.put(
          `https://${config.shopify.domain}/admin/api/${config.shopify.apiVersion || '2024-10'}/variants/${numericId}.json`,
          {
            variant: {
              id: parseInt(numericId),
              weight: weightKg,
              weight_unit: 'kg'
            }
          },
          {
            headers: {
              'X-Shopify-Access-Token': config.shopify.accessToken,
              'Content-Type': 'application/json'
            }
          }
        );
        weightUpdated = true;
      } catch (e) {
        if (e.response?.status === 429) {
          // Shopify REST API rate limit: wait 500ms and retry
          await new Promise(r => setTimeout(r, 600));
        } else {
          break;
        }
      }
    }
  }
}

export async function enableAndSyncInventory(inventoryItemId, quantity = 50) {
  // 1. Enable inventory tracking on the item
  const trackMutation = `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem { id tracked }
        userErrors { field message }
      }
    }
  `;
  try {
    await shopifyGraphQL(trackMutation, {
      id: inventoryItemId,
      input: { tracked: true }
    });
  } catch (e) {}

  // 2. Set stock quantity
  const qtyMutation = `
    mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
      }
    }
  `;
  try {
    await shopifyGraphQL(qtyMutation, {
      input: {
        name: "available",
        reason: "cycle_count_available",
        ignoreCompareQuantity: true,
        quantities: [{
          inventoryItemId,
          locationId: config.inventory?.locationId || "gid://shopify/Location/92324233428",
          quantity
        }]
      }
    });
  } catch (err) {}
}
