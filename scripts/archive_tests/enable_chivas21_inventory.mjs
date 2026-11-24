import { shopifyGraphQL } from './src/shopify/client.js';

async function enableChivas21Inventory() {
  console.log('Enabling inventory tracking on Chivas Royal Salute 21 (SKU 109711)...\n');

  // Find variant and inventoryItem
  const query = `
    query {
      product(id: "gid://shopify/Product/9290189897940") {
        id
        variants(first: 1) {
          nodes {
            id
            inventoryItem { id tracked }
          }
        }
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(query);
    const invItem = res.product.variants.nodes[0].inventoryItem;
    console.log('Current Inventory Item ID:', invItem.id);

    // 1. Enable Tracking
    const trackMutation = `
      mutation track($id: ID!, $input: InventoryItemInput!) {
        inventoryItemUpdate(id: $id, input: $input) {
          inventoryItem { id tracked }
          userErrors { field message }
        }
      }
    `;
    await shopifyGraphQL(trackMutation, {
      id: invItem.id,
      input: { tracked: true }
    });

    // 2. Set 50 Available Quantity
    const qtyMutation = `
      mutation setQty($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          userErrors { field message }
        }
      }
    `;
    await shopifyGraphQL(qtyMutation, {
      input: {
        name: "available",
        reason: "cycle_count_available",
        ignoreCompareQuantity: true,
        quantities: [{
          inventoryItemId: invItem.id,
          locationId: "gid://shopify/Location/92324233428",
          quantity: 50
        }]
      }
    });

    console.log('✅ Inventory Tracking ON & Available set to 50!');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

enableChivas21Inventory();
