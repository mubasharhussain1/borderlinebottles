import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { loadCompetitorIndices, syncProductToShopify, findShopifyProductBySku } from './src/sync/sync_engine.js';

const targetSkus = ['42', '91', '166', '67', '7617', '3558', '21097', '150659', '157277', '240'];

async function syncAndCheckSpecific10() {
  console.log('========================================================');
  console.log('   🚀 Syncing the 10 Specific Products to Shopify');
  console.log('========================================================\n');

  const { zynIndex, bswIndex } = loadCompetitorIndices();

  const csvText = fs.readFileSync('shopify_all_products_import.csv', 'utf8');
  const records = parse(csvText, { columns: true, skip_empty_lines: true });

  const selectedRecords = records.filter(r => targetSkus.includes((r['Variant SKU'] || '').trim()));

  console.log(`Found ${selectedRecords.length} records matching the target SKUs.\n`);

  for (const r of selectedRecords) {
    const sku = (r['Variant SKU'] || '').trim();
    const item = {
      SKU: sku,
      Name: r['Title']?.trim(),
      Cost: r['Variant Compare At Price']?.trim(),
      Size: '',
      AvailabilityDisplay: (r['Tags'] || '').includes('In-Stock') ? 'In Stock' : 'Out of Stock'
    };

    console.log(`▶️ Syncing SKU: ${sku} ("${item.Name}")...`);
    try {
      await syncProductToShopify(item, zynIndex, bswIndex);
    } catch (e) {
      console.error(`❌ Error on SKU ${sku}:`, e.message);
    }
    await new Promise(res => setTimeout(res, 1200));
  }

  console.log('\n========================================================');
  console.log('   🔍 Fetching Live Shopify Admin URLs & Details');
  console.log('========================================================\n');

  for (const sku of targetSkus) {
    const p = await findShopifyProductBySku(sku);
    if (p) {
      const prodNumId = p.id.split('/').pop();
      const variant = p.variants.nodes[0];
      const url = `https://admin.shopify.com/store/borderline-bottles/products/${prodNumId}`;
      console.log(`SKU: ${sku.padEnd(8)} | Price: $${(variant.price || '').padEnd(7)} | Compare-At: $${(variant.compareAtPrice || 'N/A').padEnd(7)} | URL: ${url}`);
    } else {
      console.log(`SKU: ${sku.padEnd(8)} | ❌ Product not found on Shopify store!`);
    }
  }
}

syncAndCheckSpecific10();
