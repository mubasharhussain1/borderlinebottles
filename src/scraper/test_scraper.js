import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../config.js';

/**
 * Basic inspection script to fetch and inspect categories from LiquorConnect
 */
async function inspectLiquorConnect() {
  console.log('--- Phase 1: LiquorConnect Inspection ---');
  console.log(`Connecting to: ${config.scraper.liquorConnectBaseUrl}...`);

  const headers = {
    'User-Agent': config.scraper.userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  try {
    const searchUrl = `${config.scraper.liquorConnectBaseUrl}/Products/Search`;
    console.log(`Requesting URL: ${searchUrl}`);

    const response = await axios.get(searchUrl, { headers, timeout: 15000 });
    console.log(`HTTP Status: ${response.status}`);

    const $ = cheerio.load(response.data);
    const pageTitle = $('title').text().trim();
    console.log(`Page Title: "${pageTitle}"`);

    // Look for category links / navigation items
    const categories = [];
    $('a[href*="/Products/Search"], .category-item, select[name*="Category"] option, .nav-item').each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href') || $(el).attr('value');
      if (text && text.length > 2 && text.length < 40 && !categories.some(c => c.name === text)) {
        categories.push({ name: text, href });
      }
    });

    console.log(`Found ${categories.length} potential category/filter items on page.`);
    if (categories.length > 0) {
      console.log('Sample items:', categories.slice(0, 15));
    }

  } catch (error) {
    console.error(' Scraper inspection error:', error.message);
  }
}

inspectLiquorConnect();
