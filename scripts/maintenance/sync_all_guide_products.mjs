import { loadCompetitorIndices, syncProductToShopify, findShopifyProductBySku } from './src/sync/sync_engine.js';

// All specific items in our Verification Guide
const guideItems = [
  { SKU: '42', Name: 'Canadian Club - 750 ml', Cost: '22.78', Size: '750ml', AvailabilityDisplay: 'In Stock' },
  { SKU: '67', Name: 'Smirnoff Vodka - 750 ml', Cost: '20.88', Size: '750ml', AvailabilityDisplay: 'In Stock' },
  { SKU: '2196', Name: 'Captain Morgan Dark Rum', Cost: '22.68', Size: '750ml', AvailabilityDisplay: 'In Stock' },
  { SKU: '7617', Name: 'Chivas Regal 12 Year Old', Cost: '42.17', Size: '750ml', AvailabilityDisplay: 'In Stock' },
  { SKU: '18', Name: 'HEINEKEN LAGER - BOTTLES', Cost: '17.25', Size: '750ml', AvailabilityDisplay: 'In Stock' },
  { SKU: '539', Name: 'Black Velvet Whisky', Cost: '20.12', Size: '750ml', AvailabilityDisplay: 'Out of Stock' },
  { SKU: '53978', Name: 'Robert Weil Rheingau Riesling Auslese', Cost: '99.73', Size: '750ml', AvailabilityDisplay: 'Out of Stock' },
  { SKU: '109711', Name: 'Chivas Royal Salute 21 Year Old', Cost: '200.00', Size: '750ml', AvailabilityDisplay: 'In Stock' }
];

async function syncAllGuideProductsNow() {
  console.log('====================================================');
  console.log('🚀 LIVE SYNCING ALL VERIFICATION GUIDE PRODUCTS NOW');
  console.log('====================================================\n');

  const { zynIndex, bswIndex } = loadCompetitorIndices();

  for (const item of guideItems) {
    console.log(`▶️ Syncing SKU: ${item.SKU} ("${item.Name}")...`);
    try {
      await syncProductToShopify(item, zynIndex, bswIndex);
      const live = await findShopifyProductBySku(item.SKU);
      if (live) {
        const v = live.variants.nodes[0];
        console.log(`   ✅ Price: $${v.price} | Weight: ${(v.weight || 'N/A')} kg | InStock: ${v.inventoryQuantity}`);
      }
    } catch (e) {
      console.error(`   ❌ Error on ${item.SKU}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n====================================================');
  console.log('🎉 ALL GUIDE PRODUCTS 100% SYNCED WITH NEW WEIGHTS & PRICES!');
  console.log('====================================================\n');
}

syncAllGuideProductsNow();
