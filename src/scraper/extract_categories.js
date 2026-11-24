import axios from 'axios';

async function extractCategories() {
  const odataBase = 'https://appapi.liquorconnect.com/odata';
  const url = `${odataBase}/Products?$select=Category,SearchCategory,Type,SubType&$filter=IsDeleted eq false&$top=200`;

  console.log('Fetching sample categories from LiquorConnect OData API...');
  try {
    const res = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      timeout: 15000,
    });

    const searchCategories = new Set();
    const subCategories = new Set();

    res.data.value.forEach(item => {
      if (item.SearchCategory && item.SearchCategory.trim()) {
        searchCategories.add(item.SearchCategory.trim());
      }
      if (item.Category && item.Category.trim()) {
        subCategories.add(item.Category.trim());
      }
    });

    console.log('\n--- Main Search Categories ---');
    console.log(Array.from(searchCategories));

    console.log('\n--- Sample Detailed Categories ---');
    console.log(Array.from(subCategories).slice(0, 20));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

extractCategories();
