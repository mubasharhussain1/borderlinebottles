/**
 * Master Pricing Engine
 * Requirements: Section 3 & 4 of Client Scope Document
 * Implements the 14% -> 10% -> 5% discount cascade with 5% profit floor
 * and 27% standard markup when competitors are Out of Stock.
 */

/**
 * Calculates selling price according to exact document specifications
 * @param {number} lcCost - LiquorConnect purchase cost
 * @param {number|null} zynPrice - ZYN retail price
 * @param {boolean} zynInStock - ZYN confirmed online availability
 * @param {number|null} bswPrice - BSW retail price
 * @param {boolean} bswInStock - BSW confirmed online availability
 * @returns {Object} { finalPrice, discountApplied, flagForReview, reason }
 */
export function calculatePrice(lcCost, zynPrice = null, zynInStock = false, bswPrice = null, bswInStock = false) {
  const cost = parseFloat(lcCost);

  // Edge cases: invalid cost
  if (isNaN(cost) || cost <= 0) {
    return {
      finalPrice: null,
      discountApplied: null,
      flagForReview: true,
      reason: 'Invalid or missing LiquorConnect cost'
    };
  }

  // Step 1 — Competitor price selection (ONLY confirmed in-stock competitors)
  let competitorPrice = null;
  const isZynValid = zynPrice && !isNaN(zynPrice) && zynPrice > 0 && zynInStock === true;
  const isBswValid = bswPrice && !isNaN(bswPrice) && bswPrice > 0 && bswInStock === true;

  if (isZynValid && isBswValid) {
    competitorPrice = Math.min(zynPrice, bswPrice);
  } else if (isZynValid) {
    competitorPrice = zynPrice;
  } else if (isBswValid) {
    competitorPrice = bswPrice;
  }

  // Step 2 — If competitor price is available, calculate price
  if (competitorPrice !== null) {
    const floorPrice = +(cost * 1.05).toFixed(2); // 5% minimum profit floor

    // Jevon client requirement: Exact 14% off regular competitor price (ZYN priority)
    const p14 = +(competitorPrice * 0.86).toFixed(2);
    if (p14 >= floorPrice) {
      return {
        finalPrice: p14,
        compareAtPrice: competitorPrice, // Show original ZYN/competitor regular price as compare-at
        discountApplied: '14%',
        flagForReview: false,
        reason: '14% discount applied off competitor price (meets 5% profit floor)'
      };
    }

    // Below 5% profit floor -> Flag for review, do NOT publish discounted price
    return {
      finalPrice: null,
      compareAtPrice: competitorPrice,
      discountApplied: null,
      flagForReview: true,
      reason: `Below 5% profit floor (14% off gives $${p14} < Floor $${floorPrice})`
    };
  }

  // Step 3 — Both competitors out of stock / no competitor: 27% Markup
  const finalPrice = +(cost * 1.27).toFixed(2);
  return {
    finalPrice: finalPrice,
    compareAtPrice: null,
    discountApplied: 'markup_27%',
    flagForReview: false,
    reason: 'Both competitors out of stock / not listed (27% markup on cost)'
  };
}
