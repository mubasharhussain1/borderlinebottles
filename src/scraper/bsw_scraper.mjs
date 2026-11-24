import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

/**
 * BSW Liquor Scraper
 * First tries Shopify products.json endpoint, then falls back to HTML scraping.
 */

const OUTPUT_FILE = path.resolve('bsw_catalog.json');
const BSW_BASE = 'https://www.bswliquor.com';
const PAGE_LIMIT = 250;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-CA,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
};

// ✅ RESUME: Load existing products if file already exists
let allProducts = [];
if (fs.existsSync(OUTPUT_FILE)) {
  allProducts = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  console.log(`♻️  Resuming: ${allProducts.length} products already saved.`);
}

// ─────────────────────────────────────────
// STRATEGY 1: Try Shopify products.json API
// ─────────────────────────────────────────
async function tryShopifyAPI() {
  console.log('\n🔍 Testing if BSW Liquor is a Shopify store...');
  try {
    const res = await axios.get(`${BSW_BASE}/products.json?limit=5`, {
      headers: HEADERS,
      timeout: 15000
    });

    if (res.data?.products?.length > 0) {
      console.log('✅ BSW Liquor is a Shopify store! Using products.json API...\n');
      return true;
    }
  } catch (err) {
    console.log('❌ Not a Shopify store or products.json blocked. Switching to HTML scraper...\n');
  }
  return false;
}

// ─────────────────────────────────────────
// STRATEGY 2: Shopify products.json Scraper
// ─────────────────────────────────────────
async function scrapeViaShopifyAPI() {
  let page = Math.floor(allProducts.length / PAGE_LIMIT) + 1;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`📡 Fetching Page ${page} (Products ${allProducts.length + 1}+)...`);
      const res = await axios.get(`${BSW_BASE}/products.json?limit=${PAGE_LIMIT}&page=${page}`, {
        headers: HEADERS,
        timeout: 20000
      });

      const products = res.data?.products || [];
      if (products.length === 0) {
        hasMore = false;
        break;
      }

      for (const p of products) {
        const variant = p.variants?.[0] || {};
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
          images: images,
          primaryImage: images[0] || null,
          source: 'bsw',
          inStock: variant.inventory_management ? (variant.inventory_quantity > 0) : true
        });
      }

      console.log(`✅ Page ${page} done (${products.length} items). Total: ${allProducts.length}`);
      saveProgress();
      page++;
      await new Promise(r => setTimeout(r, 4000)); // 4 sec delay

    } catch (err) {
      if (err.response?.status === 429) {
        console.warn('⚠️ Rate limited. Waiting 30 seconds...');
        saveProgress();
        await new Promise(r => setTimeout(r, 30000));
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.message.includes('socket hang up')) {
        console.warn(`⚠️ Network error: ${err.message}. Retrying in 15 seconds...`);
        saveProgress();
        await new Promise(r => setTimeout(r, 15000));
      } else {
        console.error(`❌ Fatal error: ${err.message}`);
        saveProgress();
        hasMore = false;
      }
    }
  }
}

// ─────────────────────────────────────────
// STRATEGY 3: HTML Scraper (Fallback)
// ─────────────────────────────────────────
async function scrapeViaHTML() {
  const collectionsToScrape = [
    '/collections/all',
    '/collections/wine',
    '/collections/spirits',
    '/collections/beer',
  ];

  console.log('🌐 Starting HTML scraper on BSW collections...\n');

  for (const collection of collectionsToScrape) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const url = `${BSW_BASE}${collection}?page=${page}`;
        console.log(`📄 Scraping: ${url}`);

        const res = await axios.get(url, {
          headers: { ...HEADERS, Accept: 'text/html' },
          timeout: 20000
        });

        const $ = cheerio.load(res.data);
        const productCards = [];

        // Common Shopify theme product card selectors
        $('.product-card, .grid__item, [data-product-id], .product-item').each((_, el) => {
          const title = $(el).find('.product-card__title, .product__title, h2, h3').first().text().trim();
          const priceText = $(el).find('.price, .product-price, .price__regular').first().text().trim().replace(/[^0-9.]/g, '');
          const price = parseFloat(priceText) || 0;
          const img = $(el).find('img').first().attr('src') || '';
          const href = $(el).find('a').first().attr('href') || '';
          const sku = $(el).attr('data-product-id') || '';

          if (title && price > 0) {
            productCards.push({
              title,
              price,
              primaryImage: img.startsWith('//') ? `https:${img}` : img,
              url: href ? `${BSW_BASE}${href}` : '',
              sku,
              source: 'bsw',
              inStock: !$(el).find('.sold-out, .badge--sold-out').length
            });
          }
        });

        if (productCards.length === 0) {
          hasMore = false;
          console.log(`📭 No more products in ${collection}.`);
          break;
        }

        allProducts.push(...productCards);
        console.log(`✅ Page ${page}: Found ${productCards.length} products. Total: ${allProducts.length}`);
        saveProgress();
        page++;
        await new Promise(r => setTimeout(r, 4000));

      } catch (err) {
        console.error(`❌ Error on ${collection} Page ${page}: ${err.message}`);
        saveProgress();
        hasMore = false;
      }
    }
  }
}

// Save progress to file
function saveProgress() {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2), 'utf8');
  console.log(`💾 Progress saved: ${allProducts.length} products.`);
}

// ─────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────
async function main() {
  console.log('====================================================');
  console.log('   🚀 Starting BSW Liquor Catalog Scraper');
  console.log('====================================================');

  const isShopify = await tryShopifyAPI();

  if (isShopify) {
    await scrapeViaShopifyAPI();
  } else {
    await scrapeViaHTML();
  }

  console.log('\n🎉 ================================================');
  console.log(`✅ BSW SCRAPING COMPLETE!`);
  console.log(`- Total Products Extracted: ${allProducts.length}`);
  console.log(`- Saved File: ${OUTPUT_FILE}`);
  console.log('====================================================\n');
}

main();
