/**
 * Weight Calculator Engine
 * Implements Section 5 of Scope Document + Reverse-Engineered Packaging Patterns (Jevon - Nov 20)
 * 
 * Priority:
 * 1. Verified weight from ZYN (weightGrams > 0)
 * 2. Verified weight from BSW (weightGrams > 0)
 * 3. Volumetric packaging reverse-engineering:
 *    - Cans (Aluminum): Liquid net volume * 1.10 multiplier
 *    - Plastic (PET): Liquid net volume * 1.15 multiplier
 *    - Glass Bottles: Liquid net volume + glass tare weight (~500g-700g)
 */

export function calculateShippingWeight(item = {}, matchedZyn = null, matchedBsw = null) {
  // 1. Check verified ZYN weight
  if (matchedZyn?.weightGrams && matchedZyn.weightGrams > 0) {
    return {
      weightKg: +(matchedZyn.weightGrams / 1000).toFixed(2),
      source: 'ZYN (Verified)'
    };
  }

  // 2. Check verified BSW weight
  if (matchedBsw?.weightGrams && matchedBsw.weightGrams > 0) {
    return {
      weightKg: +(matchedBsw.weightGrams / 1000).toFixed(2),
      source: 'BSW (Verified)'
    };
  }

  // 3. Fallback: Parse Title, Tags, and Size for Packaging Type & Volume
  const text = `${item.Name || ''} ${item.Title || ''} ${item.Size || ''} ${item.Tags || ''}`.toLowerCase();

  // Detect Cans vs Glass vs Plastic (PET) using exact word boundaries \b
  const isCan = /\b(cans?|tin|tins|cooler|coolers)\b/i.test(text);
  const isPet = /\b(pet|plastic|tetra|pouch)\b/i.test(text);

  // Multi-pack detection (e.g. "24 Cans", "24x355", "6 Cans", "6 Pack", "12 Bottles")
  let packCount = 1;
  const packMatch = text.match(/(\d+)\s*(?:pack|pk|cans|can|bottles|btls|x)/i);
  if (packMatch) {
    const count = parseInt(packMatch[1], 10);
    if (!isNaN(count) && count > 1 && count <= 48) {
      packCount = count;
    }
  }

  // Volume parsing
  let singleVolumeMl = 750; // default standard bottle

  if (text.includes('1.75l') || text.includes('1750')) {
    singleVolumeMl = 1750;
  } else if (text.includes('1.14l') || text.includes('1140')) {
    singleVolumeMl = 1140;
  } else if (text.includes('1l') || text.includes('1000ml') || text.includes('1.0l') || text.includes('1000 ml')) {
    singleVolumeMl = 1000;
  } else if (text.includes('750ml') || text.includes('750 ml') || text.includes('0.75l')) {
    singleVolumeMl = 750;
  } else if (text.includes('500ml') || text.includes('500 ml')) {
    singleVolumeMl = 500;
  } else if (text.includes('375ml') || text.includes('375 ml')) {
    singleVolumeMl = 375;
  } else if (text.includes('355ml') || text.includes('355 ml')) {
    singleVolumeMl = 355;
  } else if (text.includes('330ml') || text.includes('330 ml')) {
    singleVolumeMl = 330;
  } else if (text.includes('200ml') || text.includes('200 ml')) {
    singleVolumeMl = 200;
  } else if (text.includes('50ml') || text.includes('50 ml')) {
    singleVolumeMl = 50;
  }

  // Calculate estimated weight based on package type
  let singleWeightGrams = 0;

  if (isCan) {
    // Cans: Tare weight is ~15g per can, factor = 1.1x
    singleWeightGrams = Math.round(singleVolumeMl * 1.10);
  } else if (isPet) {
    // PET Plastic: Tare weight is ~50g, factor = 1.15x
    singleWeightGrams = Math.round(singleVolumeMl * 1.15);
  } else {
    // Glass Bottles: Heavy tare weight + packaging box protection
    if (singleVolumeMl >= 1750) {
      singleWeightGrams = 5800; // ~5.8kg heavy glass handle
    } else if (singleVolumeMl >= 1140) {
      singleWeightGrams = 3400; // ~3.4kg
    } else if (singleVolumeMl >= 1000) {
      singleWeightGrams = 2800; // ~2.8kg
    } else if (singleVolumeMl >= 750) {
      singleWeightGrams = 2200; // ~2.2kg standard wine/spirits glass
    } else if (singleVolumeMl >= 500) {
      singleWeightGrams = 1400; // ~1.4kg
    } else if (singleVolumeMl >= 375) {
      singleWeightGrams = 1100; // ~1.1kg
    } else {
      singleWeightGrams = Math.round(singleVolumeMl * 1.8);
    }
  }

  // Total weight for multi-packs plus cardboard tray/box
  const totalGrams = (singleWeightGrams * packCount) + (packCount > 1 ? 250 : 0);
  const weightKg = +(totalGrams / 1000).toFixed(2);

  const packagingType = isCan ? 'Can' : (isPet ? 'PET Plastic' : 'Glass Bottle');
  return {
    weightKg,
    source: `Pattern Formula (${packagingType}, ${packCount > 1 ? packCount + '-pack' : 'Single'}, ${singleVolumeMl}ml)`
  };
}
