import axios from 'axios';

async function checkActiveCount() {
  const odataBase = 'https://appapi.liquorconnect.com/odata';
  // Check active products
  const query = `${odataBase}/Products?$filter=IsDeleted eq false&$top=2`;

  console.log(`Querying active products: ${query}`);
  try {
    const res = await axios.get(query, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      timeout: 15000
    });

    console.log(`Status: ${res.status}`);
    console.log('Sample Active Product:', JSON.stringify(res.data.value[0], null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkActiveCount();
