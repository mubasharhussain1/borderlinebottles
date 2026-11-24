import { shopifyGraphQL } from './client.js';

async function testProductSet() {
  console.log('Testing productSet mutation...');

  const mutation = `
    mutation ProductSet($input: ProductSetInput!) {
      productSet(input: $input) {
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
              barcode
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
      title: "Heineken Lager Beer 6-Pack",
      vendor: "Heineken Brouwerijen",
      productType: "BEER",
      tags: ["Beer", "Netherlands", "5% ABV", "Imported"],
      descriptionHtml: "<p>Official Imported Heineken Lager Beer. 5% ABV.</p>",
      variants: [
        {
          price: "18.99",
          sku: "18",
          barcode: "3170870001265"
        }
      ]
    }
  };

  try {
    const data = await shopifyGraphQL(mutation, variables);
    if (data.productSet.userErrors && data.productSet.userErrors.length > 0) {
      console.log('User Errors:', data.productSet.userErrors);
    } else {
      console.log(' productSet created successfully!');
      console.log('Product ID:', data.productSet.product.id);
      console.log('SKU:', data.productSet.product.variants.nodes[0]?.sku);
      console.log('Barcode:', data.productSet.product.variants.nodes[0]?.barcode);
      console.log('Price:', data.productSet.product.variants.nodes[0]?.price);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testProductSet();
