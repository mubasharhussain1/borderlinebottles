import axios from 'axios';

async function testOdataQuery() {
  const odataBase = 'https://appapi.liquorconnect.com/odata';
  const query = `${odataBase}/Products?$top=3`;

  console.log(`Querying: ${query}`);
  try {
    const res = await axios.get(query, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      timeout: 15000
    });

    console.log(`Status: ${res.status}`);
    console.log('Sample Product data:', JSON.stringify(res.data, null, 2).slice(0, 1500));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testOdataQuery();
