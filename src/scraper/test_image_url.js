import axios from 'axios';

async function testImages() {
  const skus = ['18', '34', '42', '67', '91'];

  for (const sku of skus) {
    const imgUrl = `https://connectstorageprd.blob.core.windows.net/productimages/${sku}.jpg`;
    try {
      const res = await axios.head(imgUrl);
      console.log(` SKU ${sku} Image: ${res.status} (${res.headers['content-type']}, ${res.headers['content-length']} bytes) -> ${imgUrl}`);
    } catch (err) {
      console.log(` SKU ${sku} Image not found: ${err.response ? err.response.status : err.message}`);
    }
  }
}

testImages();
