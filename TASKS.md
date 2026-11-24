# ShopifySynq — Developer Task List
**Project:** LiquorConnect → Shopify Integration  
**Last Updated:** November 18, 2026  
**Rule:** Har task complete karo, test karo, phir agla task shuru karo.

---

## ⚠️ PEHLE YEH CONFIRM KARO (Client se) — Jawab mile bina kaam mat shuru karo

- [ ] LiquorConnect API credentials — token ya username/password?
- [ ] `item.Cost` field available hai LiquorConnect API mein? (pricing ka base hai)
- [ ] Cost mein koi extra charges shaamil hain (delivery, duties) ya sirf raw purchase cost?
- [ ] LiquorConnect automated access allowed hai? (terms of service confirm karo)
- [ ] Purane developer se poochho: Shopify product weights originally kahan se aaye the?
- [ ] Existing weight data share karo agar available hai
- [ ] Shopify Location ID aur Publication IDs correct hain? (code mein hardcoded hain — verify karo)
- [ ] Shipping settings Shopify mein configure hain? (weight-based rates set hain?)
- [ ] Size-based weight estimates (table below) use karein agar confirmed source nahi milta — client approval chahiye

---

## PHASE 1 — Foundation (Data Sources)

### TASK-01: LiquorConnect API Auth + Access Verify karo
**File:** `src/sync/sync_engine.js`
**Requirement:** Section 1 & 7 — "Confirm a reliable automated retrieval method using authorized access"

- [ ] Client se confirm karo: LiquorConnect automated API use ki permission hai
- [ ] `.env` mein add karo: `LC_API_TOKEN=` (ya `LC_USERNAME` + `LC_PASSWORD`)
- [ ] `.env.example` update karo same keys ke saath
- [ ] `src/config.js` mein `liquorConnect.token` add karo
- [ ] `fetchLiquorConnectProducts()` mein `Authorization` header add karo
- [ ] Test: 10 products fetch karo aur console mein print karo
- [ ] Verify: yeh fields exist karte hain — `SKU`, `UPC`, `Cost`, `IsDeleted`, `Size`, `Weight`
- [ ] Confirm karo: `Cost` field wahi hai jo purchase cost hai (1.05x floor, 1.27x markup ke liye)

**Done criteria:** 10 products successfully fetch hote hain, Cost field verified, access authorized hai.

---

### TASK-02: ZYN Catalog Validate karo
**File:** `src/scraper/zyn_scraper.mjs` | `zyn_catalog.json`
**Requirement:** Section 1 & 4 — Competitor retail price and confirmed online availability

- [ ] `zyn_catalog.json` mein total products count check karo
- [ ] 5 random products ZYN website par manually open karo — price match karo
- [ ] Confirm karo yeh fields populated hain: `sku`, `barcode`, `price`, `weightGrams`
- [ ] Stock field confirm karo: ZYN products mein availability kaise aati hai
- [ ] **Critical Rule (Section 4):** Timeout ya 404 = OOS nahi. Sirf explicit `available: false` = confirmed OOS
- [ ] Agar `weightGrams` empty hai → scraper fix karo

**Done criteria:** Catalog validated, confirmed OOS detection logic documented.

---

### TASK-03: BSW Catalog Validate karo
**File:** `src/scraper/bsw_scraper.mjs` | `bsw_catalog.json`
**Requirement:** Section 1 & 4 — Competitor retail price and confirmed online availability

- [ ] `bsw_catalog.json` mein total products count check karo
- [ ] `available` field check karo — properly `true/false` set hai?
- [ ] 5 random products BSW website par manually verify karo
- [ ] Confirm karo yeh fields populated hain: `sku`, `barcode`, `price`, `weightGrams`
- [ ] Agar barcode empty hai — note karo (matching sirf title se hogi, flag lagega)
- [ ] **Critical Rule (Section 4):** Timeout ya missing listing = OOS nahi. Sirf explicit `available: false` = confirmed OOS

**Done criteria:** Catalog validated, confirmed OOS detection logic documented.

