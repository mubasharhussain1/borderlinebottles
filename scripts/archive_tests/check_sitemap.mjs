import axios from 'axios';

async function checkSitemap() {
  const res = await axios.get('https://www.bswliquor.com/sitemap.xml', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });
  console.log(res.data);
}

checkSitemap();
