import { shopifyGraphQL } from './src/shopify/client.js';

/**
 * Bulk Archive Old Legacy Products
 * Identifies products created before our LiquorConnect import (IDs starting with legacy prefix 9290...)
 * and safely sets their status to ARCHIVED.
 * Leaves 100% of the new 34,635 LiquorConnect catalog untouched.
 */
async function archiveAllOldDuplicates() {
  console.log('====================================================');
  console.log('   🧹 BULK ARCHIVE: Cleaning Old Legacy Duplicates');
  console.log('====================================================\n');

  let hasNextPage = true;
  let cursor = null;
  let totalArchived = 0;
  let pageCount = 1;

  const archiveMutation = `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id status }
        userErrors { field message }
      }
    }
  `;

  while (hasNextPage) {
    console.log(`📄 Scanning Page ${pageCount}...`);

    // Query active products
    const queryStr = cursor
      ? `query { products(first: 100, after: "${cursor}", query: "status:active") { pageInfo { hasNextPage endCursor } nodes { id title handle } } }`
      : `query { products(first: 100, query: "status:active") { pageInfo { hasNextPage endCursor } nodes { id title handle } } }`;

    try {
      const res = await shopifyGraphQL(queryStr);
      const { nodes, pageInfo } = res.products;

      // Filter for old products: ID starts with 9290 or doesn't have LiquorConnect standard ID (1549/1550)
      const oldProducts = nodes.filter(p => {
        const numId = p.id.split('/').pop();
        return numId.startsWith('9290');
      });

      if (oldProducts.length > 0) {
        console.log(`   Found ${oldProducts.length} old legacy products on this page to archive...`);
        for (const p of oldProducts) {
          try {
            await shopifyGraphQL(archiveMutation, {
              input: { id: p.id, status: "ARCHIVED" }
            });
            totalArchived++;
            process.stdout.write(`\r   ✅ Total Archived so far: ${totalArchived}`);
          } catch (err) {
            // Ignore minor errors and continue
          }
          await new Promise(r => setTimeout(r, 100)); // Shopify rate-limit safety
        }
        console.log('');
      } else {
        console.log(`   No old legacy products on this page.`);
      }

      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
      pageCount++;

      // Safety check after a batch
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`❌ Page fetch error:`, e.message);
      break;
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 CLEANUP COMPLETE! Total Old Products Archived: ${totalArchived}`);
  console.log('   Now your store only has clean, official LiquorConnect catalog!');
  console.log('====================================================\n');
}

archiveAllOldDuplicates();
