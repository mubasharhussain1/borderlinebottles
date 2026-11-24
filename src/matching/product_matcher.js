/**
 * Product Matcher Module
 * Requirements: Section 2 & 4
 * Matches LiquorConnect products against ZYN and BSW catalogs using:
 * 1. Barcode (UPC) + Size Match (Highest confidence)
 * 2. SKU (CSPC) + Size Match
 * 3. Title + Size Fuzzy Match (Flags for review)
 */

// Helper to normalize volume/size strings: "750ml", "750 mL", "0.75 L", "1.98L"
export function normalizeSize(sizeStr) {
  if (!sizeStr) return '';
  const s = sizeStr.toString().toLowerCase().replace(/\s+/g, '');

  // Litres to ml
  if (s.endsWith('l') && !s.endsWith('ml')) {
    const num = parseFloat(s.replace('l', ''));
    if (!isNaN(num)) return `${Math.round(num * 1000)}ml`;
  }

  // Remove leading zeros or spaces: e.g. "0750ml" -> "750ml"
  const m = s.match(/(\d+(\.\d+)?)(ml|l|oz)?/);
  if (m) {
    let val = parseFloat(m[1]);
    let unit = m[3] || 'ml';
    if (unit === 'l') val = Math.round(val * 1000);
    return `${val}ml`;
  }

  return s;
}

// Clean title for fuzzy comparison
export function cleanTitle(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // remove brackets content
    .replace(/[^a-z0-9]/g, ' ') // alphanumeric only
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pre-indexes competitor catalog into quick Map lookups (run once at startup)
 */
export function buildCatalogIndex(catalogArrayOrObj, sourceName = 'zyn') {
  const items = Array.isArray(catalogArrayOrObj)
    ? catalogArrayOrObj
    : Object.values(catalogArrayOrObj);

  const byBarcode = new Map();
  const bySku = new Map();
  const byTitle = [];

  for (const item of items) {
    if (!item) continue;

    const barcode = item.barcode ? item.barcode.toString().trim() : '';
    const sku = item.sku ? item.sku.toString().trim() : '';
    const title = item.title ? item.title.trim() : '';
    const size = normalizeSize(item.size || (title.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|oz))\b/i)?.[0]));

    const entry = {
      source: sourceName,
      title: item.title,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      weightGrams: item.weightGrams || 0,
      image: item.image || item.primaryImage || item.images?.[0] || null,
      available: item.available !== false && item.inStock !== false,
      sku: sku,
      barcode: barcode,
      size: size,
      raw: item
    };

    if (barcode && barcode !== '0') byBarcode.set(barcode, entry);
    if (sku && sku !== '0') bySku.set(sku, entry);
    if (title) byTitle.push({ clean: cleanTitle(title), size, entry });
  }

  return { byBarcode, bySku, byTitle };
}

/**
 * Match a single LiquorConnect product against indexed catalog
 */
function findMatchInCatalog(lcProduct, index) {
  const lcBarcode = lcProduct.upc ? lcProduct.upc.toString().trim() : '';
  const lcSku = lcProduct.sku ? lcProduct.sku.toString().trim() : '';
  const lcSize = normalizeSize(lcProduct.size || lcProduct.QD_ML);
  const lcCleanTitle = cleanTitle(lcProduct.title || lcProduct.QDDS40);

  // 1. Barcode Exact Match + Size Verification
  if (lcBarcode && index.byBarcode.has(lcBarcode)) {
    const candidate = index.byBarcode.get(lcBarcode);
    if (!lcSize || !candidate.size || lcSize === candidate.size) {
      return {
        matched: true,
        matchedBy: 'barcode_exact',
        flagForReview: false,
        price: candidate.price,
        weightGrams: candidate.weightGrams,
        available: candidate.available,
        image: candidate.image,
        candidate
      };
    }
  }

  // 2. SKU (CSPC) Exact Match + Size Verification
  if (lcSku && index.bySku.has(lcSku)) {
    const candidate = index.bySku.get(lcSku);
    // Strict size check: if both have sizes and they don't match -> reject
    if (lcSize && candidate.size && lcSize !== candidate.size) {
      // Size mismatch, do not match
    } else {
      return {
        matched: true,
        matchedBy: 'sku_exact',
        flagForReview: false,
        price: candidate.price,
        weightGrams: candidate.weightGrams,
        available: candidate.available,
        image: candidate.image,
        candidate
      };
    }
  }

  // 3. Title + Exact Size Match (Fuzzy Last Resort)
  if (lcCleanTitle) {
    for (const item of index.byTitle) {
      if (item.clean === lcCleanTitle) {
        if (!lcSize || !item.size || lcSize === item.size) {
          return {
            matched: true,
            matchedBy: 'title_exact',
            flagForReview: false,
            price: item.entry.price,
            weightGrams: item.entry.weightGrams,
            available: item.entry.available,
            image: item.entry.image,
            candidate: item.entry
          };
        }
      } else if (lcCleanTitle.length > 5 && (item.clean.includes(lcCleanTitle) || lcCleanTitle.includes(item.clean))) {
        // Size must strictly match for fuzzy
        if (lcSize && item.size && lcSize === item.size) {
          return {
            matched: true,
            matchedBy: 'title_fuzzy',
            flagForReview: true, // MUST flag for review as per requirement
            price: item.entry.price,
            weightGrams: item.entry.weightGrams,
            available: item.entry.available,
            image: item.entry.image,
            candidate: item.entry
          };
        }
      }
    }
  }

  return null;
}

/**
 * Main Match Function
 * @param {Object} lcProduct - { sku, upc, title, size }
 * @param {Object} zynIndex - Pre-built ZYN index
 * @param {Object} bswIndex - Pre-built BSW index
 * @returns {Object} { zyn: matchResult | null, bsw: matchResult | null }
 */
export function matchProduct(lcProduct, zynIndex, bswIndex) {
  return {
    zyn: zynIndex ? findMatchInCatalog(lcProduct, zynIndex) : null,
    bsw: bswIndex ? findMatchInCatalog(lcProduct, bswIndex) : null
  };
}
