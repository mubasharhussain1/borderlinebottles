import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Exchange OAuth Authorization Code for Permanent Access Token
 */
export async function exchangeCode(code) {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  
  const domains = ['borderline-bottles.myshopify.com', 'av1tr9-2j.myshopify.com'];

  for (const domain of domains) {
    console.log(`\n⏳ Attempting exchange on domain: ${domain}...`);
    try {
      const response = await axios.post(`https://${domain}/admin/oauth/access_token`, {
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      const accessToken = response.data.access_token;
      console.log(`\n🎉🎉🎉 SUCCESS! Access Token Obtained!`);
      console.log(`Store Domain: ${domain}`);
      console.log(`Access Token: ${accessToken}`);

      // Update .env file automatically
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');

      envContent = envContent.replace(
        /SHOPIFY_STORE_DOMAIN=.*/,
        `SHOPIFY_STORE_DOMAIN=${domain}`
      );
      envContent = envContent.replace(
        /SHOPIFY_ADMIN_ACCESS_TOKEN=.*/,
        `SHOPIFY_ADMIN_ACCESS_TOKEN=${accessToken}`
      );

      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`\n💾 Saved to .env!`);
      return accessToken;
    } catch (err) {
      console.log(`❌ Failed on ${domain}: ${err.response?.status} - ${JSON.stringify(err.response?.data || err.message)}`);
    }
  }
}

if (process.argv[2]) {
  let input = process.argv[2];
  if (input.includes('code=')) {
    const match = input.match(/code=([^&]+)/);
    if (match) input = match[1];
  }
  exchangeCode(input.trim());
}
