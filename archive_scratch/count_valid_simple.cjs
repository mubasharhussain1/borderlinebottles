const fs = require('fs');
const path = 'C:/Users/mubashar/Desktop/ShopifySynq/F66074 (8).csv';
const data = fs.readFileSync(path, 'utf8');
const lines = data.split(/\r?\n/).filter(l => l.trim() !== '');
// first line is header
const header = lines[0].split(',');
const skuIdx = header.indexOf('SKU');
const wholesaleIdx = header.indexOf('UNITWHOLESALE');
let validCount = 0;
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  const sku = cols[skuIdx];
  const wholesale = parseFloat(cols[wholesaleIdx]);
  if (sku && sku.trim() !== '' && !isNaN(wholesale) && wholesale > 0) {
    validCount++;
  }
}
console.log('Valid rows (SKU + wholesale > 0):', validCount);
