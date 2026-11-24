import { shopifyGraphQL } from './client.js';

async function pub() {
  const mutation = `
    mutation Publish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }
  `;
  const pubs = [
    { publicationId: 'gid://shopify/Publication/197583995092' },
    { publicationId: 'gid://shopify/Publication/197584027860' },
    { publicationId: 'gid://shopify/Publication/197584093396' }
  ];
  await shopifyGraphQL(mutation, { id: 'gid://shopify/Product/15490941649108', input: pubs });
  await shopifyGraphQL(mutation, { id: 'gid://shopify/Product/15490942238932', input: pubs });
  console.log('Successfully published Heineken and Walkers to Online Store & POS!');
}
pub();
