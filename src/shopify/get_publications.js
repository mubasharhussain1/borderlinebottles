import { shopifyGraphQL } from './client.js';

async function getPubs() {
  const query = `
    query {
      publications(first: 10) {
        nodes {
          id
          name
        }
      }
    }
  `;
  try {
    const res = await shopifyGraphQL(query);
    console.log('--- Sales Channels (Publications) ---');
    console.log(JSON.stringify(res.publications.nodes, null, 2));
  } catch (err) {
    console.error('Failed:', err.message);
  }
}
getPubs();
