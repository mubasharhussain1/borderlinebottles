import fs from 'fs';
import path from 'path';
import readline from 'readline';

const OLD_CSV = path.resolve('F66074 (8).csv');
const NEW_CSV = path.resolve('All Products.csv');

console.log('🔍 Comparing old sheet and new sheet...');

// 1. Read Old Sheet SKUs
const oldSkus = new Set();
const oldStream = readline.createInterface({
  input: fs.createReadStream(OLD_CSV),
  crlfDelay: Infinity
});

let isFirst = true;
for await (const line of oldStream) {
  if (isFirst) { isFirst = false; continue; }
  const cols = line.split(',');
  const sku = cols[1]?.trim(); // SKU is 2nd col in F66074
  if (sku) oldSkus.add(sku);
}

// 2. Read New Sheet SKUs
const newSkus = new Set();
const newStream = readline.createInterface({
  input: fs.createReadStream(NEW_CSV),
  crlfDelay: Infinity
});

isFirst = true;
for await (const line of newStream) {
  if (isFirst) { isFirst = false; continue; }
  const cols = line.split(',');
  if (cols.length < 8) continue;
  const sku = cols[0]?.replace(/^\uFEFF/, '').trim();
  if (sku && !isNaN(parseInt(sku))) newSkus.add(sku);
}

console.log(`- Old Sheet (F66074 (8).csv) Unique SKUs: ${oldSkus.size}`);
console.log(`- New Sheet (All Products.csv) Unique SKUs: ${newSkus.size}`);

// Overlap count
let common = 0;
for (const sku of oldSkus) {
  if (newSkus.has(sku)) common++;
}

console.log(`- Exact Matching SKUs between both sheets: ${common}`);
console.log(`- Match Percentage: ${((common / oldSkus.size) * 100).toFixed(2)}%`);
