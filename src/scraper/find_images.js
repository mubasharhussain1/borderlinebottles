import axios from 'axios';
import { config } from '../config.js';

async function findImagePatterns() {
  const url = `${config.scraper.liquorConnectBaseUrl}/dist/main.js?v=Au0PsP37MpAc_PDiwKDNLhHkWSRoajvZqBPHL4izu7o`;
  const res = await axios.get(url);
  const code = res.data;

  // Search for image URLs or blob storage references
  const matches = code.match(/https?:\/\/[^\s"'`]*(blob\.core\.windows\.net|images|products)[^\s"'`]*|\b(imageUrl|imageSrc|photo|thumbnail)[^,}]+/gi) || [];
  console.log('Image pattern matches:');
  console.log([...new Set(matches)].slice(0, 25));

  // Search for .jpg or .png templates
  const imgTemplates = code.match(/["'`][^"'`]*\.(jpg|png|jpeg)[^"'`]*["'`]/gi) || [];
  console.log('\nImage extensions/templates:');
  console.log([...new Set(imgTemplates)].slice(0, 25));
}

findImagePatterns();
