import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const INPUT_CSV = path.resolve('F66074 (8).csv');
const OUTPUT_CSV = path.resolve('shopify_import.csv');

// Read and parse the wholesale sheet
const content = fs.readFileSync(INPUT_CSV, 'utf8');
const records = parse(content, { columns: true, skip_empty_lines: true });

// Shopify CSV headers
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

// Slugify title to handle
function toHandle(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Map category
function mapCategory(rec) {
  const heading = (rec.PRICELISTHEADING || '').toUpperCase();
  const sub = (rec.PRICELISTSUBHEADING || '').toUpperCase();
  if (heading.includes('WINE')) {
    if (sub.includes('RED')) return 'Red Wine';
    if (sub.includes('WHITE')) return 'White Wine';
    if (sub.includes('SPARKLING')) return 'Sparkling Wine';
    return 'Wine';
  }
  if (heading.includes('BEER')) return 'Beer';
  if (heading.includes('SPIRITS')) {
    if (sub.includes('WHISKY')) return 'Whisky';
    if (sub.includes('VODKA')) return 'Vodka';
    if (sub.includes('GIN')) return 'Gin';
    if (sub.includes('TEQUILA')) return 'Tequila';
    if (sub.includes('RUM')) return 'Rum';
    if (sub.includes('COGNAC') || sub.includes('BRANDY')) return 'Brandy';
    if (sub.includes('LIQUEUR')) return 'Liqueur';
    return 'Spirits';
  }
  return 'Beverages';
}

const rows = [SHOPIFY_HEADERS.join(',')];
let count = 0;

for (const rec of records) {
  const sku = rec.SKU?.trim();
  const wholesale = parseFloat(rec.UNITWHOLESALE);
  if (!sku || isNaN(wholesale) || wholesale <= 0) continue;

  const title = rec.DESCRIPTION?.trim() || 'Unknown Product';
  const handle = toHandle(title) + '-' + sku;
  const category = mapCategory(rec);
  const vendor = rec.AGENTID?.trim() || 'Borderline Bottles';
  const size = rec.UNITSIZE?.trim() ? `${rec.UNITSIZE.trim()}ml` : '';
  const upc = rec.UPC?.trim() || '';
  const vintage = rec.VINTAGE?.trim() || '';

  // 7% discount applied
  const salePrice = (wholesale * 0.93).toFixed(2);
  const compareAtPrice = wholesale.toFixed(2);

  // Tags
  const tags = [
    'LiquorConnect-Sync',
    category,
    size,
    vintage ? `Vintage-${vintage}` : '',
    rec.PRICELISTSUBHEADING?.trim() || ''
  ].filter(Boolean).join(', ');

  // Image URL from LiquorConnect
  const imageUrl = `https://connectstorageprd.blob.core.windows.net/productimages/${sku}.jpg`;

  // Build description
  const body = `<ul><li><strong>SKU:</strong> ${sku}</li><li><strong>Category:</strong> ${category}</li>${size ? `<li><strong>Size:</strong> ${size}</li>` : ''}${vintage ? `<li><strong>Vintage:</strong> ${vintage}</li>` : ''}</ul>`;

  // CSV row (wrap fields with quotes to handle commas)
  const row = [
    handle,
    `"${title.replace(/"/g, '""')}"`,
    `"${body}"`,
    vendor,
    category,
    category,
    `"${tags}"`,
    'TRUE',
    'Title',
    'Default Title',
    sku,
    'shopify',
    '50',
    'deny',
    'manual',
    salePrice,
    compareAtPrice,
    'TRUE',
    'TRUE',
    upc,
    imageUrl,
    'active'
  ].join(',');

  rows.push(row);
  count++;
}

fs.writeFileSync(OUTPUT_CSV, rows.join('\n'), 'utf8');
console.log(`✅ Done! Converted ${count} products to Shopify CSV format.`);
console.log(`📁 Output file: ${OUTPUT_CSV}`);
