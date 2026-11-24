import { shopifyGraphQL } from './client.js';

async function updateInventory() {
  // 1. Get Heineken variant and inventory item ID
  const query = `
    query {
      product(id: "gid://shopify/Product/15490941649108") {
        variants(first: 1) {
          nodes {
            id
            inventoryItem {
              id
              tracked
            }
          }
        }
      }
    }
  `;
  const res = await shopifyGraphQL(query);
  const variant = res.product.variants.nodes[0];
  const inventoryItemId = variant.inventoryItem.id;
  console.log('Inventory Item ID:', inventoryItemId);

  // 2. Enable tracking
  const trackMutation = `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem {
          id
          tracked
        }
        userErrors { field message }
      }
    }
  `;
  await shopifyGraphQL(trackMutation, {
    id: inventoryItemId,
    input: { tracked: true }
  });
  console.log('Tracking enabled!');

  // 3. Set inventory quantity at Location 4402 52 Ave
  const setQuantityMutation = `
    mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup {
          reason
        }
        userErrors { field message }
      }
    }
  `;
  const setRes = await shopifyGraphQL(setQuantityMutation, {
    input: {
      name: "available",
      reason: "cycle_count_available",
      ignoreCompareQuantity: true,
      quantities: [
        {
          inventoryItemId: inventoryItemId,
          locationId: "gid://shopify/Location/92324233428",
          quantity: 24
        }
      ]
    }
  });

  console.log('Set quantity result:', JSON.stringify(setRes, null, 2));
}

updateInventory();
