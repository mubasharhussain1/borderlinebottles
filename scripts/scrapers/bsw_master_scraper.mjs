import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = path.resolve('bsw_catalog.json');
const SITEMAP_MASTER = 'https://www.bswliquor.com/sitemap.xml';

// Resume support
let bswCatalog = {};
if (fs.existsSync(OUTPUT_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      raw.forEach(i => { if (i.handle) bswCatalog[i.handle] = i; });
    } else {
      bswCatalog = raw;
    }
    console.log(`♻️ Resuming: ${Object.keys(bswCatalog).length} products already loaded.`);
  } catch (e) {
    bswCatalog = {};
  }
}

function saveDisk() {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bswCatalog, null, 2), 'utf8');
}

async function run() {
  console.log('====================================================');
  console.log('   🚀 BSW Working Master Scraper');
  console.log('====================================================');

  console.log('📡 Fetching Master Sitemaps with exact query parameters...');
  const res = await axios.get(SITEMAP_MASTER, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    timeout: 30000
  });

  const $ = cheerio.load(res.data, { xmlMode: true });
  const productSitemaps = [];

  $('sitemap loc').each((_, el) => {
    const loc = $(el).text();
    if (loc.includes('sitemap_products')) {
      productSitemaps.push(loc);
    }
  });

  console.log(`✅ Found ${productSitemaps.length} valid product sitemaps!`);

  let totalSaved = Object.keys(bswCatalog).length;

  for (let i = 0; i < productSitemaps.length; i++) {
    const sitemapUrl = productSitemaps[i];
    console.log(`\n📂 [Sitemap ${i + 1}/${productSitemaps.length}] Fetching products...`);

    try {
      const sRes = await axios.get(sitemapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        timeout: 30000
      });

      const s$ = cheerio.load(sRes.data, { xmlMode: true });
      const handles = [];

      s$('url loc').each((_, el) => {
        const u = s$(el).text();
        if (u.includes('/products/')) {
          const h = u.split('/products/')[1]?.split('?')[0]?.replace(/\/$/, '');
          if (h && !bswCatalog[h]) handles.push(h);
        }
      });

      console.log(`Found ${handles.length} new items in this file.`);

      for (const handle of handles) {
        const query = handle.replace(/-/g, ' ');
        const searchUrl = `https://www.bswliquor.com/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`;

        try {
          const apiRes = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/javascript, */*'
            },
            timeout: 10000
          });

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
              url: `https://www.bswliquor.com${matched.url}`
            };
            totalSaved++;

            if (totalSaved % 10 === 0) {
              saveDisk();
              console.log(`💾 Saved ${totalSaved} products... (Latest: "${matched.title}" - $${matched.price})`);
            }
          }

          // Polite delay
          await new Promise(r => setTimeout(r, 700));

        } catch (itemErr) {
          // ignore single item error and continue
        }
      }

      saveDisk();

    } catch (err) {
      console.warn(`⚠️ Error on sitemap ${i + 1}: ${err.message}. Retrying next...`);
    }
  }

  saveDisk();
  console.log(`\n🎉 COMPLETED! Total BSW products saved: ${Object.keys(bswCatalog).length}`);
}

run();
