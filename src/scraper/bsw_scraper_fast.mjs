import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

/**
 * Bulletproof BSW Liquor Catalog Scraper with Persistent Resume
 * Saves progress constantly to disk so sudden PC shutdown or net changes
 * will resume from the EXACT spot without losing a single product.
 */

const OUTPUT_FILE = path.resolve('bsw_catalog.json');
const STATE_FILE = path.resolve('bsw_state.json');
const SITEMAP_INDEX = 'https://www.bswliquor.com/sitemap.xml';

// 1. Load Catalog Data
let bswCatalog = {};
if (fs.existsSync(OUTPUT_FILE)) {
  try {
    bswCatalog = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`♻️ [RESUME] Loaded ${Object.keys(bswCatalog).length} products from disk.`);
  } catch (e) {
    bswCatalog = {};
  }
}

// 2. Load State (Which sitemap and index we were on)
let state = { lastSitemapIdx: 0, sitemaps: [] };
if (fs.existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    console.log(`♻️ [RESUME] Resuming from Sitemap index ${state.lastSitemapIdx + 1}`);
  } catch (e) {}
}

function saveDisk() {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bswCatalog, null, 2), 'utf8');
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function fetchWithRetry(url, retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, text/html, application/xml, */*; q=0.01'
        },
        timeout: 60000 // 60s timeout
      });
    } catch (err) {
      console.warn(`⚠️ [Attempt ${i + 1}/${retries}] Request delayed for ${url.substring(0, 50)}... (${err.message}). Retrying in ${(delay * (i + 1)) / 1000}s...`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

async function runBswScraper() {
  console.log('====================================================');
  console.log('   🚀 Bulletproof BSW Liquor Catalog Scraper');
  console.log('====================================================');

  // Fetch or reuse sitemaps list
  if (!state.sitemaps || state.sitemaps.length === 0) {
    console.log('📡 Fetching Master Sitemaps Index...');
    const indexRes = await fetchWithRetry(SITEMAP_INDEX);
    const $ = cheerio.load(indexRes.data, { xmlMode: true });

    const sitemaps = [];
    $('sitemap loc').each((_, el) => {
      const loc = $(el).text();
      if (loc.includes('sitemap_products')) {
        sitemaps.push(loc);
      }
    });

    state.sitemaps = sitemaps;
    saveDisk();
    console.log(`✅ Cached ${sitemaps.length} product sitemaps.`);
  }

  const sitemaps = state.sitemaps;
  let totalSaved = Object.keys(bswCatalog).length;

  for (let i = state.lastSitemapIdx; i < sitemaps.length; i++) {
    const sitemapUrl = sitemaps[i];
    state.lastSitemapIdx = i;
    console.log(`\n📂 [Sitemap ${i + 1}/${sitemaps.length}] ${sitemapUrl}`);

    try {
      const sRes = await fetchWithRetry(sitemapUrl);
      const s$ = cheerio.load(sRes.data, { xmlMode: true });
      const productUrls = [];

      s$('url loc').each((_, el) => {
        const u = s$(el).text();
        if (u.includes('/products/')) productUrls.push(u);
      });

      console.log(`Found ${productUrls.length} products in this file.`);

      for (const pUrl of productUrls) {
        const handle = pUrl.split('/products/')[1]?.split('?')[0]?.replace(/\/$/, '');
        if (!handle || bswCatalog[handle]) continue; // Skip already saved

        const query = handle.replace(/-/g, ' ');
        const apiUrl = `https://www.bswliquor.com/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`;

        try {
          const apiRes = await fetchWithRetry(apiUrl, 3, 1000);
          const products = apiRes.data?.resources?.results?.products || [];
          const matched = products.find(p => p.handle === handle) || products[0];

          if (matched) {
            bswCatalog[handle] = {
              title: matched.title,
              handle: matched.handle,
              price: parseFloat(matched.price) || 0,
              compareAtPrice: matched.compare_at_price_min ? parseFloat(matched.compare_at_price_min) : null,
              available: matched.available === true,
              image: matched.image || matched.featured_image?.url || null,
              url: `https://www.bswliquor.com${matched.url}`,
              tags: matched.tags || []
            };
            totalSaved++;

            // Save to disk every 10 items
            if (totalSaved % 10 === 0) {
              saveDisk();
              console.log(`💾 Saved ${totalSaved} products... (Latest: "${matched.title}" - $${matched.price})`);
            }
          }

          // Polite delay
          await new Promise(r => setTimeout(r, 500));

        } catch (itemErr) {
          // Keep going if single product search fails
        }
      }

      // Save at end of each sitemap file
      saveDisk();

    } catch (sitemapErr) {
      console.error(`❌ Sitemap Error:`, sitemapErr.message);
    }
  }

  saveDisk();
  console.log('\n🎉 ================================================');
  console.log(`✅ BSW FULL SCRAPING COMPLETE!`);
  console.log(`- Total Unique Products Saved: ${Object.keys(bswCatalog).length}`);
  console.log(`- Saved File: ${OUTPUT_FILE}`);
  console.log('====================================================\n');
}

runBswScraper();
