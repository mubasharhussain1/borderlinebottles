import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = path.resolve('bsw_catalog.json');

// Exact sitemaps list (no need to fetch sitemap.xml anymore!)
const SITEMAPS = [];
for (let i = 1; i <= 66; i++) {
  SITEMAPS.push(`https://www.bswliquor.com/sitemap_products_${i}.xml`);
}

let bswCatalog = {};
if (fs.existsSync(OUTPUT_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      raw.forEach(item => { if (item.handle) bswCatalog[item.handle] = item; });
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
  console.log(`🚀 BSW Direct Sitemap Scraper (Total ${SITEMAPS.length} sitemaps)`);
  console.log('====================================================');

  let totalSaved = Object.keys(bswCatalog).length;

  for (let i = 0; i < SITEMAPS.length; i++) {
    const url = SITEMAPS[i];
    console.log(`\n📂 [Sitemap ${i + 1}/${SITEMAPS.length}] Fetching: ${url}...`);

    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/xml, text/xml, */*'
        },
        timeout: 25000
      });

      const $ = cheerio.load(res.data, { xmlMode: true });
      const handles = [];

      $('url loc').each((_, el) => {
        const loc = $(el).text();
        if (loc.includes('/products/')) {
          const h = loc.split('/products/')[1]?.split('?')[0]?.replace(/\/$/, '');
          if (h && !bswCatalog[h]) handles.push(h);
        }
      });

      console.log(`Found ${handles.length} new products in this sitemap.`);

      for (const handle of handles) {
        const query = handle.replace(/-/g, ' ');
        const searchUrl = `https://www.bswliquor.com/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`;

        try {
          const sRes = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/javascript, */*'
            },
            timeout: 10000
          });

          const products = sRes.data?.resources?.results?.products || [];
          const matched = products.find(p => p.handle === handle) || products[0];

          if (matched) {
            bswCatalog[handle] = {
              title: matched.title,
              handle: matched.handle,
              price: parseFloat(matched.price) || 0,
              compareAtPrice: matched.compare_at_price_min ? parseFloat(matched.compare_at_price_min) : null,
              available: matched.available === true,
              image: matched.image || matched.featured_image?.url || null
            };
            totalSaved++;

            if (totalSaved % 10 === 0) {
              saveDisk();
              console.log(`💾 Saved ${totalSaved} products... (Latest: "${matched.title}" - $${matched.price})`);
            }
          }

          await new Promise(r => setTimeout(r, 600));

        } catch (itemErr) {
          // Skip single item failure
        }
      }

      saveDisk();

    } catch (err) {
      console.warn(`⚠️ Error on sitemap ${i + 1}: ${err.message}. Moving to next sitemap...`);
    }
  }

  saveDisk();
  console.log(`\n🎉 COMPLETED! Total BSW products saved: ${Object.keys(bswCatalog).length}`);
}

run();