---

## PHASE 2 — Product Matching

### TASK-04: Product Matcher banao
**File (naya):** `src/matching/product_matcher.js`
**Requirement:** Section 2 — "Match products by barcode/SKU and exact bottle or case size"

Match karne ka order:
1. **Barcode (UPC) exact match + size match** — sabse reliable
2. **SKU exact match + size match**
3. **Title + Size fuzzy match** — last resort, flag karo

```
Input:  lcProduct { sku, upc, title, size }
Output: {
  zyn: { price, inStock, matchedBy } | null,
  bsw: { price, inStock, matchedBy } | null
}
```

- [ ] Size MUST match — 750ml ≠ 1L, yeh alag products hain
- [ ] Single bottle, multi-pack, aur case — teeno ko alag alag match karo
- [ ] Title fuzzy match pe `matchedBy: 'title_fuzzy'` → `flagForReview: true`
- [ ] Dono catalogs (zyn + bsw) startup pe ek baar memory mein load karo — loop mein nahi
- [ ] **`inStock` sirf tab `true` ho jab explicitly confirmed ho** — timeout/404/missing = `inStock: false` nahi, balke `inStock: unknown` treat karo aur purana state rakho
- [ ] Export: `matchProduct(lcProduct, zynCatalog, bswCatalog)`

**Done criteria:** 5 known products correctly match hote hain, size mismatch correctly reject hota hai.

---

## PHASE 3 — Pricing Engine

### TASK-05: Pricing Engine banao
**File (naya):** `src/pricing/pricing_engine.js`
**Requirement:** Section 3 & 4 — Exact pricing cascade with confirmed stock only

```
Input: lcCost, zynPrice, zynInStock, bswPrice, bswInStock

Step 1 — Competitor price select karo (sirf CONFIRMED in-stock competitors):
  Dono confirmed in stock   → min(zynPrice, bswPrice)
  Sirf ZYN confirmed        → zynPrice
  Sirf BSW confirmed        → bswPrice
  Dono confirmed OOS        → competitorPrice = null
  NOTE: "unknown" stock = use last known state, pricing skip karo agar no data

Step 2 — Agar competitorPrice available hai:
  floorPrice = lcCost * 1.05   ← 5% minimum profit (Section 3)

  14% off: candidate = competitorPrice * 0.86
    → candidate >= floorPrice? → USE ✅ STOP

  10% off: candidate = competitorPrice * 0.90
    → candidate >= floorPrice? → USE ✅ STOP

   5% off: candidate = competitorPrice * 0.95
    → candidate >= floorPrice? → USE ✅ STOP

  Koi bhi qualify nahi kiya → flagForReview = true, Shopify price update mat karo

Step 3 — Dono confirmed OOS:
  finalPrice = lcCost * 1.27   ← 27% markup (Section 3 & 7)

Output: { finalPrice, discountApplied, flagForReview, reason }
```

Document example exactly verify karo:
- Input: lcCost=87, zynPrice=100 (inStock), bswPrice=104 (inStock)
- competitorPrice = min(100,104) = 100, floorPrice = 91.35
- 14%=86 ❌, 10%=90 ❌, 5%=95 ✅
- Output: `{ finalPrice: 95, discountApplied: '5%', flagForReview: false }`
- OOS case: `{ finalPrice: 110.49, discountApplied: 'markup_27%' }` (87×1.27)

- [ ] `calculatePrice(lcCost, zynPrice, zynInStock, bswPrice, bswInStock)` function banao
- [ ] Document example exactly match karo
- [ ] OOS case test karo: 87 × 1.27 = 110.49
- [ ] Edge cases: lcCost=0, price=null, negative values handle karo
- [ ] `flagForReview: true` wale products ka reason return karo

**Done criteria:** Document example exact output deta hai, OOS case verified.

---

### TASK-06: Pricing + Matching ko sync_engine.js mein Integrate karo
**File:** `src/sync/sync_engine.js`
**Requirement:** Section 2 & 6 — Import/update catalogue, automated pricing, no duplicates

