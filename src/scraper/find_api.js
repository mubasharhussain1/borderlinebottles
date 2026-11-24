import axios from 'axios';
import { config } from '../config.js';

async function findApiEndpoints() {
  const scripts = [
    '/dist/main.js?v=Au0PsP37MpAc_PDiwKDNLhHkWSRoajvZqBPHL4izu7o',
    '/dist/master.js?v=Aq82EHPiFDuta_6IeS1hycDDKWkrEYnVW6HtCB2nK3k'
  ];

  for (const scriptPath of scripts) {
    try {
      console.log(`Fetching ${scriptPath}...`);
      const res = await axios.get(`${config.scraper.liquorConnectBaseUrl}${scriptPath}`);
      const text = res.data;

      // Search for API calls
      const matches = text.match(/["'](\/(api|Products|Services|item)\/[^"']+)["']/gi) || [];
      const unique = [...new Set(matches)];
      console.log(`Found ${unique.length} endpoints in ${scriptPath}:`);
      console.log(unique.slice(0, 25));
    } catch (err) {
      console.error(err.message);
    }
  }
}

findApiEndpoints();
