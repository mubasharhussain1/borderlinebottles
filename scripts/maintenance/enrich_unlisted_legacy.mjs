import { shopifyGraphQL } from './src/shopify/client.js';
import { sanitizeDescription } from './src/sync/sync_engine.js';
import fs from 'fs';

async function pushAllLegacyDescriptions() {
  console.log('🚀 Starting Mass Enrichment of Unlisted Products with Legacy Descriptions...');

  if (!fs.existsSync('legacy_descriptions.json')) {
    console.error('❌ legacy_descriptions.json not found!');
    return;
  }

  const legacyMap = JSON.parse(fs.readFileSync('legacy_descriptions.json', 'utf8'));
  console.log(`📦 Loaded ${Object.keys(legacyMap).length} descriptions from archive database.`);

  let hasNext = true;
  let cursor = null;
  let totalChecked = 0;
  let totalEnriched = 0;

  while (hasNext) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `
      query {
        products(first: 100, query: "status:active"${afterClause}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            descriptionHtml
            variants(first: 1) {
              nodes {
                sku
              }
            }
          }
        }
      }
    `;

    try {
      const res = await shopifyGraphQL(query);
      const nodes = res.products.nodes;
      const updates = [];

      for (const p of nodes) {
        totalChecked++;
        const currentDesc = (p.descriptionHtml || '').trim();
        const sku = p.variants?.nodes?.[0]?.sku;
        const titleClean = p.title.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

        // Check if currently only has basic specs/bullets (less than 150 chars or starts with <ul>)
        const isBasic = currentDesc.length < 150 || currentDesc.startsWith('<ul><li><strong>SKU:') || currentDesc.startsWith('<div class="liquor-specs">');

        if (isBasic) {
          // Look up in legacy database by SKU or Title keyword
          let matchedDesc = null;
          if (sku && legacyMap[sku]) {
            matchedDesc = legacyMap[sku];
          } else {
            // Find key that overlaps with title
            const key = Object.keys(legacyMap).find(k => {
              const kClean = k.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
              return kClean === titleClean || (titleClean.length > 5 && kClean.includes(titleClean));
            });
            if (key) matchedDesc = legacyMap[key];
          }

          if (matchedDesc && matchedDesc.length > 50) {
            const cleanHtml = sanitizeDescription(matchedDesc);
            updates.push({ id: p.id, descriptionHtml: cleanHtml, title: p.title });
          }
        }
      }

      // Execute updates in parallel chunks of 10
      for (let i = 0; i < updates.length; i += 10) {
        const chunk = updates.slice(i, i + 10);
        await Promise.all(chunk.map(async u => {
          try {
            await shopifyGraphQL(`
              mutation {
                productUpdate(input: {
                  id: "${u.id}",
                  descriptionHtml: ${JSON.stringify(u.descriptionHtml)}
                }) {
                  userErrors { field message }
                }
              }
            `);
            totalEnriched++;
          } catch (e) {}
        }));
      }

      hasNext = res.products.pageInfo.hasNextPage;
      cursor = res.products.pageInfo.endCursor;

      process.stdout.write(`Checked: ${totalChecked} | Enriched: ${totalEnriched} products with rich paragraphs...\r`);
    } catch (err) {
      console.error('Error in batch:', err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n\n======================================================`);
  console.log(`🎉 ENRICHMENT COMPLETE!`);
  console.log(`   • Total Products Checked:  ${totalChecked}`);
  console.log(`   • Upgraded to Rich Descs:  ${totalEnriched}`);
  console.log(`======================================================\n`);
}

pushAllLegacyDescriptions();
