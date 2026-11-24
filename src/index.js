import { config } from './config.js';

console.log('====================================================');
console.log('   ShopifySynq: LiquorConnect to Shopify Sync Engine');
console.log('====================================================');
console.log(`Target Store : ${config.shopify.domain}`);
console.log(`API Version  : ${config.shopify.apiVersion}`);
console.log(`Source Portal: ${config.scraper.liquorConnectBaseUrl}`);
console.log('----------------------------------------------------');
console.log('Run "npm run scraper:test" to test LiquorConnect crawler.');
console.log('Run "npm run shopify:test" to verify Shopify credentials.');
console.log('====================================================');
