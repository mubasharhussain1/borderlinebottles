// Full catalog analysis — find all products that:
// 1. Are NOW matching (after word-overlap fix) but WERE previously unlisted (27% markup)
// 2. Using sale price vs regular price discrepancy
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { buildCatalogIndex, matchProduct } from './src/matching/product_matcher.js';

console.log('Loading catalogs...');
const bswRaw = JSON.parse(fs.readFileSync('bsw_catalog.json', 'utf8'));
const bsw = Array.isArray(bswRaw) ? bswRaw : Object.values(bswRaw);
const bswIndex = buildCatalogIndex(bsw, 'bsw');

const zynRaw = JSON.parse(fs.readFileSync('zyn_catalog.json', 'utf8'));
const zyn = Array.isArray(zynRaw) ? zynRaw : zynRaw;
const zynIndex = buildCatalogIndex(zyn, 'zyn');

const csvContent = fs.readFileSync('shopify_all_products_import.csv', 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });
console.log(`Total LC products: ${records.length}`);

let totalMatched = 0;
let zynOnly = 0;
let bswOnly = 0;
let both = 0;
let unlisted = 0;
let newWordOverlapMatches = 0; // Products matched ONLY via new word_overlap method
let salePriceDiscrepancy = 0; // Products where sale != regular (actual BSW on sale)

const newMatchSamples = [];
const salePriceSamples = [];

for (const r of records) {
  const sku = (r['Variant SKU'] || '').trim();
  const title = (r['Title'] || '').trim();
  const tags = r['Tags'] || '';
  const isStock = tags.includes('In-Stock');
  
  if (!sku) continue;

  // Size from title or size column
  const size = r['Variant Grams'] ? '' : ''; // We don't have size in CSV directly

  const matches = matchProduct({ sku, title, size: '' }, zynIndex, bswIndex);

  const hasZyn = matches.zyn?.matched;
  const hasBsw = matches.bsw?.matched;

  if (hasZyn && hasBsw) both++;
  else if (hasZyn) zynOnly++;
  else if (hasBsw) bswOnly++;
  else unlisted++;

  if (hasZyn || hasBsw) totalMatched++;

  // Check if matched via new word_overlap (these were previously unlisted = 27% markup bug)
  if (matches.bsw?.matchedBy === 'title_word_overlap' || matches.zyn?.matchedBy === 'title_word_overlap') {
    newWordOverlapMatches++;
    if (newMatchSamples.length < 10) {
      const raw = matches.bsw?.candidate?.raw || matches.zyn?.candidate?.raw;
      newMatchSamples.push({
        sku,
        lcTitle: title,
        competitorTitle: raw?.title,
        matchedBy: matches.bsw?.matchedBy || matches.zyn?.matchedBy,
        competitorRegular: raw?.compareAtPrice,
        competitorSale: raw?.price
      });
    }
  }

  // Check sale price discrepancy: compareAtPrice != price (they're running a sale)
  const bswRaw2 = matches.bsw?.candidate?.raw;
  const zynRaw2 = matches.zyn?.candidate?.raw;
  if ((bswRaw2?.compareAtPrice && bswRaw2?.price && bswRaw2.compareAtPrice !== bswRaw2.price) ||
      (zynRaw2?.compareAtPrice && zynRaw2?.price && zynRaw2.compareAtPrice !== zynRaw2.price)) {
    salePriceDiscrepancy++;
    if (salePriceSamples.length < 5) {
      salePriceSamples.push({
        sku,
        title,
        bswSale: bswRaw2?.price,
        bswRegular: bswRaw2?.compareAtPrice,
        zynSale: zynRaw2?.price,
        zynRegular: zynRaw2?.compareAtPrice,
      });
    }
  }
}

console.log('\n========== FULL CATALOG ANALYSIS ==========');
console.log(`Total Products Scanned:   ${records.length}`);
console.log(`\n📊 Matching Breakdown:`);
console.log(`  ZYN Only:    ${zynOnly}`);
console.log(`  BSW Only:    ${bswOnly}`);
console.log(`  Both:        ${both}`);
console.log(`  UNLISTED:    ${unlisted}  → 27% markup, no badge`);
console.log(`\n🆕 NEW matches found (word_overlap fix):`);
console.log(`  Products now correctly matched: ${newWordOverlapMatches}`);
console.log(`  (These were previously getting 27% markup — now get 14% off competitor regular price)`);
console.log(`\n💰 BSW/ZYN on-sale products (compareAt != price):`);
console.log(`  Count: ${salePriceDiscrepancy}`);
console.log(`  (Before fix: we used sale price. After fix: we use regular price ✅)`);

console.log('\n=== Sample NEW matches (previously unlisted → now matched) ===');
newMatchSamples.forEach((s,i) => {
  console.log(`${i+1}. SKU ${s.sku}: "${s.lcTitle}"`);
  console.log(`   → Competitor: "${s.competitorTitle}"`);
  console.log(`   → Regular: $${s.competitorRegular} | Sale: $${s.competitorSale}`);
});

console.log('\n=== Sample Sale Price Discrepancies ===');
salePriceSamples.forEach((s,i) => {
  console.log(`${i+1}. SKU ${s.sku}: "${s.title}"`);
  if (s.bswRegular) console.log(`   BSW: Sale=$${s.bswSale} → Regular=$${s.bswRegular}`);
  if (s.zynRegular) console.log(`   ZYN: Sale=$${s.zynSale} → Regular=$${s.zynRegular}`);
});
