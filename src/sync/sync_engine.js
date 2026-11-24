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
    const data = await shopifyGraphQL(query, { query: `sku:${sku}` });
    return data.products.nodes[0] || null;
  } catch (e) {
    return null;
  }
}

export async function syncProductToShopify(item, zynIndex, bswIndex) {
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

  const zynPrice = matches.zyn?.price || null;
  const zynInStock = matches.zyn ? matches.zyn.available : false;
  const bswPrice = matches.bsw?.price || null;
  const bswInStock = matches.bsw ? matches.bsw.available : false;

  // 2. PRICING
  const priceResult = calculatePrice(cost, zynPrice, zynInStock, bswPrice, bswInStock);

  // 3. SHIPPING WEIGHT (ZYN -> BSW -> Jevon Reverse-Engineered Packaging Formula)
  const weightCalc = calculateShippingWeight({ Name: title, Size: size }, matches.zyn, matches.bsw);
  const weightKg = weightCalc.weightKg;

  // 3. UPSERT
  const existing = await findShopifyProductBySku(sku);

  if (existing) {
    const variant = existing.variants.nodes[0];

    if (priceResult.flagForReview) {
      console.warn(`🚩 [FLAG FOR REVIEW] "${title}" (SKU: ${sku}): ${priceResult.reason}`);
      logFlaggedProduct({ sku, title, cost, zynPrice, bswPrice, reason: priceResult.reason });

      // Auto-tag product on Shopify so owner/client can easily filter in Shopify Admin!
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
      } catch (e) {}

      return existing;
    }

    const targetPrice = priceResult.finalPrice.toFixed(2);
    // If compareAtPrice returned from competitor (e.g. regular price), use it. Otherwise fallback to standard 27% markup if cost exists.
    const targetCompareAt = priceResult.compareAtPrice ? priceResult.compareAtPrice.toFixed(2) : (cost > 0 ? (cost * 1.27).toFixed(2) : null);

    console.log(`🔄 Updating "${title}" (SKU: ${sku}): $${targetPrice} [${priceResult.discountApplied}] (Weight: ${weightKg}kg, Stock: ${isLcInStock ? 50 : 0})`);

    // 1. Bulk update for price via GraphQL & Inventory Policy
    const priceMutation = `
      mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id price compareAtPrice inventoryPolicy }
          userErrors { field message }
        }
      }
    `;
    const vInput = {
      id: variant.id,
      price: targetPrice,
      inventoryPolicy: "DENY" // Strictly enforce Sold Out when inventory reaches 0!
    };
    if (targetCompareAt) vInput.compareAtPrice = targetCompareAt;
    await shopifyGraphQL(priceMutation, { productId: existing.id, variants: [vInput] });

    // 2. Set Weight via REST API
    await updateVariant(existing.id, variant.id, targetPrice, targetCompareAt, variant.inventoryItem?.id, weightKg);

    // 3. Media & Content Enrichment (ZYN Priority -> BSW Fallback)
    const mediaUrl = matches.zyn?.primaryImage || matches.zyn?.images?.[0] || matches.bsw?.image || null;
    let descriptionHtml = matches.zyn?.bodyHtml || matches.bsw?.bodyHtml || null;

    // Filter out any mentions of ZYN or BSW as requested by client Jevon
    if (descriptionHtml) {
      descriptionHtml = sanitizeDescription(descriptionHtml);
    }

    if (mediaUrl || descriptionHtml) {
      await enrichProductContent(existing.id, mediaUrl, descriptionHtml);
    }

    if (variant.inventoryItem?.id) {
      const buffer = config.inventory?.defaultBuffer || 50;
      await enableAndSyncInventory(variant.inventoryItem.id, isLcInStock ? buffer : 0);
    }

    return existing;
  }

  return null;
}

/**
 * Sanitizes description HTML by completely removing competitor brand mentions
 * (ZYN, ZYN.ca, BSW, BSW Liquor) in accordance with client instructions.
 */
export function sanitizeDescription(html) {
  if (!html) return '';
  let cleaned = html;

  // Patterns to strip/replace
  // 1. URLs mentioning zyn or bsw
  cleaned = cleaned.replace(/https?:\/\/(www\.)?(zyn\.ca|bswliquor\.com)[^\s"'<>"]*/gi, '');

  // 2. Phrases mentioning ZYN or BSW
  cleaned = cleaned.replace(/\b(ZYN\.ca|zyn\.ca|BSW\s*Liquor|bswliquor)\b/gi, 'Borderline Bottles');
  cleaned = cleaned.replace(/\b(at\s+ZYN|at\s+BSW|from\s+ZYN|from\s+BSW|on\s+ZYN|on\s+BSW)\b/gi, 'at Borderline Bottles');
  cleaned = cleaned.replace(/\b(ZYN|BSW)\b/g, 'Borderline Bottles');

  return cleaned;
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

async function updateVariant(productId, variantId, price, compareAtPrice, inventoryItemId, weightKg) {
  // 1. Bulk update for price via GraphQL
  const priceMutation = `
    mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price compareAtPrice }
        userErrors { field message }
      }
    }
  `;
  const vInput = { id: variantId, price };
  if (compareAtPrice) vInput.compareAtPrice = compareAtPrice;
  await shopifyGraphQL(priceMutation, { productId, variants: [vInput] });

  // 2. Set weight via REST API (GraphQL inventoryItemUpdate doesn't populate Admin UI weight box)
  if (weightKg > 0) {
    const numericId = variantId.split('/').pop();
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
    } catch (e) {
      console.warn(`⚠️ Weight update failed for variant ${numericId}:`, e.response?.data || e.message);
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
