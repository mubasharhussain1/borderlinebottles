import axios from 'axios';
import { config } from '../config.js';

async function inspectApiCalls() {
  const url = `${config.scraper.liquorConnectBaseUrl}/dist/main.js?v=Au0PsP37MpAc_PDiwKDNLhHkWSRoajvZqBPHL4izu7o`;
  const res = await axios.get(url);
  const code = res.data;

  // Search for ajax / fetch / http calls
  const fetchMatches = code.match(/(\w+\.(get|post|ajax)\([^)]+\))/gi) || [];
  console.log(`Found ${fetchMatches.length} HTTP call occurrences:`);
  console.log(fetchMatches.slice(0, 15));

  // Search for URLs or endpoints
  const urlRegex = /https?:\/\/[^\s"'`]+|\/api\/[^\s"'`]+|\/Products\/[^\s"'`]+/gi;
  const urls = [...new Set(code.match(urlRegex) || [])];
  console.log('URLs/Endpoints found:', urls);
}

inspectApiCalls();
