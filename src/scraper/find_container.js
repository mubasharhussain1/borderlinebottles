import axios from 'axios';
import { config } from '../config.js';

async function findContainer() {
  const url = `${config.scraper.liquorConnectBaseUrl}/dist/main.js?v=Au0PsP37MpAc_PDiwKDNLhHkWSRoajvZqBPHL4izu7o`;
  const res = await axios.get(url);
  const code = res.data;

  const matches = code.match(/PRODUCTCONTAINER\s*:\s*["'][^"']+["']/gi) || [];
  console.log('PRODUCTCONTAINER match:', matches);

  // Also search for STORAGEURL
  const storageMatches = code.match(/STORAGEURL\s*:\s*["'][^"']+["']/gi) || [];
  console.log('STORAGEURL match:', storageMatches);
}

findContainer();
