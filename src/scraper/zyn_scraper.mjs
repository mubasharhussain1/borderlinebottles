import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * Zyn.ca Live Catalog Scraper & Extractor
 * Fetches all ~10,946 products with Prices, Weights, Images, Categories, and Descriptions.
 */

const OUTPUT_FILE = path.resolve('zyn_catalog.json');
const BASE_URL = 'https://zyn.ca/products.json';
const PAGE_LIMIT = 250; // Shopify's maximum limit per page

async function scrapeZynCatalog() {
  console.log('====================================================');
  console.log('   🚀 Starting Zyn.ca Catalog Scraper & Extractor');
  console.log('====================================================');

  // ✅ RESUME: Load existing products if file already exists
  let allProducts = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    allProducts = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`♻️  Resuming from existing file: ${allProducts.length} products already saved.`);
  }

  // Calculate which page to start from
  let page = Math.floor(allProducts.length / PAGE_LIMIT) + 1;
  console.log(`📌 Starting from Page ${page} (Product #${allProducts.length + 1})...\n`);

  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`📡 Fetching Page ${page} (Products ${allProducts.length + 1}+)...`);
      const response = await axios.get(`${BASE_URL}?limit=${PAGE_LIMIT}&page=${page}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 25000
      });

      const products = response.data?.products || [];

      if (products.length === 0) {
        hasMore = false;
        console.log(`🏁 No more products found. Finished at Page ${page - 1}.`);
        break;
      }

      for (const p of products) {
        // Extract main variant (price, sku, weight)
        const variant = p.variants?.[0] || {};
        
        // Extract all high-res image URLs
        const images = (p.images || []).map(img => img.src);

        allProducts.push({
          id: p.id,
          title: p.title?.trim(),
          handle: p.handle,
          productType: p.product_type?.trim(),
          vendor: p.vendor?.trim(),
          tags: p.tags,
          bodyHtml: p.body_html,
          sku: variant.sku?.trim() || '',
          barcode: variant.barcode?.trim() || '',
          price: parseFloat(variant.price) || 0,
          compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
          weightGrams: variant.grams || 0,
          weightUnit: variant.weight_unit || 'g',
          images: images,
          primaryImage: images[0] || null,
          publishedAt: p.published_at
        });
      }

      console.log(`✅ Page ${page} fetched (${products.length} items). Total so far: ${allProducts.length}`);
      page++;

      // Polite delay between requests – increased to avoid rate limit
      await new Promise(r => setTimeout(r, 5000));

    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.warn('⚠️ Rate limited by Zyn.ca. Waiting 30 seconds...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2), 'utf8');
        console.log(`💾 Progress saved: ${allProducts.length} products saved so far.`);
        await new Promise(r => setTimeout(r, 30000));
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.message.includes('socket hang up') || err.message.includes('connect')) {
        console.warn(`⚠️ Network error on Page ${page}: ${err.message}. Waiting 20 seconds and retrying...`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2), 'utf8');
        console.log(`💾 Progress saved: ${allProducts.length} products saved so far.`);
        await new Promise(r => setTimeout(r, 20000));
        // Don't increment page - retry same page
      } else {
        console.error(`❌ Fatal Error on Page ${page}:`, err.message);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2), 'utf8');
        console.log(`💾 Progress saved: ${allProducts.length} products saved before stopping.`);
        hasMore = false;
      }
    }
  }

  // Save extracted catalog to local JSON file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2), 'utf8');

  console.log('\n🎉 ================================================');
  console.log(`✅ SCRAPING COMPLETE!`);
  console.log(`- Total Products Extracted: ${allProducts.length}`);
  console.log(`- Saved File: ${OUTPUT_FILE}`);
  console.log('====================================================\n');
}

scrapeZynCatalog();
