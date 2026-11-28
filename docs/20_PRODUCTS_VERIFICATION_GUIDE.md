# Borderline Bottles — 20 Product Verification Guide (All Scenarios)

Yeh guide aapko live storefront (`borderlinebottles.ca`) aur Shopify Admin par har pricing aur content scenario ko verify karne ke liye exact 20 products provide karti hai.

---

## 🎯 Verification Rules Checklist (Aapko Kya Verify Karna Hai)

| Rule # | Scenario | Price Formula | Compare-At Price | Badges on Storefront | Description Expectation |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **ZYN Only** | 14% OFF ZYN Regular Price | ZYN Regular Price | 🔴 **14% OFF Badge** | ZYN Rich Description (Sanitized) |
| **2** | **BSW Only** | 14% OFF BSW Regular Price | BSW Regular Price | 🔴 **14% OFF Badge** | BSW Rich Description (Sanitized) |
| **3** | **Both Listed (ZYN Lower)** | 14% OFF ZYN Regular Price | ZYN Regular Price | 🔴 **14% OFF Badge** | ZYN Rich Description (Sanitized) |
| **4** | **Both Listed (BSW Lower)** | 14% OFF BSW Regular Price | BSW Regular Price | 🔴 **14% OFF Badge** | BSW Rich Description (Sanitized) |
| **5** | **Unlisted (No Competitor)** | LC Cost × 1.27 (27% markup) | **NULL (Khali)** | ⚪ **NO SALE BADGE** (Clean Price) | Legacy Sommelier Text or Branded Alberta Distribution Paragraph |
| **6** | **Profit Floor Triggered** | Review Needed | Competitor Price | Tagged `Review-Needed-Price-Floor` | Safe from selling at a loss |

---

## 📋 The 20 Test Products List

### Scenario A: ZYN Only (14% Off ZYN Regular Price)
*ZYN par listed hai, BSW par nahi. Compare-At ZYN ka regular price hona chahiye aur price 14% less.*

1. **Canadian Club Premium**
   - **SKU:** `42`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/canadian-club-premium-42)
   - **Wholesale Cost:** \$21.19 | **ZYN Price:** \$32.40
   - **Expected Selling Price:** **\$27.86**
   - **Expected Compare-At:** **\$32.40** (Shows 14% Savings Badge)

2. **Smirnoff**
   - **SKU:** `67`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/smirnoff-67)
   - **Wholesale Cost:** \$19.42 | **ZYN Price:** \$24.99
   - **Expected Selling Price:** **\$21.49**
   - **Expected Compare-At:** **\$24.99** (Shows 14% Savings Badge)

3. **Andres Baby Duck**
   - **SKU:** `91`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/andres-baby-duck-91)
   - **Wholesale Cost:** \$8.26 | **ZYN Price:** \$10.99
   - **Expected Selling Price:** **\$9.45**
   - **Expected Compare-At:** **\$10.99** (Shows 14% Savings Badge)

4. **Sogrape Mateus Rose**
   - **SKU:** `166`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/sogrape-mateus-rose-166)
   - **Wholesale Cost:** \$10.21 | **ZYN Price:** \$14.00
   - **Expected Selling Price:** **\$12.04**
   - **Expected Compare-At:** **\$14.00** (Shows 14% Savings Badge)

---

### Scenario B: BSW Only (14% Off BSW Regular Price)
*BSW par listed hai, ZYN par nahi. Compare-At BSW ka regular price hona chahiye aur price 14% less.*

5. **Silk Tassel (750ml)**
   - **SKU:** `620`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/silk-tassel-620)
   - **Wholesale Cost:** \$17.87 | **BSW Price:** \$25.99
   - **Expected Selling Price:** **\$22.35**
   - **Expected Compare-At:** **\$25.99** (Shows 14% Savings Badge)

6. **Silk Tassel (375ml)**
   - **SKU:** `1651`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/silk-tassel-1651)
   - **Wholesale Cost:** \$9.97 | **BSW Price:** \$25.99
   - **Expected Selling Price:** **\$22.35**
   - **Expected Compare-At:** **\$25.99**

7. **Royal Reserve**
   - **SKU:** `1735`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/royal-reserve-1735)
   - **Wholesale Cost:** \$10.59 | **BSW Price:** \$24.99
   - **Expected Selling Price:** **\$21.49**
   - **Expected Compare-At:** **\$24.99**

8. **Captain Morgan Dark Rum**
   - **SKU:** `2196`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/captain-morgan-dark-rum-2196)
   - **Wholesale Cost:** \$21.09 | **BSW Price:** \$25.99
   - **Expected Selling Price:** **\$22.35**
   - **Expected Compare-At:** **\$25.99**

---

### Scenario C: Both Competitors Listed (ZYN Price Cheaper or Equal)
*Dono jagah mojood hai, ZYN ka price lower/equal hai, isliye ZYN price target hoga.*

