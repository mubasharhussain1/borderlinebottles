import { shopifyGraphQL } from './client.js';

async function checkPublicationsAndPublish() {
  // 1. Get publications (Online Store channel)
  const pubQuery = `
    query {
      publications(first: 10) {
        nodes {
          id
          name
        }
      }
      products(first: 10) {
        nodes {
          id
          title
          publishedOnCurrentPublication
        }
      }
    }
  `;

  const data = await shopifyGraphQL(pubQuery);
  console.log('Available Publications/Channels:');
  console.log(data.publications.nodes);

  const onlineStorePub = data.publications.nodes.find(p => p.name.toLowerCase().includes('online store')) || data.publications.nodes[0];
  console.log(`\nTarget Publication: ${onlineStorePub.name} (${onlineStorePub.id})`);

  // 2. Publish each product to Online Store
  const publishMutation = `
    mutation PublishToOnlineStore($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable {
          availablePublicationCount
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  for (const product of data.products.nodes) {
    console.log(`Publishing "${product.title}" to Online Store...`);
    const res = await shopifyGraphQL(publishMutation, {
      id: product.id,
      input: [{ publicationId: onlineStorePub.id }]
    });

    if (res.publishablePublish.userErrors.length > 0) {
      console.log('Publish error:', res.publishablePublish.userErrors);
    } else {
      console.log(` Successfully published "${product.title}"!`);
    }
  }
}

checkPublicationsAndPublish();