- [ ] `pricing_engine.js` import karo
- [ ] `product_matcher.js` import karo
- [ ] ZYN aur BSW catalogs startup pe ek baar load karo
- [ ] `syncProductToShopify()` mein old 7% discount logic **hata do**
- [ ] New flow: `matchProduct()` → `calculatePrice()` → Shopify update
- [ ] `flagForReview: true` wale products **Shopify mein price update mat karo**
- [ ] Flagged products `logs/flags_review.json` mein save karo
- [ ] New products (Shopify mein nahi) → create karo (`productCreate` logic use karo)
- [ ] Existing products → update karo bina duplicate banaye (`findShopifyProductBySku` use karo)

**Done criteria:** 10 products sync — prices document rules se match karti hain, no duplicates.

---

## PHASE 4 — Inventory Sync

### TASK-07: Inventory Logic Fix karo
**File:** `src/sync/sync_engine.js` → `syncInventoryQuantity()`
**Requirement:** Section 2 — "LiquorConnect determines whether client can fulfil a product. Even if ZYN or BSW have stock, if LiquorConnect says OOS → Shopify = Sold Out."

- [ ] **LiquorConnect is the ONLY source for inventory decisions** — ZYN/BSW stock se Shopify inventory mat badlo
- [ ] `item.IsDeleted === true` → Shopify inventory = 0 (Sold Out) — ZYN/BSW in stock ho tab bhi
- [ ] `item.IsDeleted === false` → inventory = `DEFAULT_INVENTORY_BUFFER` (default: 6)
- [ ] `.env` mein add karo: `DEFAULT_INVENTORY_BUFFER=6`
- [ ] `config.js` mein `inventory.defaultBuffer` update karo
- [ ] **Stale data protection (Section 2):**
  - LiquorConnect API fail → Shopify inventory SKIP karo (sold out mat karo)
  - Last known state rakho
  - `logs/error_log.json` mein error + timestamp save karo
  - Operator alert karo

**Done criteria:** `IsDeleted=true` product Sold Out hai even if ZYN/BSW in stock. API fail = no change.

---

## PHASE 5 — Shipping Weights

### TASK-08: Weight Source Confirm karo (Volumetric Pattern Reverse Engineering)
**Research task — code nahi**
**Requirement:** Section 5 — "Reuse verified source. Also check ZYN, BSW, supplier details. Client-approved estimates if no exact weights."

- [x] ZYN catalog mein `weightGrams` check karo — 10,598 products (96%) verified!
- [x] BSW catalog mein `weightGrams` check karo — verified
- [ ] LiquorConnect CSV / portal data check
- [x] **Client Discussion (Jevon - Nov 20):** Reverse engineering packaging pattern:
  - **Glass Bottles:** Liquid Volume + 450-650g tare (Factor: ~1.8x - 2.0x)
  - **Cans (Aluminum):** Liquid Volume + 15g tare (Factor: ~1.1x) e.g. 6-pack 355ml = 2.4kg, 24-pack = 10-12kg
  - **Plastic (PET):** Liquid Volume + 50g tare (Factor: ~1.15x) e.g. 750ml PET = 0.95kg, 1.75L PET = 2.1kg
- [ ] Client written confirmation on reverse-engineered packaging fallback matrix

**Done criteria:** Weight source confirmed aur packaging formula documented.

---

### TASK-09: Weight Update Function banao — Har Physical Variant
**File (naya):** `src/shopify/update_weights.js`
**Depends on:** TASK-08 + client approval
**Requirement:** Section 5 — "Every physical product variant must have correct weight"

Weight source priority:
1. ZYN `weightGrams` (agar > 0)
2. BSW `weightGrams` (agar > 0)
3. LiquorConnect `item.Weight`
4. **Client-approved** size-based estimate (TASK-08 ki approved table)

