import axios from 'axios';
import * as cheerio from 'cheerio';

async function parseSitemapProducts() {
  try {
    const res = await axios.get('https://www.bswliquor.com/sitemap.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(res.data, { xmlMode: true });
    const productSitemaps = [];

    $('sitemap loc').each((_, el) => {
      const loc = $(el).text();
      if (loc.includes('sitemap_products')) {
        productSitemaps.push(loc);
      }
    });

    console.log('📌 Found Product Sitemaps:', productSitemaps);

    if (productSitemaps.length > 0) {
      console.log(`\nTesting first product sitemap: ${productSitemaps[0]}`);
      const pRes = await axios.get(productSitemaps[0], {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });
      const p$ = cheerio.load(pRes.data, { xmlMode: true });
      const urls = [];
      p$('url loc').slice(0, 5).each((_, el) => {
        urls.push(p$(el).text());
      });
      console.log('Sample Product URLs:', urls);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

parseSitemapProducts();
