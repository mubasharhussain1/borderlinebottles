import { shopifyGraphQL } from './client.js';

async function checkMedia() {
  const query = `
    query {
      products(first: 25) {
        nodes {
          id
          title
          media(first: 1) {
            nodes {
              ... on MediaImage {
                image {
                  url
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query);
  console.log(`Total Products in Store: ${data.products.nodes.length}`);
  let withImages = 0;
  data.products.nodes.forEach((p, idx) => {
    const hasImg = p.media.nodes.length > 0;
    if (hasImg) withImages++;
    console.log(`${idx + 1}. "${p.title}" -> ${hasImg ? ' Has Image' : '❌ No Image'}`);
  });
  console.log(`\nSummary: ${withImages} of ${data.products.nodes.length} products have images!`);
}

checkMedia();