- [ ] `updateProductWeight(variantId, weightGrams)` function banao
- [ ] Shopify `inventoryItem.measurement` update karo
- [ ] **Single bottle** → direct weight
- [ ] **Multi-pack** (e.g. 6-pack) → single bottle weight × 6
- [ ] **Case** → bottles per case × single bottle weight
- [ ] Fallback size-based estimate automatically apply karo (client-approved hone ke baad)
- [ ] Weight assign nahi ho saka → `logs/error_log.json` mein log karo (skip mat karo silently)
- [ ] `sync_engine.js` mein integrate karo

**Done criteria:** Har physical variant ka weight set hai — bottle, multi-pack, case teeno verified.

---

## PHASE 6 — Error Logging

### TASK-10: Error Logging System banao
**File (naya):** `src/utils/logger.js`
**Requirement:** Section 6 — "Basic error report"

- [ ] `logs/` folder banao
- [ ] `logs/` ko `.gitignore` mein add karo
- [ ] Functions banao:
  - `logError(message, details)` → `logs/error_log.json`
  - `logFlag(product, reason)` → `logs/flags_review.json`
  - `logSyncResult(stats)` → `logs/sync_history.json`
- [ ] Har entry mein `timestamp` add karo
- [ ] `sync_engine.js` mein `console.warn` → `logError()` replace karo

**Done criteria:** Sync run karo — teeno log files ban jaati hain aur readable hain.

---

## PHASE 7 — Scheduler & Manual Re-run

### TASK-11: Scheduled Auto-Sync + Manual Re-run banao
**File (naya):** `src/scheduler.js`
**Requirement:** Section 6 — "Scheduled process to import/update catalogue, availability, competitor prices, weights" + "manual re-run"

- [ ] `node-cron` install karo: `npm install node-cron`
- [ ] `.env` mein add karo: `SYNC_CRON_SCHEDULE="0 2 * * *"`
- [ ] `.env` mein add karo: `SYNC_BATCH_SIZE=50`
- [ ] Yeh sequence implement karo:
  1. LiquorConnect products fetch karo
  2. ZYN + BSW catalogs load/refresh karo
  3. Product matching run karo
  4. Pricing engine run karo
  5. Shopify update karo (inventory + price + weight)
  6. Sync result log karo
- [ ] Manual re-run: `node src/scheduler.js --now`
- [ ] `package.json`: `"sync:manual": "node src/scheduler.js --now"`
- [ ] `package.json`: `"sync:start": "node src/scheduler.js"`

**Done criteria:** Manual run works. Scheduled run confirmed.

---

## PHASE 8 — Testing & Delivery

### TASK-12: Sample Test — 10 Products (Client Approval ke liye)
**Requirement:** Section 6 — "Tested sample before expanding to eligible full catalogue"

- [ ] 10 products select karo jinka ZYN ya BSW mein exact match ho
- [ ] Har product ki expected price manually calculate karo (document rules se)
- [ ] Sync run karo — Shopify prices check karo
- [ ] Verify: `IsDeleted` products Sold Out hain (even if ZYN/BSW in stock)
- [ ] Verify: flagged products Shopify mein price update nahi hua
- [ ] 2-3 products ka checkout karo — shipping weight correctly calculate ho rahi hai
- [ ] Results document karo — client ko dikhao
- [ ] **Client approval lo** before full catalogue run

**Done criteria:** Client approved. All pricing rules match document exactly.

---

### TASK-13: Full Catalogue Sync (30,000+ Products)
**Requirement:** Section 2 & 6 — Full eligible catalogue
**Depends on:** TASK-12 client approval

- [ ] `SYNC_BATCH_SIZE` 50-100 set karo (Shopify rate limits)
- [ ] Requests ke beech delay (1-2 sec)
- [ ] Progress save karo — crash pe resume ho sake
- [ ] Summary log: synced, updated, skipped, flagged count
- [ ] Full run ke baad `logs/sync_history.json` review karo
- [ ] `logs/flags_review.json` client ko dikhao — manual review required

**Done criteria:** 30,000+ products sync complete, summary report ready.

---

