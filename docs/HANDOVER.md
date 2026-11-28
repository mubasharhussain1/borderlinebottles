# 📖 Borderline Bottles — Store Owner Handover & Operations Guide

**Store:** Borderline Bottles ([borderline-bottles.myshopify.com](https://borderline-bottles.myshopify.com))  
**Owner:** Jevon  
**Catalog Status:** 34,635 Products Ingested & Synced  

---

## 🌟 Executive Summary

Your entire LiquorConnect product catalog (**34,635 products**) is now live and synchronized with automated competitor-beating pricing, shipping weights, high-resolution media, and real-time inventory management.

Everything runs automatically in the background — no manual coding or technical intervention is required on your part.

---

## ⚡ How the Automated System Works

### 1. Dynamic Competitor Pricing
* **Primary Source:** ZYN.ca regular retail price.
* **Secondary Source:** BSW Liquor regular retail price.
* **Pricing Formula:** **14% OFF** the regular competitor price.
  * **Compare-At Price:** Shows the regular retail price.
  * **Your Price:** Shows the 14% discounted price (clear savings for customers).
* **Unlisted Items:** If an item is not found on competitor sites or is out of stock, it is priced with a **27% standard markup on wholesale cost**.

### 2. Zero-Loss Profit Protection (5% Profit Floor)
* Your business is protected against selling at a loss.
* The system enforces a **strict 5% minimum profit floor** (`Wholesale Cost × 1.05`).
* If a 14% discount would cause your price to drop below this 5% margin, the system **blocks the discount** and automatically tags the product for your review.

### 3. Inventory Authority (LiquorConnect)
* **In-Stock on LiquorConnect:** Synced with a default 50-unit inventory buffer and active purchasing.
* **Out-of-Stock on LiquorConnect:** Automatically marked **"Sold Out"** on Shopify, and backorders are strictly prevented (`inventoryPolicy: "DENY"`).

### 4. Shipping Weights
* Every product has an accurate shipping weight assigned (from ZYN/BSW verified specs or the container packaging formula: glass bottles ~2.2kg, cans ×1.10, PET plastic ×1.15).
* This ensures that Shopify checkout calculates accurate weight-tiered shipping rates.

### 5. 100% White-Label Branding
* All product tasting notes, specifications, and descriptions have been sanitized to remove any competitor mentions or external URLs.

---

## 🕛 Daily Automation Schedule

* **Automated Sync Time:** Runs automatically every night at **12:00 AM Midnight**.
* **What Happens Nightly:**
  1. Pulls the latest inventory changes from LiquorConnect (new arrivals / sold out items).
  2. Pulls updated prices from competitors.
  3. Re-calculates and updates all prices, compare-at values, and stock counts.

---

## 🛠️ Store Owner Daily Checklist (Shopify Admin)

You can manage flagged items directly within your Shopify Admin without writing any code.

### How to Review Flagged Products:
1. Log into your [Shopify Admin Products](https://admin.shopify.com/store/borderline-bottles/products).
2. Filter by tag: `Review-Needed-Price-Floor`  
   👉 **Direct One-Click Filter Link:** [View Flagged Products](https://admin.shopify.com/store/borderline-bottles/products?tag=Review-Needed-Price-Floor)
3. **What to do:** These are products where wholesale cost was too high to offer a full 14% discount. You can either:
   - Leave them at their safe standard price.
   - Manually set a custom price you prefer.
   - Once reviewed, remove the tag.

---

## 📞 Manual Sync (If Ever Needed)

If you ever receive an urgent bulk price update during the day and don't want to wait until midnight:
```powershell
npm run sync:manual
```
This triggers an instant on-demand sync of the entire catalog.

---

*System developed and handed over by Mubashar Hussain.*
