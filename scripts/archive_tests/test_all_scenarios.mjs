import fs from 'fs';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import { config } from './src/config.js';
import { shopifyGraphQL } from './src/shopify/client.js';
import { buildCatalogIndex, matchProduct } from './src/matching/product_matcher.js';
import { calculatePrice } from './src/pricing/pricing_engine.js';

const store = config.shopify.domain;
const token = config.shopify.accessToken;

// ============================
// PART 1: Fix weight on SKU 288563 (find ALL variants)
// ============================
async function fixWeight288563() {
  console.log('='.repeat(60));
  console.log('PART 1: Finding ALL variants with SKU 288563');
  console.log('='.repeat(60));

  const query = `
    query FindBySku($q: String!) {
      products(first: 10, query: $q) {
        nodes {
          id
          title
          variants(first: 5) {
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

  const data = await shopifyGraphQL(query, { q: `sku:288563` });
  
  console.log(`\nFound ${data.products.nodes.length} products:\n`);
  
  for (const p of data.products.nodes) {
    for (const v of p.variants.nodes) {
      const numericVariantId = v.id.split('/').pop();
      const numericProductId = p.id.split('/').pop();
      const invId = v.inventoryItem?.id?.split('/').pop();
      
      console.log(`📦 "${p.title}"`);
      console.log(`   Product ID: ${numericProductId} | Variant ID: ${numericVariantId}`);
      console.log(`   SKU: ${v.sku} | Price: $${v.price} | Compare-at: $${v.compareAtPrice}`);
      console.log(`   Inventory Item: ${invId}`);
      
      // Set weight on EVERY variant with this SKU
      try {
        const res = await axios.put(
          `https://${store}/admin/api/2024-10/variants/${numericVariantId}.json`,
          { variant: { id: parseInt(numericVariantId), weight: 1.4, weight_unit: 'kg' } },
          { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
        );
        console.log(`   ✅ Weight set: ${res.data.variant.weight} ${res.data.variant.weight_unit}`);
      } catch (e) {
        console.log(`   ❌ Weight error: ${e.response?.data?.errors || e.message}`);
      }
      console.log('');
    }
  }
}

