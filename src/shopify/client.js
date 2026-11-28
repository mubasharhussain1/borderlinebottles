import axios from 'axios';
import { config } from '../config.js';

/**
 * Execute a GraphQL query or mutation against the Shopify Admin API
 * @param {string} query - GraphQL query string
 * @param {object} variables - Variables object
 * @returns {Promise<object>} - GraphQL data response
 */
export async function shopifyGraphQL(query, variables = {}) {
  const { domain, accessToken, apiVersion } = config.shopify;

  if (!accessToken) {
    throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN is not set in environment or config.');
  }

  const endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

  try {
    const response = await axios.post(
      endpoint,
      { query, variables },
      {
        timeout: 25000,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );

    if (response.data.errors) {
      throw new Error(`Shopify GraphQL Error: ${JSON.stringify(response.data.errors, null, 2)}`);
    }

    return response.data.data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        `Shopify HTTP Error ${error.response.status}: ${JSON.stringify(error.response.data)}`
      );
    }
    throw error;
  }
}
