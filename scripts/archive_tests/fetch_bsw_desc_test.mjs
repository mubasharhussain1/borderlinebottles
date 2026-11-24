import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFetchBswHtml() {
  const url = 'https://www.bswliquor.com/products/captain-morgan-dark-rum';
  console.log(`Fetching live HTML from: ${url}...`);

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });

    console.log(`✅ Page Fetched! Status: ${res.status}`);
    const $ = cheerio.load(res.data);

    // Common Shopify description selectors
    let desc = $('.product__description').html() || 
               $('.product-single__description').html() || 
               $('[data-product-description]').html() ||
               $('.rte').html() || 
               $('div[itemprop="description"]').html();

    if (!desc) {
      // Find text near "About"
      $('h2, h3, div, p').each((_, el) => {
        const t = $(el).text();
        if (t.includes('About the') || t.includes('Tasting Notes')) {
          desc = $(el).parent().html();
          return false;
        }
      });
    }

    console.log('\n📄 Extracted Description (Length: ' + (desc ? desc.length : 0) + '):');
    console.log(desc ? desc.substring(0, 300) + '...' : '❌ Description not found');
  } catch (e) {
    console.error('Fetch Error:', e.message);
  }
}

testFetchBswHtml();
