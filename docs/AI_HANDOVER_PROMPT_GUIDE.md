# Borderline Bottles — ShopifySync AI Master Handover & Context Guide

> **Purpose for AI Assistant:**  
> You are the dedicated Lead Software Engineer for **Borderline Bottles** (`borderlinebottles.ca` / `borderline-bottles.myshopify.com`), owned by client **Jevon**.  
> This document contains the full architecture, business rules, catalog matching logic, completed fixes, remaining edge-cases, and exact file structures so you can immediately inspect, run, debug, and maintain this codebase with **zero retraining needed**.

---

## 1. Project Context & Business Goals

Borderline Bottles is an Alberta, Canada online liquor store. The goal is to synchronize **~35,000+ products** sourced via **LiquorConnect** directly into Shopify, while dynamically competing on price and content against local competitors **ZYN.ca** and **BSW Liquor**.

### Core Business Rules (Client-Approved)
1. **Competitive Pricing Rule (ZYN / BSW Match):**
   - **Target Price:** Exactly **14% OFF** the competitor's **regular retail price** (NOT their sale price).
   - **Compare-At Price:** Set to the competitor's **regular retail price** so Shopify shows a genuine 14% discount badge.
   - **Competitor Priority:** ZYN regular retail price is primary. If ZYN unlisted/OOS, fall back to BSW regular retail price. If both in stock, choose the lower regular price.
   - **Profit Floor Protection:** The selling price must NEVER fall below **LiquorConnect Cost × 1.05** (5% minimum profit margin).
     - If 14% off violates the 5% margin, try 10% → then 5% → if still below, tag product as `Review-Needed-Price-Floor` on Shopify and do not discount blindly.
2. **Unlisted / No Competitor Rule (CRITICAL):**
   - When a product is NOT found on ZYN or BSW (or competitors are out of stock):
     - **Price:** Exactly **27% markup** on wholesale cost (`Cost * 1.27`).
     - **Compare-At Price:** **MUST BE `null`**. No fake 6%, 7%, or strikethrough sale badges!
3. **Inventory Authority:**
   - **LiquorConnect** is the sole inventory authority.
   - In-Stock at LiquorConnect: Buffer of `50` units in Shopify, inventory tracking enabled, `inventoryPolicy: DENY`.
   - Out-of-Stock at LiquorConnect: `0` units, marks as Sold Out on storefront.
4. **Content & Brand Whitelabeling:**
   - Descriptions and media are enriched from ZYN → BSW → Legacy Shopify Archive → Branded Alberta distribution template.
   - **STRICT WHITELABELING:** Never allow "ZYN", "BSW", or competitor URLs in titles, descriptions, or tags. `sanitizeDescription()` strips/replaces them with "Borderline Bottles".
5. **Shipping Weights:**
   - ZYN grams → BSW grams → Packaging calculation formula (`src/utils/weight_calculator.js`: 750ml glass = ~1.25kg, cans = volume + 15g, etc.).

---

## 2. Workspace Directory Structure (`C:\Users\mubashar\Desktop\ShopifySynq`)

```text
ShopifySynq/
├── src/
│   ├── config.js               # Environment variables (Shopify Admin token, API version, URLs)
│   ├── scheduler.js            # Batch synchronization engine & daily midnight scheduler
│   ├── sync/
│   │   └── sync_engine.js      # Core logic: matching, pricing, media/desc enrichment, variant updates
│   ├── pricing/
│   │   └── pricing_engine.js   # 14% cascade discount & 5% profit floor calculations
│   ├── matching/
│   │   └── product_matcher.js  # Multi-tier catalog matching (Barcode -> SKU -> Clean Title + Size)
│   ├── shopify/
│   │   ├── client.js           # Shopify Admin GraphQL client (shopifyGraphQL)
│   │   └── rest_client.js      # Shopify Admin REST client (used for variant weights)
│   └── utils/
│       └── weight_calculator.js# Reverse-engineered bottle/can/box weight calculator
├── zyn_catalog.json            # 11,044 scraped ZYN products (prices, regular prices, descriptions, images)
├── bsw_catalog.json            # 15,910 scraped BSW products (prices, descriptions, images)
├── legacy_descriptions.json    # 19,176 rich marketing descriptions extracted from archived store data
├── shopify_all_products_import.csv # Master LiquorConnect CSV (~34,635 products)
├── fix_discounts_and_descriptions.mjs # Universal audit & repair script (nulls fake compareAt, upgrades plain bullets)
├── clean_all_active_duplicates.mjs    # Archived 990 legacy duplicate products
└── package.json
```

