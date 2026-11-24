import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../config.js';

async function inspectRawHtml() {
  const headers = {
    'User-Agent': config.scraper.userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  try {
    const response = await axios.get(`${config.scraper.liquorConnectBaseUrl}/Products/Search`, { headers });
    const $ = cheerio.load(response.data);

    console.log('--- Scripts found on page ---');
    $('script').each((_, el) => {
      const src = $(el).attr('src');
      if (src) console.log('Script src:', src);
      else {
        const text = $(el).html();
        if (text && (text.includes('api') || text.includes('category') || text.includes('Search') || text.includes('products'))) {
          console.log('Inline script snippet:', text.slice(0, 300));
        }
      }
    });

    console.log('--- Form elements & Inputs ---');
    $('input, select, form').each((_, el) => {
      console.log('Tag:', el.tagName, 'Attributes:', el.attribs);
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspectRawHtml();
