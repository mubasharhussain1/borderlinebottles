import fs from 'fs';
import { buildCatalogIndex, matchProduct } from './src/matching/product_matcher.js';

console.log('Analyzing store catalog breakdown...');
const zynObj = JSON.parse(fs.readFileSync('zyn_catalog.json', 'utf8'));
const bswObj = JSON.parse(fs.readFileSync('bsw_catalog.json', 'utf8'));
const legacyMap = fs.existsSync('legacy_descriptions.json') ? JSON.parse(fs.readFileSync('legacy_descriptions.json', 'utf8')) : {};

const zynIndex = buildCatalogIndex(zynObj, 'zyn');
const bswIndex = buildCatalogIndex(bswObj, 'bsw');

const csvText = fs.readFileSync('shopify_all_products_import.csv', 'utf8');
const lines = csvText.split('\n');

let total = 0;
let zynOnly = 0;
let bswOnly = 0;
let bothMatched = 0;
let unlisted = 0;

let zynDescUsed = 0;
let bswDescUsed = 0;
let legacyDescUsed = 0;
let templateDescUsed = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;
  total++;

  const m = line.match(/^([^,]+),"([^"]+)",/);
  const skuMatch = line.match(/,(\d+),shopify,/);
  if (!skuMatch) continue;
  const sku = skuMatch[1];
  const title = m ? m[2] : '';

  const matches = matchProduct({ sku, title }, zynIndex, bswIndex);
  const hasZyn = !!matches.zyn;
  const hasBsw = !!matches.bsw;

  if (hasZyn && hasBsw) bothMatched++;
  else if (hasZyn) zynOnly++;
  else if (hasBsw) bswOnly++;
  else unlisted++;

  // Hierarchy
  if (matches.zyn?.candidate?.raw?.bodyHtml && matches.zyn.candidate.raw.bodyHtml.length > 50) {
    zynDescUsed++;
  } else if (matches.bsw?.candidate?.raw?.bodyHtml && matches.bsw.candidate.raw.bodyHtml.length > 50) {
    bswDescUsed++;
  } else if (legacyMap[sku] && legacyMap[sku].length > 50) {
    legacyDescUsed++;
  } else {
    templateDescUsed++;
  }
}

console.log('--- STORE BREAKDOWN RESULTS ---');
console.log('Total Products Analyzed:', total);
console.log('ZYN Total Matched:', zynOnly + bothMatched, '(ZYN Only:', zynOnly, ', Both:', bothMatched, ')');
console.log('BSW Total Matched:', bswOnly + bothMatched, '(BSW Only:', bswOnly, ')');
console.log('Total Competitor Matched:', zynOnly + bswOnly + bothMatched);
console.log('Unlisted (Neither ZYN nor BSW):', unlisted);
console.log('\n--- DESCRIPTION SOURCES BREAKDOWN ---');
console.log('1. ZYN Descriptions Used:', zynDescUsed);
console.log('2. BSW Descriptions Used:', bswDescUsed);
console.log('3. Legacy Archive Descriptions Used:', legacyDescUsed);
console.log('4. Branded Alberta Template Descriptions Used:', templateDescUsed);