9. **Beefeater London Dry Gin**
   - **SKU:** `570`
   - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/beefeater-london-dry-gin-570)
   - **Cost:** \$20.81 | **ZYN:** \$30.60 | **BSW:** \$31.99
   - **Expected Selling Price:** **\$26.32** (14% off \$30.60)
   - **Expected Compare-At:** **\$30.60**

10. **J & B Rare Scotch**
    - **SKU:** `2360`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/j-b-rare-2360)
    - **Cost:** \$23.88 | **ZYN:** \$33.00 | **BSW:** \$33.99
    - **Expected Selling Price:** **\$28.38** (14% off \$33.00)
    - **Expected Compare-At:** **\$33.00**

11. **Bacardi Gold Amber Rum**
    - **SKU:** `2808`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/bacardi-gold-amber-rum-2808)
    - **Cost:** \$21.09 | **ZYN:** \$27.75 | **BSW:** \$28.49
    - **Expected Selling Price:** **\$23.87** (14% off \$27.75)
    - **Expected Compare-At:** **\$27.75**

---

### Scenario D: Both Competitors Listed (BSW Price Cheaper)
*Dono jagah mojood hai, BSW ka price ZYN se sasta hai, isliye BSW price target hoga.*

12. **Bombay Sapphire London Dry Gin**
    - **SKU:** `788`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/bombay-sapphire-london-dry-gin-788)
    - **Cost:** \$21.50 | **ZYN:** \$32.50 | **BSW:** \$29.99
    - **Expected Selling Price:** **\$25.79** (14% off BSW \$29.99)
    - **Expected Compare-At:** **\$29.99**

13. **Johnnie Walker Red Label**
    - **SKU:** `57`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/johnnie-walker-red-label-57)
    - **Cost:** \$22.90 | **ZYN:** \$31.99 | **BSW:** \$28.99
    - **Expected Selling Price:** **\$24.93** (14% off BSW \$28.99)
    - **Expected Compare-At:** **\$28.99**

---

### Scenario E: Unlisted Products (27% Markup — ZERO Fake Sale Badges)
*Yeh products ZYN aur BSW par nahi hain. In par koi 6% ya 7% ka badge nahi aana chahiye!*

14. **Heineken Lager (Bottles)**
    - **SKU:** `18`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/heineken-lager-bottles-18)
    - **Wholesale Cost:** \$16.04
    - **Expected Selling Price:** **\$20.37** (\$16.04 × 1.27)
    - **Expected Compare-At:** **NULL (Khali)** — ❌ No sale badge!

15. **Walkers Special Old**
    - **SKU:** `281`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/walkers-special-old-281)
    - **Wholesale Cost:** \$20.16
    - **Expected Selling Price:** **\$25.60** (\$20.16 × 1.27)
    - **Expected Compare-At:** **NULL (Khali)** — ❌ No sale badge!

16. **Chiarli Lambrusco Castelvetro**
    - **SKU:** `604`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/chiarli-lambrusco-castelvetro-604)
    - **Wholesale Cost:** \$9.90
    - **Expected Selling Price:** **\$12.57** (\$9.90 × 1.27)
    - **Expected Compare-At:** **NULL (Khali)** — ❌ No sale badge!

17. **'88 Good Morning Viet Coffee Stout**
    - **SKU:** `877673`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/88-good-morning-viet-coffee-stout-cls-877673)
    - **Wholesale Cost:** \$15.50
    - **Expected Selling Price:** **\$19.68**
    - **Expected Compare-At:** **NULL (Khali)** — ❌ No sale badge!
    - **Description:** Alberta Distribution Sourced Branded paragraph + Specs

18. **#1 Baglietti Bio Rose**
    - **SKU:** `116305`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/1-baglietti-bio-rose-116305)
    - **Wholesale Cost:** \$15.65
    - **Expected Selling Price:** **\$19.88**
    - **Expected Compare-At:** **NULL (Khali)** — ❌ No sale badge!

---

### Scenario F: Profit Floor Protection (< 5% Margin Safeguard)
*In products par 14% discount lagane se profit margin 5% se kam ho jata tha. System ne inhein blind discount nahi kiya balke client review ke liye flag kar diya.*

19. **Smirnoff (Small Size)**
    - **SKU:** `240`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/smirnoff-240)
    - **Wholesale Cost:** \$12.17 | **5% Margin Floor:** \$12.78
    - **ZYN Price:** \$13.99 (14% off ban raha tha \$12.03 jo cost se bhi kam tha!)
    - **Status:** Review Flagged (Tag: `Review-Needed-Price-Floor`)

20. **Blue Nun German White Wine**
    - **SKU:** `729`
    - **Store URL:** [View on Storefront](https://borderlinebottles.ca/products/blue-nun-german-white-wine-729)
    - **Wholesale Cost:** \$11.34 | **5% Margin Floor:** \$11.91
    - **ZYN Price:** \$12.99 (14% off gives \$11.17 < Floor \$11.91)
    - **Status:** Review Flagged (Tag: `Review-Needed-Price-Floor`)
