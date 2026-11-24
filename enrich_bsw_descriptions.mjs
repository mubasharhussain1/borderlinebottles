import axios from 'axios';
import fs from 'fs';
import path from 'path';

const CATALOG_PATH = path.resolve('bsw_catalog.json');
const STATE_FILE = path.resolve('bsw_enrich_state.json');

async function enrichBswWithResume() {
  console.log('====================================================');
  console.log('   🛡️ BSW Enrichment (Guaranteed Resume Index)');
  console.log('====================================================\n');

  if (!fs.existsSync(CATALOG_PATH)) {
    console.error('❌ bsw_catalog.json not found!');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const isArray = Array.isArray(raw);
  const items = isArray ? raw : Object.values(raw);

  // Read last processed index from state file
  let startIndex = 0;
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      startIndex = state.lastIndex || 0;
      console.log(`♻️ Resuming exactly from index [${startIndex}/${items.length}]...`);
    } catch (e) {
      startIndex = 0;
    }
  }

  // Rotating User-Agents to avoid Cloudflare bot detection
  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  let uaIndex = 0;

  // Delay: 5-9 seconds random between requests (human-like)
  const randomDelay = () => Math.floor(5000 + Math.random() * 4000);

  for (let i = startIndex; i < items.length; i++) {
    const item = items[i];
    const handle = item.handle;

    // If already has long description, skip instantly
    if (item.bodyHtml && item.bodyHtml.length > 50) {
      continue;
    }

    if (!handle) {
      saveProgress(i);
      continue;
    }

    const productUrl = `https://www.bswliquor.com/products/${handle}`;
    process.stdout.write(`[${i + 1}/${items.length}] Fetching "${handle}"... `);

    let success = false;
    let attempts = 0;
    let cooldown = 90000; // Start with 90 sec cooldown on first 429

    while (!success && attempts < 3) {
      attempts++;
      // Rotate user agent each attempt
      const ua = USER_AGENTS[uaIndex % USER_AGENTS.length];
      uaIndex++;

      try {
        // Use Shopify JSON API instead of HTML scraping — faster & less rate-limited
        const jsonUrl = `https://www.bswliquor.com/products/${handle}.json`;
        const res = await axios.get(jsonUrl, {
          headers: {
            'User-Agent': ua,
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 20000
        });

        const product = res.data?.product;
        if (!product) {
          console.log(`⚠️ Skipped (no product in JSON)`);
          break;
        }

        const desc = product.body_html || '';
        const tags = product.tags ? product.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

        item.bodyHtml = desc.trim();
        if (tags.length > 0) item.tags = tags;

        console.log(`✅ (Desc: ${item.bodyHtml.length} chars, Tags: ${tags.length})`);
        success = true;

      } catch (err) {
        if (err.response?.status === 429) {
          console.log(`\n⏳ 429 Rate Limit! Cooling down for ${cooldown/1000}s (attempt ${attempts}/3)...`);
          await new Promise(r => setTimeout(r, cooldown));
          cooldown = Math.min(cooldown * 1.5, 300000); // Increase: 90s → 135s → 202s, max 5min
        } else if (err.response?.status === 403) {
          console.log(`\n⏳ 403 Forbidden! Cooling down for 120 seconds...`);
          await new Promise(r => setTimeout(r, 120000));
        } else {
          console.log(`⚠️ Skipped (${err.message})`);
          break;
        }
      }
    }

    // Save exact position to state file after every item
    saveProgress(i + 1);

    // Save entire catalog to disk every 10 items
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(CATALOG_PATH, JSON.stringify(raw, null, 2), 'utf8');
    }

    // Human-like random delay — JSON API is lighter, 2-3s is enough
    const d = 2000 + Math.floor(Math.random() * 1000);
    await new Promise(r => setTimeout(r, d));
  }

  // Final save
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(raw, null, 2), 'utf8');
  console.log('\n====================================================');
  console.log(`🎉 BSW ENRICHMENT 100% COMPLETE!`);
  console.log('====================================================\n');

  function saveProgress(idx) {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastIndex: idx, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  }
}

enrichBswWithResume();
