import axios from 'axios';

async function testSimpleSearch() {
  const query = 'Smirnoff';
  const url = `https://www.bswliquor.com/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`;
  
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      }
    });

    console.log('✅ Response Status:', res.status);
    const products = res.data?.resources?.results?.products || [];
    console.log(`Found ${products.length} products:`);
    if (products.length > 0) {
      console.log(JSON.stringify(products[0], null, 2));
    }
  } catch (err) {
    console.error('❌ Failed:', err.response?.status, err.message);
  }
}

testSimpleSearch();
