import { shopifyGraphQL } from './src/shopify/client.js';

// Target the old Chivas duplicate (ID: 9290168828116)
async function testArchiveOldChivas() {
  const oldId = 'gid://shopify/Product/9290168828116';
  console.log(`📦 Archiving old duplicate Chivas product: ${oldId}...`);

  const mutation = `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          title
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const res = await shopifyGraphQL(mutation, {
      input: {
        id: oldId,
        status: "ARCHIVED"
      }
    });

    const data = res.productUpdate;
    if (data.userErrors && data.userErrors.length > 0) {
      console.error('❌ UserErrors:', data.userErrors);
    } else {
      console.log(`✅ SUCCESS! Old duplicate is now ARCHIVED:`);
      console.log(`   Title: "${data.product.title}"`);
      console.log(`   New Status: ${data.product.status}`);
      console.log(`\n🎉 Now only the official LiquorConnect product (ID: 15499756503252) remains ACTIVE!`);
    }
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

testArchiveOldChivas();