### TASK-14: Handover Document banao
**File (naya):** `HANDOVER.md`
**Requirement:** Section 6 — "Short handover explaining data sources, update frequency, what needs review"

- [ ] Data sources: LiquorConnect (supplier + cost + inventory), ZYN (competitor price), BSW (competitor price)
- [ ] Pricing logic summary (14%→10%→5%, floor 1.05x, OOS markup 1.27x)
- [ ] Inventory rule: LiquorConnect = only source, ZYN/BSW stock irrelevant for inventory
- [ ] Scheduler: kab chalti hai, manual run kaise karo
- [ ] Log files: kahan hain, kya check karna hai, flagged products kaise review karo
- [ ] Weight source: kahan se aaya, kaise update hoga
- [ ] `.env` variables ki full list + explanation
- [ ] Basic troubleshooting steps

**Done criteria:** Client ya koi bhi developer document padh ke system samajh sake.

---

## Final Checklist — Document vs Tasks

| Document Requirement | Covered In |
|----------------------|------------|
| Supplier catalogue + cost (LiquorConnect) | TASK-01 |
| Competitor price + availability (ZYN) | TASK-02 |
| Competitor price + availability (BSW) | TASK-03 |
| Authorized automated access confirm | TASK-01 |
| Match by barcode/SKU + exact size | TASK-04 |
| Import missing, update existing, no duplicates | TASK-06 |
| LiquorConnect = sole inventory authority | TASK-07 |
| Stale data → keep last state, alert operator | TASK-07 |
| Timeout/404 ≠ competitor OOS | TASK-02, 03, 04, 05 |
| 14%→10%→5% cascade | TASK-05 |
| 5% profit floor (cost × 1.05) | TASK-05 |
| Flag if no discount qualifies | TASK-05, 06 |
| Both OOS → cost × 1.27 markup | TASK-05 |
| ZYN OOS → use BSW (and vice versa) | TASK-05 |
| Weight for every physical variant | TASK-09 |
| Bottle + multi-pack + case separate weights | TASK-09 |
| Reuse previous developer weight source | TASK-08 |
| Check ZYN + BSW + supplier for weights | TASK-08 |
| Client-approved estimates if no source | TASK-08, 09 |
| Volume ≠ shipping weight | TASK-08 |
| Test sample carts (shipping calculation) | TASK-12 |
| Scheduled process | TASK-11 |
| Manual re-run | TASK-11 |
| Basic error report | TASK-10 |
| Sample test before full catalogue | TASK-12 |
| Full 30,000+ catalogue | TASK-13 |
| Handover document | TASK-14 |

---

## Task Summary

| # | Task | Priority |
|---|------|----------|
| TASK-01 | LiquorConnect API auth + access verify | 🔴 |
| TASK-02 | ZYN catalog validate | 🔴 |
| TASK-03 | BSW catalog validate | 🔴 |
| TASK-04 | Product matcher (barcode→SKU→title+size) | 🔴 |
| TASK-05 | Pricing engine (14%→10%→5%, 1.27x OOS) | 🔴 |
| TASK-06 | Integrate pricing + matching into sync engine | 🔴 |
| TASK-07 | Inventory: LC-only authority + stale protection | 🟠 |
| TASK-08 | Weight source research + client approval | 🟡 |
| TASK-09 | Weight update (bottle + multipack + case) | 🟡 |
| TASK-10 | Error/flag/sync logging | 🟡 |
| TASK-11 | Scheduler + manual re-run | 🟢 |
| TASK-12 | 10-product sample test + client approval | 🟢 |
| TASK-13 | Full 30,000+ catalogue sync | 🟢 |
| TASK-14 | Handover document | 🟢 |

---

## New Files

```
src/matching/product_matcher.js
src/pricing/pricing_engine.js
src/shopify/update_weights.js
src/utils/logger.js
src/scheduler.js
logs/ (gitignored)
HANDOVER.md
```

## Modified Files

```
src/sync/sync_engine.js
src/config.js
.env / .env.example
package.json
.gitignore
```