// ============================
// PART 2: Find products for ALL pricing scenarios
// ============================
async function findTestScenarios() {
  console.log('\n' + '='.repeat(60));
  console.log('PART 2: Pricing Scenario Test Products');
  console.log('='.repeat(60));

  // Load catalogs
  const zynRaw = JSON.parse(fs.readFileSync('zyn_catalog.json', 'utf8'));
  const zynIndex = buildCatalogIndex(zynRaw, 'zyn');
  
  let bswIndex = null;
  if (fs.existsSync('bsw_catalog.json')) {
    const bswRaw = JSON.parse(fs.readFileSync('bsw_catalog.json', 'utf8'));
    bswIndex = buildCatalogIndex(bswRaw, 'bsw');
  }

  // Load CSV
  const csvText = fs.readFileSync('shopify_all_products_import.csv', 'utf8');
  const records = parse(csvText, { columns: true, skip_empty_lines: true });

  // Only in-stock products with valid cost
  const inStockProducts = records.filter(r => {
    const tags = r['Tags'] || '';
    const cost = parseFloat((r['Variant Compare At Price'] || '0').replace(/[$,]/g, ''));
    return tags.includes('In-Stock') && cost > 0;
  });

  console.log(`\nTotal in-stock products: ${inStockProducts.length}`);
  console.log('Searching for products matching each pricing scenario...\n');

  // Scenarios we need:
  const scenarios = {
    'SCENARIO 1 - 14% discount (both competitors in stock, high margin)': null,
    'SCENARIO 2 - 10% discount (competitor in stock, medium margin)': null,
    'SCENARIO 3 - 5% discount (competitor in stock, tight margin)': null,
    'SCENARIO 4 - 27% markup (no competitors in stock)': null,
    'SCENARIO 5 - FLAG FOR REVIEW (below 5% profit floor)': null,
    'SCENARIO 6 - ZYN weight available': null,
  };

  let checked = 0;
  for (const r of inStockProducts) {
    if (checked > 2000) break; // Check first 2000
    checked++;

    const sku = (r['Variant SKU'] || '').trim();
    const title = (r['Title'] || '').trim();
    const cost = parseFloat((r['Variant Compare At Price'] || '0').replace(/[$,]/g, ''));
    const size = '';

    if (!sku || cost <= 0) continue;

    const matches = matchProduct({ sku, title, size }, zynIndex, bswIndex);
    const zynPrice = matches.zyn?.price || null;
    const zynInStock = matches.zyn ? matches.zyn.available : false;
    const bswPrice = matches.bsw?.price || null;
    const bswInStock = matches.bsw ? matches.bsw.available : false;
    const weightGrams = matches.zyn?.weightGrams || 0;

    const result = calculatePrice(cost, zynPrice, zynInStock, bswPrice, bswInStock);

    const entry = { sku, title, cost, zynPrice, zynInStock, bswPrice, bswInStock, weightGrams, result };

    // Categorize
    if (result.discountApplied === '14%' && !scenarios['SCENARIO 1 - 14% discount (both competitors in stock, high margin)']) {
      scenarios['SCENARIO 1 - 14% discount (both competitors in stock, high margin)'] = entry;
    }
    if (result.discountApplied === '10%' && !scenarios['SCENARIO 2 - 10% discount (competitor in stock, medium margin)']) {
      scenarios['SCENARIO 2 - 10% discount (competitor in stock, medium margin)'] = entry;
    }
    if (result.discountApplied === '5%' && !scenarios['SCENARIO 3 - 5% discount (competitor in stock, tight margin)']) {
      scenarios['SCENARIO 3 - 5% discount (competitor in stock, tight margin)'] = entry;
    }
    if (result.discountApplied === 'markup_27%' && !scenarios['SCENARIO 4 - 27% markup (no competitors in stock)']) {
      scenarios['SCENARIO 4 - 27% markup (no competitors in stock)'] = entry;
    }
    if (result.flagForReview && !scenarios['SCENARIO 5 - FLAG FOR REVIEW (below 5% profit floor)']) {
      scenarios['SCENARIO 5 - FLAG FOR REVIEW (below 5% profit floor)'] = entry;
    }
    if (weightGrams > 0 && !scenarios['SCENARIO 6 - ZYN weight available']) {
      scenarios['SCENARIO 6 - ZYN weight available'] = entry;
    }

    // Break early if all found
    if (Object.values(scenarios).every(v => v !== null)) break;
  }

  // Print results
  for (const [label, entry] of Object.entries(scenarios)) {
    console.log(`\n📋 ${label}`);
    if (!entry) {
      console.log('   ❌ No matching product found in first 2000');
      continue;
    }
    console.log(`   SKU: ${entry.sku} | "${entry.title}"`);
    console.log(`   LC Cost: $${entry.cost}`);
    console.log(`   ZYN: $${entry.zynPrice || 'N/A'} (${entry.zynInStock ? 'IN STOCK' : 'OOS'})`);
    console.log(`   BSW: $${entry.bswPrice || 'N/A'} (${entry.bswInStock ? 'IN STOCK' : 'OOS'})`);
    console.log(`   → Final Price: $${entry.result.finalPrice} [${entry.result.discountApplied || 'FLAGGED'}]`);
    console.log(`   → Reason: ${entry.result.reason}`);
    console.log(`   → Weight: ${entry.weightGrams > 0 ? (entry.weightGrams / 1000).toFixed(2) + ' kg (from ZYN)' : '1.4 kg (default)'}`);
    if (entry.result.flagForReview) console.log(`   🚩 FLAGGED FOR REVIEW`);
  }

  console.log('\n' + '='.repeat(60));
}

// Run both
await fixWeight288563();
await findTestScenarios();
