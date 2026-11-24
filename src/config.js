import dotenv from 'dotenv';
dotenv.config();

export const config = {
  shopify: {
    domain: process.env.SHOPIFY_STORE_DOMAIN || 'mubashar-liquor-test.myshopify.com',
    accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-10',
  },
  scraper: {
    userAgent: process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    delayMs: parseInt(process.env.SCRAPER_DELAY_MS || '1500', 10),
    liquorConnectBaseUrl: 'https://www.liquorconnect.com',
  },
  pricing: {
    discountPercentage: parseFloat(process.env.STORE_DISCOUNT_PERCENTAGE || '0'),
  },
  inventory: {
    defaultBuffer: parseInt(process.env.DEFAULT_INVENTORY_BUFFER || '50', 10),
    locationId: process.env.SHOPIFY_LOCATION_ID || 'gid://shopify/Location/92324233428',
  }
};
