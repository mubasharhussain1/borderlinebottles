import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const INPUT_CSV = path.resolve('All Products.csv');
const OUTPUT_CSV = path.resolve('shopify_all_products_import.csv');

console.log('🔄 Reading All Products.csv from LiquorConnect portal...');
const content = fs.readFileSync(INPUT_CSV, 'utf8');
const records = parse(content, { columns: true, skip_empty_lines: true });

console.log(`Found ${records.length} records in total. Converting to Shopify format...`);

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

const rows = [SHOPIFY_HEADERS.join(',')];
let validCount = 0;
let inStockCount = 0;

for (const rec of records) {
  const sku = rec.qd_sku?.trim();
  const title = rec.QDDS40?.trim();
  const rawPrice = (rec.UnitPrice || '').replace(/[$,]/g, '').trim();
  const unitPrice = parseFloat(rawPrice);

  if (!sku || !title || isNaN(unitPrice) || unitPrice <= 0) {
    continue; // Skip invalid or zero price records
  }

  const availability = (rec.AvailabilityDisplay || '').trim().toLowerCase();
  const isInStock = availability.includes('in stock');
  const inventoryQty = isInStock ? '50' : '0';

  if (isInStock) inStockCount++;

  const handle = toHandle(title, sku);
  const category = cleanCategory(rec.SearchCategory, rec.Category);
  const country = rec.QD_CLD?.trim() || 'Imported';
  const size = rec.QD_ML?.trim() || '';

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

  rows.push(row);
  validCount++;
}

fs.writeFileSync(OUTPUT_CSV, rows.join('\n'), 'utf8');

console.log(`\n🎉 Conversion Completed Successfully!`);
console.log(`- Total Valid Products: ${validCount}`);
console.log(`- In Stock (Inventory = 50): ${inStockCount}`);
console.log(`- Out of Stock (Inventory = 0): ${validCount - inStockCount}`);
console.log(`- File Saved at: ${OUTPUT_CSV}`);
