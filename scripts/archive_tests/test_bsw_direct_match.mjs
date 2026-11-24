import axios from 'axios';
import fs from 'fs';
import readline from 'readline';

/**
 * Direct Matcher Test:
 * Takes product names directly from our local shopify_all_products_import.csv
 * and searches them on BSW's open search API.
 */

async function testDirectMatch() {
  const fileStream = fs.createReadStream('shopify_all_products_import.csv');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let count = 0;
  for await (const line of rl) {
    if (count === 0) { count++; continue; } // skip header
    if (count > 5) break;

    const cols = line.split(',');
    const title = cols[1]?.replace(/"/g, '');
    const sku = cols[10];

    if (!title) continue;

    console.log(`\n🔍 Searching BSW for [SKU: ${sku}]: "${title}"...`);
    const cleanQuery = title.replace(/\([^)]*\)/g, '').trim();
    const url = `https://www.bswliquor.com/search/suggest.json?q=${encodeURIComponent(cleanQuery)}&resources[type]=product`;

    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        },
        timeout: 10000
      });

      const products = res.data?.resources?.results?.products || [];
      if (products.length > 0) {
        console.log(`✅ MATCH FOUND: "${products[0].title}" | BSW Price: $${products[0].price} | Available: ${products[0].available}`);
      } else {
        console.log(`⚠️ Not found on BSW.`);
      }
    } catch (e) {
      console.log(`❌ Search failed:`, e.message);
    }

    count++;
    await new Promise(r => setTimeout(r, 1000));
  }
}

testDirectMatch();
