import axios from 'axios';
import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = path.resolve('bsw_catalog.json');
const BASE_URL = 'https://www.bswliquor.com/collections/all/products.json';
const PAGE_LIMIT = 250;

let allProducts = [];
if (fs.existsSync(OUTPUT_FILE)) {
  try {
    allProducts = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`♻️ Resuming: ${allProducts.length} products already saved.`);
  } catch (e) {
    allProducts = [];
  }
}

let page = Math.floor(allProducts.length / PAGE_LIMIT) + 1;
let hasMore = true;

async function scrape() {
  console.log('====================================================');
  console.log(`🚀 BSW Scraper Starting from Page ${page}...`);
  console.log('====================================================');

  while (hasMore) {
    try {
      console.log(`📡 Fetching Page ${page}...`);
      const res = await axios.get(`${BASE_URL}?limit=${PAGE_LIMIT}&page=${page}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 45000
      });

      const products = res.data?.products || [];
      if (products.length === 0) {
        hasMore = false;
        break;
      }

      for (const p of products) {
        const variant = p.variants?.[0] || {};
        allProducts.push({
          id: p.id,
          title: p.title?.trim(),
          handle: p.handle,
          price: parseFloat(variant.price) || 0,
          compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
          sku: variant.sku?.trim() || '',
          barcode: variant.barcode?.trim() || '',
          weightGrams: variant.grams || 0,
          available: variant.available !== false,
          image: p.images?.[0]?.src || null
        });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2), 'utf8');
      console.log(`💾 Saved ${allProducts.length} products (Page ${page} done).`);
      page++;

      // 2s delay (Collection endpoint allows faster polling)
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      if (err.response?.status === 429) {
        console.warn(`⚠️ Rate limit (429) on Page ${page}. Backing off for 15s...`);
        await new Promise(r => setTimeout(r, 15000));
      } else {
        console.warn(`⚠️ Page ${page} error: ${err.message}. Retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  console.log(`✅ COMPLETE! Total saved: ${allProducts.length}`);
}

scrape();
