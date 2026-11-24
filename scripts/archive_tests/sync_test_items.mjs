import { loadCompetitorIndices, syncProductToShopify, findShopifyProductBySku } from './src/sync/sync_engine.js';

async function syncTargetTestProducts() {
  console.log('🔄 Syncing specific test products to Shopify with latest pricing & weights...\n');

  const { zynIndex, bswIndex } = loadCompetitorIndices();

  // Test SKUs to sync
  const itemsToSync = [
    { SKU: '2196', Name: 'Captain Morgan Dark Rum', Cost: '22.68', Size: '750ml', AvailabilityDisplay: 'In Stock' },
    { SKU: '67', Name: 'Smirnoff Vodka - 750 ml', Cost: '20.88', Size: '750ml', AvailabilityDisplay: 'In Stock' },
    { SKU: '7617', Name: 'Chivas Regal 12 Year Old - 750 ml', Cost: '42.17', Size: '750ml', AvailabilityDisplay: 'In Stock' },
    { SKU: '18', Name: 'HEINEKEN LAGER - BOTTLES', Cost: '17.25', Size: '750ml', AvailabilityDisplay: 'In Stock' },
    { SKU: '539', Name: 'Black Velvet Whisky', Cost: '20.12', Size: '750ml', AvailabilityDisplay: 'Out of Stock' },
    { SKU: '53978', Name: 'Robert Weil Rheingau Riesling Auslese', Cost: '99.73', Size: '750ml', AvailabilityDisplay: 'Out of Stock' },
    { SKU: '109711', Name: 'Chivas Royal Salute 21 Year Old', Cost: '200.00', Size: '750ml', AvailabilityDisplay: 'In Stock' }
  ];

  for (const item of itemsToSync) {
    console.log(`▶️ Processing SKU: ${item.SKU} ("${item.Name}")...`);
    try {
      await syncProductToShopify(item, zynIndex, bswIndex);
      const live = await findShopifyProductBySku(item.SKU);
      if (live) {
        const v = live.variants.nodes[0];
        console.log(`   ✅ Live Updated: Price=$${v.price} | CompareAt=$${v.compareAtPrice || 'N/A'}`);
      }
    } catch (e) {
      console.error(`   ❌ Error on ${item.SKU}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n🎉 Finished syncing test items!');
}

syncTargetTestProducts();
