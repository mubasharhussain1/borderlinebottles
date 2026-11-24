import axios from 'axios';

async function testEndpoints() {
  const urls = [
    'https://www.bswliquor.com/sitemap.xml',
    'https://www.bswliquor.com/sitemap_products_1.xml',
    'https://www.bswliquor.com/search/suggest.json?q=wine&resources[type]=product',
    'https://www.bswliquor.com/products.json?limit=1'
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        timeout: 10000
      });
      console.log(`✅ [${res.status}] ${url} -> Length: ${res.data.length || Object.keys(res.data).length}`);
    } catch (e) {
      console.log(`❌ [${e.response?.status || e.code}] ${url} -> ${e.message}`);
    }
  }
}

testEndpoints();
