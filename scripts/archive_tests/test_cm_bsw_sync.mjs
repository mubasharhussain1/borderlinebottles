import { loadCompetitorIndices, syncProductToShopify, findShopifyProductBySku } from './src/sync/sync_engine.js';
import { shopifyGraphQL } from './src/shopify/client.js';

async function testSyncCaptainMorganLive() {
  console.log('====================================================');
  console.log('   🧪 Live Test: Syncing Captain Morgan with BSW Data');
  console.log('====================================================\n');

  const { zynIndex, bswIndex } = loadCompetitorIndices();

  const item = {
    SKU: '2196',
    Name: 'Captain Morgan Dark Rum',
    Cost: '22.68',
    Size: '750ml',
    AvailabilityDisplay: 'In Stock'
  };

  console.log(`▶️ Processing SKU: ${item.SKU} ("${item.Name}")...`);
  const res = await syncProductToShopify(item, zynIndex, bswIndex);
  console.log('Sync result product ID:', res ? res.id : 'null');

  // Fetch updated product from Shopify
  const query = `
    query {
      product(id: "${res.id}") {
        id
        title
        descriptionHtml
        featuredImage { url }
        media(first: 3) {
          nodes {
            ... on MediaImage {
              image { url }
            }
          }
        }
        variants(first: 1) {
          nodes { price compareAtPrice weight weightUnit }
        }
      }
    }
  `;

  try {
    const live = await shopifyGraphQL(query);
    const p = live.product;
    console.log('\n📊 Live Product Verification:');
    console.log(`   Title: "${p.title}"`);
    console.log(`   Price: $${p.variants.nodes[0].price} (Compare-at: $${p.variants.nodes[0].compareAtPrice})`);
    console.log(`   Weight: ${p.variants.nodes[0].weight} ${p.variants.nodes[0].weightUnit}`);
    console.log(`   Featured Image: ${p.featuredImage?.url || 'No Image'}`);
    console.log(`   Media Count: ${p.media.nodes.length}`);
    console.log(`   Direct Link: https://admin.shopify.com/store/borderline-bottles/products/${p.id.split('/').pop()}`);
  } catch (e) {
    console.error('Error fetching live:', e.message);
  }
}

testSyncCaptainMorganLive();
