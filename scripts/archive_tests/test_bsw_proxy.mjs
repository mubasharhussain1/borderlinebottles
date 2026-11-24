import axios from 'axios';

async function testViaProxy() {
  const targetUrl = 'https://www.bswliquor.com/search/suggest.json?q=Smirnoff&resources[type]=product';
  
  // Public CORS & Web Proxies that route through US/Canada
  const proxyEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
  ];

  for (const proxyUrl of proxyEndpoints) {
    console.log(`\nTesting proxy: ${proxyUrl.substring(0, 40)}...`);
    try {
      const res = await axios.get(proxyUrl, { timeout: 15000 });
      console.log('✅ PROXY SUCCESS! Status:', res.status);
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      const products = data?.resources?.results?.products || [];
      console.log(`Found ${products.length} products! (Sample: "${products[0]?.title}" - $${products[0]?.price})`);
      return;
    } catch (e) {
      console.log('❌ Proxy failed:', e.message);
    }
  }
}

testViaProxy();
