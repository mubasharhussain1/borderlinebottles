import axios from 'axios';

async function testOdata() {
  const odataBase = 'https://appapi.liquorconnect.com/odata';
  const endpoints = [
    '',
    '/$metadata',
    '/Products',
    '/Items',
    '/ProductSearch',
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Checking: ${odataBase}${ep}`);
      const res = await axios.get(`${odataBase}${ep}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });
      console.log(`Status: ${res.status}`);
      if (typeof res.data === 'object') {
        console.log('Response keys/data:', JSON.stringify(res.data).slice(0, 300));
      } else {
        console.log('Response preview:', String(res.data).slice(0, 300));
      }
    } catch (err) {
      console.log(`Failed ${ep}: ${err.response ? err.response.status : err.message}`);
    }
  }
}

testOdata();
