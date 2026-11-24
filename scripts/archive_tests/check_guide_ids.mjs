import { shopifyGraphQL } from './src/shopify/client.js';

async function checkGuide() {
  const res = await shopifyGraphQL(`{
    p42: product(id: "gid://shopify/Product/9290170728660") { title status variants(first: 1) { nodes { price compareAtPrice } } }
    p67: product(id: "gid://shopify/Product/9290173087956") { title status variants(first: 1) { nodes { price compareAtPrice } } }
    p2196: product(id: "gid://shopify/Product/9290170335444") { title status variants(first: 1) { nodes { price compareAtPrice } } }
    p7617: product(id: "gid://shopify/Product/9290168828116") { title status variants(first: 1) { nodes { price compareAtPrice } } }
    p18: product(id: "gid://shopify/Product/15490941649108") { title status variants(first: 1) { nodes { price compareAtPrice } } }
  }`);
  console.log(JSON.stringify(res, null, 2));
}

checkGuide();