---

## 3. Important Fixes Already Done

1. **Duplicate Products Cleanup:**
   - Shopify had two historical imports (previous developer + LiquorConnect import), creating ~990 duplicate active SKU entries.
   - Fixed by querying active products, grouping by SKU, keeping the newest/most complete product, and setting duplicate copies to `status: ARCHIVED`.
2. **Active Products Query Scope:**
   - `findShopifyProductBySku()` and batch queries in `sync_engine.js` now strictly include `query: "status:active sku:<SKU>"` to prevent updating archived duplicates.
3. **Fake 7% Discount Bug Identified & Resolved:**
   - **Root Cause:** In `sync_engine.js`, `targetCompareAt` previously had a fallback: `(cost > 0 ? (cost * 1.27).toFixed(2) : null)`. Because `targetPrice` was also set to 27% markup or slight rounding difference, Shopify treated identical or near-identical prices as a sale, or showed fake 6-7% discounts.
   - **Fix Applied:** In `src/sync/sync_engine.js` (line 162), `targetCompareAt` is now strictly:
     ```javascript
     const targetCompareAt = priceResult.compareAtPrice ? priceResult.compareAtPrice.toFixed(2) : null;
     ```
     When unlisted, `priceResult.compareAtPrice` is `null`, so `targetCompareAt` is always `null`.
4. **Description Enrichment Priority Hierarchy:**
   - 1st: ZYN description (sanitized).
   - 2nd: BSW description (sanitized).
   - 3rd: `legacy_descriptions.json` (19k archived rich descriptions).
   - 4th: Branded Alberta distribution paragraph template (with SKU/Size/Category spec table).
   - Never leave a product with only 3 plain bullets (`SKU`, `Category`, `Size`).

---

## 4. How to Run & Maintain the System

### A. Environment & Execution
- **Node.js Environment:** Windows, PowerShell.
- **Network / API access:** Shopify Admin API calls require standard internet access. In sandboxed AI tools, always use outbound network bypass if blocked.
- **PowerShell Note:** Avoid inline multi-line Node strings (`node -e "..."`) with backticks on Windows PowerShell; always write to `.mjs` scripts and run `node script.mjs`.

### B. Daily Synchronization
- **One-off full sync:**
  ```powershell
  npm run sync:manual
  ```
- **Automated daemon (runs daily at midnight Alberta time):**
  ```powershell
  npm run scheduler
  ```
- **Generate health report:**
  ```powershell
  npm run report
  ```

---

## 5. Quick Reference: Key File Logic to Understand

### `src/pricing/pricing_engine.js`
- Function: `calculatePrice(lcCost, zynPrice, zynInStock, bswPrice, bswInStock)`
- If matched: calculates `competitorPrice * 0.86`. Compares against floor `lcCost * 1.05`. Returns `{ finalPrice, compareAtPrice: competitorPrice, discountApplied: '14%' }`.
- If unlisted: returns `{ finalPrice: lcCost * 1.27, compareAtPrice: null, discountApplied: 'markup_27%' }`.

### `src/sync/sync_engine.js`
- Function: `syncProductToShopify(item, zynIndex, bswIndex, preloadedProduct)`
- Performs matching, pricing, weight calculation, description sanitization, and parallel updates via Shopify GraphQL.

---

## 6. What to Do If the Client Reports an Issue

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **Fake "On Sale" badge on unlisted product** | `compareAtPrice` is not null on Shopify variant | Check variant in Shopify GraphQL. Ensure `compareAtPrice: null` is passed. |
| **Product description is just 3 bullet points** | Product wasn't matched in ZYN/BSW and wasn't in legacy archive | Run `node fix_discounts_and_descriptions.mjs` or inject the branded description template. |
| **Duplicate products appearing in storefront search** | Two products have the same SKU | Run `node clean_all_active_duplicates.mjs` to archive the older duplicate. |
| **Price is lower than 5% margin** | Competitor price is extremely low or cost mismatch | Check `tags`. Engine automatically tags with `Review-Needed-Price-Floor` instead of publishing negative margins. |
