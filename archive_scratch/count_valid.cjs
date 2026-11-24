const fs = require('fs');
const csv = require('csv-parse/lib/sync');

const file = 'C:/Users/mubashar/Desktop/ShopifySynq/F66074 (8).csv';
const content = fs.readFileSync(file, 'utf8');
const records = csv(content, { columns: true, skip_empty_lines: true });

const valid = records.filter(r => r.SKU && parseFloat(r.UNITWHOLESALE) > 0);
console.log('Valid rows (SKU + wholesale > 0):', valid.length);
