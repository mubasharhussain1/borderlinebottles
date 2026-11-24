import axios from 'axios';

async function testProductJson() {
  const url = 'https://www.bswliquor.com/products/johnnie-walker-red-label-2.js';
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    console.log('✅ BSW Product JS API is OPEN!');
    console.log('Title:', res.data.title);
    console.log('Price:', res.data.price / 100);
    console.log('CompareAt:', res.data.compare_at_price ? res.data.compare_at_price / 100 : null);
    console.log('SKU:', res.data.variants?.[0]?.sku);
    console.log('Weight (grams):', res.data.variants?.[0]?.grams);
    console.log('Available:', res.data.available);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }
}

testProductJson();
