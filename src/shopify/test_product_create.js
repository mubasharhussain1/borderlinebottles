import { shopifyGraphQL } from './client.js';

async function testProductCreate2024() {
  console.log('Testing modern productCreate in 2024-10...');

  const mutation = `
    mutation CreateProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
          vendor
          productType
          tags
          variants(first: 1) {
            nodes {
              id
              sku
              price
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      title: "Test Craft Beer 500ml",
      vendor: "Heineken Brouwerijen",
      productType: "BEER",
      tags: ["Beer", "Netherlands", "5% ABV", "500ml"],
      descriptionHtml: "<p>Imported Dutch lager beer. 5% ABV. 500ml bottle.</p>"
    }
  };

  try {
    const data = await shopifyGraphQL(mutation, variables);
    if (data.productCreate.userErrors && data.productCreate.userErrors.length > 0) {
      console.log('User Errors:', data.productCreate.userErrors);
    } else {
      console.log(' Product created successfully!');
      console.log('Product ID:', data.productCreate.product.id);
      console.log('Title:', data.productCreate.product.title);
      console.log('Default Variant ID:', data.productCreate.product.variants.nodes[0]?.id);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testProductCreate2024();
