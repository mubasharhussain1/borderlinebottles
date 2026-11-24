import fs from 'fs';
import { buildCatalogIndex, matchProduct, normalizeSize } from './src/matching/product_matcher.js';

console.log('🧪 Testing Product Matcher (TASK-04)...');

// 1. Load catalogs
const zynRaw = JSON.parse(fs.readFileSync('zyn_catalog.json', 'utf8'));
const bswRaw = fs.existsSync('bsw_catalog.json') ? JSON.parse(fs.readFileSync('bsw_catalog.json', 'utf8')) : [];

console.log(`Indexing ${zynRaw.length} ZYN items...`);
const zynIndex = buildCatalogIndex(zynRaw, 'zyn');

console.log(`Indexing ${Array.isArray(bswRaw) ? bswRaw.length : Object.keys(bswRaw).length} BSW items...`);
const bswIndex = buildCatalogIndex(bswRaw, 'bsw');

// Test Case 1: Exact SKU Match (Dom Perignon SKU: 131717)
const test1 = { sku: '131717', title: 'Dom Perignon P2 2005', size: '750ml' };
const res1 = matchProduct(test1, zynIndex, bswIndex);
console.log('\n[Test 1: Exact SKU Match]');
console.log('Result:', res1.zyn?.matched ? `Matched by ${res1.zyn.matchedBy} - Price: $${res1.zyn.price}` : 'Failed');

// Test Case 2: Size Mismatch Rejection (Same SKU, but 1.5L vs 750ml)
const test2 = { sku: '131717', title: 'Dom Perignon P2 2005', size: '1.5L' };
const res2 = matchProduct(test2, zynIndex, bswIndex);
console.log('\n[Test 2: Size Mismatch Rejection]');
console.log('Result:', res2.zyn === null ? 'Correctly REJECTED (Size Mismatch)' : 'Accepted (Check)');

// Test Case 3: Dry Creek Chenin Blanc (SKU: 281253)
const test3 = { sku: '281253', title: 'Dry Creek Chenin Blanc', size: '750ml' };
const res3 = matchProduct(test3, zynIndex, bswIndex);
console.log('\n[Test 3: Valid Product Match]');
console.log('Result:', res3.zyn?.matched ? `Matched: Price $${res3.zyn.price}, Weight: ${res3.zyn.weightGrams}g` : 'Failed');

// Test Case 4: Fuzzy Title Match + Review Flag
const test4 = { sku: '999999999', title: 'Los Siete Misterios Ensamble', size: '750ml' };
const res4 = matchProduct(test4, zynIndex, bswIndex);
console.log('\n[Test 4: Fuzzy Match Flag For Review]');
console.log('Flagged for review:', res4.zyn?.flagForReview === true ? 'YES (flagged)' : 'NO');

console.log('\n✅ TASK-04 Test Completed!');
