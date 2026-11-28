import { shopifyGraphQL } from '../../src/shopify/client.js';

async function updateVariant(productId, variantId, newPrice) {
  return await shopifyGraphQL(`mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }`, {
    productId,
    variants: [{
      id: variantId,
      price: newPrice
    }]
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('=== STARTING AUDIT & FIX FOR ALL 13% BADGES ===');
  let hasNextPage = true;
  let cursor = null;
  let totalChecked = 0;
  let totalFixed = 0;
  let totalCompareAt = 0;

  while (hasNextPage) {
    try {
      const queryStr = cursor
        ? `query($cursor: String) {
            products(first: 50, after: $cursor, query: "status:active compare_at_price:>0") {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                title
                variants(first: 5) {
                  nodes {
                    id
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }`
        : `query {
            products(first: 50, query: "status:active compare_at_price:>0") {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                title
                variants(first: 5) {
                  nodes {
                    id
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }`;

      const res = await shopifyGraphQL(queryStr, cursor ? { cursor } : {});
      const page = res?.products;
      if (!page || !page.nodes) {
        console.log('No page data received, breaking.');
        break;
      }

      for (const prod of page.nodes) {
        for (const variant of prod.variants?.nodes || []) {
          totalChecked++;
          const reg = parseFloat(variant.compareAtPrice);
          const pr = parseFloat(variant.price);
          if (!reg || reg <= 0) continue;
          totalCompareAt++;

          // Expected exact 14% price:
          const targetPrice = (Math.floor(reg * 0.86 * 100) / 100).toFixed(2);
          
          // Check if current price is 1 cent higher than targetPrice (e.g. 20.00 vs 19.99)
          if (variant.price !== targetPrice && pr > parseFloat(targetPrice)) {
            // Verify if current discount is < 14%
            const currentDiscount = (reg - pr) / reg;
            if (currentDiscount < 0.14) {
              console.log(`[FIX NEEDED] "${prod.title}" -> Current: $${variant.price}, Target: $${targetPrice}, Reg: $${reg} (Was: ${(currentDiscount * 100).toFixed(2)}%)`);
              try {
                await updateVariant(prod.id, variant.id, targetPrice);
                totalFixed++;
                await sleep(150); // safety rate limit
              } catch (err) {
                console.error(`Failed to update ${variant.id}:`, err.message);
              }
            }
          }
        }
      }

      hasNextPage = page.pageInfo?.hasNextPage;
      cursor = page.pageInfo?.endCursor;
      console.log(`Progress: Checked ${totalChecked} variants (${totalCompareAt} with Compare-At). Fixed so far: ${totalFixed}`);
      await sleep(250);
    } catch (e) {
      console.error('Error fetching page, retrying after 3s...', e.message);
      await sleep(3000);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Total Variants Checked: ${totalChecked}`);
  console.log(`Total with Compare-At: ${totalCompareAt}`);
  console.log(`Total 13% Badges Fixed to 14%: ${totalFixed}`);
}

run();
