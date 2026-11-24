import fs from 'fs';
import path from 'path';
import readline from 'readline';

const INPUT_CSV = path.resolve('All Products.csv');
const OUTPUT_CSV = path.resolve('shopify_all_products_import.csv');

console.log('🔄 Reading and converting All Products.csv line-by-line...');

const SHOPIFY_HEADERS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category',
  'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value',
  'Variant SKU', 'Variant Inventory Tracker', 'Variant Inventory Qty',
  'Variant Inventory Policy', 'Variant Fulfillment Service',
  'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode',
  'Image Src', 'Status'
];

function toHandle(title, sku) {
  const cleanTitle = (title || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${cleanTitle}-${sku}`;
}

function cleanCategory(searchCat, cat) {
  const s = (searchCat || '').toUpperCase();
  const c = (cat || '').toUpperCase();

  if (s === 'BEER' || c.includes('BEER')) return 'Beer';
  if (s === 'WINE' || c.includes('WINE')) {
    if (c.includes('RED')) return 'Red Wine';
    if (c.includes('WHITE')) return 'White Wine';
    if (c.includes('SPARKLING')) return 'Sparkling Wine';
    return 'Wine';
  }
  if (s === 'SPIRITS' || c.includes('SPIRITS')) {
    if (c.includes('WHISKY')) return 'Whisky';
    if (c.includes('VODKA')) return 'Vodka';
    if (c.includes('GIN')) return 'Gin';
    if (c.includes('TEQUILA')) return 'Tequila';
    if (c.includes('RUM')) return 'Rum';
    if (c.includes('LIQUEUR')) return 'Liqueur';
    return 'Spirits';
  }
  return 'Beverages';
}

const fileStream = fs.createReadStream(INPUT_CSV);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

const outStream = fs.createWriteStream(OUTPUT_CSV, { encoding: 'utf8' });
outStream.write(SHOPIFY_HEADERS.join(',') + '\n');

let validCount = 0;
let inStockCount = 0;
let isHeader = true;

const seenSkus = new Set();

for await (const line of rl) {
  if (isHeader) {
    isHeader = false;
    continue;
  }
  
  const trimmed = line.trim();
  if (!trimmed) continue;

  // Split CSV properly (simple split handles this well, but let's check length)
  const cols = trimmed.split(',');
  if (cols.length < 8) {
    // This is the second section of the portal export, skip non-standard lines
    continue;
  }

  const sku = cols[0].replace(/^\uFEFF/, '').trim();
  const title = cols[1]?.trim();
  const searchCat = cols[2]?.trim();
  const categoryRaw = cols[3]?.trim();
  const country = cols[4]?.trim() || 'Imported';
  const size = cols[5]?.trim() || '';
  const rawPrice = (cols[6] || '').replace(/[$,]/g, '').trim();
  const availability = (cols[8] || '').trim().toLowerCase();

  const unitPrice = parseFloat(rawPrice);

  if (!sku || isNaN(parseInt(sku)) || !title || isNaN(unitPrice) || unitPrice <= 0) {
    continue;
  }

  // Deduplicate SKUs
  if (seenSkus.has(sku)) continue;
  seenSkus.add(sku);

  const isInStock = availability.includes('in stock');
  const inventoryQty = isInStock ? '50' : '0';
  if (isInStock) inStockCount++;

  const handle = toHandle(title, sku);
  const category = cleanCategory(searchCat, categoryRaw);

  // 7% discount applied
  const salePrice = (unitPrice * 0.93).toFixed(2);
  const compareAtPrice = unitPrice.toFixed(2);

  const tags = [
    'LiquorConnect-Sync',
    category,
    country,
    size,
    isInStock ? 'In-Stock' : 'Out-of-Stock'
  ].filter(Boolean).join(', ');

  const imageUrl = `https://connectstorageprd.blob.core.windows.net/productimages/${sku}.jpg`;
  const body = `<ul><li><strong>SKU:</strong> ${sku}</li><li><strong>Category:</strong> ${category}</li><li><strong>Country:</strong> ${country}</li>${size ? `<li><strong>Size:</strong> ${size}</li>` : ''}</ul>`;

  const row = [
    handle,
    `"${title.replace(/"/g, '""')}"`,
    `"${body}"`,
    'Borderline Bottles',
    category,
    category,
    `"${tags}"`,
    'TRUE',
    'Title',
    'Default Title',
    sku,
    'shopify',
    inventoryQty,
    'deny',
    'manual',
    salePrice,
    compareAtPrice,
    'TRUE',
    'TRUE',
    '',
    imageUrl,
    'active'
  ].join(',');

  outStream.write(row + '\n');
  validCount++;
}

outStream.end();

console.log(`\n🎉 Conversion Completed Successfully!`);
console.log(`- Total Unique Products Processed: ${validCount}`);
console.log(`- In Stock (Inventory = 50): ${inStockCount}`);
console.log(`- Out of Stock (Inventory = 0): ${validCount - inStockCount}`);
console.log(`- File Saved at: ${OUTPUT_CSV}`);
