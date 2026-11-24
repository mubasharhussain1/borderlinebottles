import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { syncProductToShopify } from './sync_engine.js';

// Path to the wholesale sheet (the one you already have)
const CSV_PATH = path.resolve('F66074 (8).csv');

// Read and parse CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

// Helper: map CSV columns to the shape expected by syncProductToShopify
function mapRecordToLCItem(record) {
  // The syncEngine expects fields similar to LiquorConnect API response.
  // We'll map the most important ones:
  return {
    SKU: record.SKU?.trim(),
    Name: record.DESCRIPTION?.trim() || 'Unnamed Product',
    Supplier: record.AGENTID?.trim() || 'Borderline Bottles',
    Country: record.COUNTRY?.trim() || 'Imported',
    SearchCategory: record.CATALOGFLAG?.trim() || '',
    Category: record.CATEGORY?.trim() || '',
    Type: record.TYPE?.trim() || '',
    SubType: record.SUBTYPE?.trim() || '',
    PercentAlcohol: record.ALC?.trim() || null,
    Size: record.UNITSIZE?.trim() || null,
    UPC: record.UPC?.trim() || null,
    AlbertaMSRP: parseFloat(record.UNITWHOLESALE) || 0,
    IsDeleted: false // assume active; you can adjust if you have a flag
  };
}

(async () => {
  console.log('🔄 Starting sync from Excel sheet...');
  let processed = 0;
  for (const rec of records) {
    // Skip rows without a valid SKU or wholesale price
    if (!rec.SKU || !rec.UNITWHOLESALE || Number(rec.UNITWHOLESALE) <= 0) continue;
    const lcItem = mapRecordToLCItem(rec);
    try {
      await syncProductToShopify(lcItem);
      processed++;
    } catch (err) {
      console.error(`❌ Error syncing SKU ${lcItem.SKU}:`, err.message);
    }
    // Small delay to avoid hitting Shopify rate limits
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`✅ Finished. Processed ${processed} products from the sheet.`);
})();
