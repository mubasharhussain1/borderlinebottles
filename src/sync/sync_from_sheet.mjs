import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { syncProductToShopify } from './sync_engine.js';

const CSV_PATH = path.resolve('F66074 (8).csv');
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

function mapRecordToLCItem(record) {
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
    IsDeleted: false
  };
}

(async () => {
  console.log('🔄 Starting sync from Excel sheet...');
  let processed = 0;
  for (const rec of records) {
    if (!rec.SKU || !rec.UNITWHOLESALE || Number(rec.UNITWHOLESALE) <= 0) continue;
    const lcItem = mapRecordToLCItem(rec);
    try {
      await syncProductToShopify(lcItem);
      processed++;
    } catch (err) {
      console.error(`❌ Error syncing SKU ${lcItem.SKU}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`✅ Finished. Processed ${processed} products from the sheet.`);
})();
