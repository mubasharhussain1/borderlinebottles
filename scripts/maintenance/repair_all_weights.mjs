import { shopifyGraphQL } from './src/shopify/client.js';
import { calculateShippingWeight } from './src/utils/weight_calculator.js';
import axios from 'axios';
import { config } from './src/config.js';

async function fixMissingWeightsBatch() {
  console.log('🔍 Scanning Active Products with Missing (0kg) Weights...');

  let hasNext = true;
  let cursor = null;
  let scanned = 0;
  let fixedCount = 0;

  while (hasNext) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `
      query {
        products(first: 100, query: "status:active"${afterClause}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            title
            variants(first: 1) {
              nodes {
                id
                sku
                inventoryItem {
                  id
                  measurement {
                    weight { value }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const res = await shopifyGraphQL(query);
      const nodes = res.products.nodes;
      const needFix = [];

      for (const p of nodes) {
        scanned++;
        const v = p.variants?.nodes?.[0];
        const currentW = v?.inventoryItem?.measurement?.weight?.value || 0;

        if (currentW === 0 && v) {
          const calc = calculateShippingWeight({ Name: p.title, Size: '' }, null, null);
          const targetW = calc.weightKg || 2.2;
          needFix.push({
            numericId: v.id.split('/').pop(),
            weight: targetW,
            title: p.title
          });
        }
      }

      // Update in parallel batches of 5
      for (let i = 0; i < needFix.length; i += 5) {
        const chunk = needFix.slice(i, i + 5);
        await Promise.all(chunk.map(async item => {
          try {
            await axios.put(
              `https://${config.shopify.domain}/admin/api/${config.shopify.apiVersion || '2024-10'}/variants/${item.numericId}.json`,
              {
                variant: {
                  id: parseInt(item.numericId),
                  weight: item.weight,
                  weight_unit: 'kg'
                }
              },
              {
                headers: {
                  'X-Shopify-Access-Token': config.shopify.accessToken,
                  'Content-Type': 'application/json'
                }
              }
            );
            fixedCount++;
          } catch (e) {}
        }));
        await new Promise(r => setTimeout(r, 600)); // Respect Shopify REST rate limit
      }

      hasNext = res.products.pageInfo.hasNextPage;
      cursor = res.products.pageInfo.endCursor;

      process.stdout.write(`Scanned: ${scanned} | Repaired Weights: ${fixedCount}...\r`);
    } catch (e) {
      console.error('Error fetching batch:', e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n\n✅ Weight Audit & Repair Complete! Fixed ${fixedCount} products.`);
}

fixMissingWeightsBatch();
