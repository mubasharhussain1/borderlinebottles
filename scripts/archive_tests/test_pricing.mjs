import { calculatePrice } from './src/pricing/pricing_engine.js';

console.log('🧪 Running TASK-05 Pricing Engine Unit Tests...');

// 1. Exact Document Example:
// ZYN = $100 (in stock), BSW = $104 (in stock), LC Cost = $87
// Floor = $87 * 1.05 = $91.35
// 14% = $86 (fail), 10% = $90 (fail), 5% = $95 (PASS!)
const docTest = calculatePrice(87, 100, true, 104, true);
console.log('\n[Document Example Test]');
console.log(docTest);
console.log('Expected: finalPrice=95, discountApplied=5%');
console.log('Pass:', docTest.finalPrice === 95 && docTest.discountApplied === '5%' ? '✅ PASSED' : '❌ FAILED');

// 2. Both Competitors Out of Stock (OOS Test)
// LC Cost = $87 -> 87 * 1.27 = 110.49
const oosTest = calculatePrice(87, 100, false, 104, false);
console.log('\n[Both Out of Stock Test]');
console.log(oosTest);
console.log('Expected: finalPrice=110.49, discountApplied=markup_27%');
console.log('Pass:', oosTest.finalPrice === 110.49 && oosTest.discountApplied === 'markup_27%' ? '✅ PASSED' : '❌ FAILED');

// 3. 14% Discount Success Test
// LC Cost = $50, Floor = $52.50. ZYN = $100 -> 14% = $86 (>= 52.50) -> PASS
const p14Test = calculatePrice(50, 100, true, null, false);
console.log('\n[14% Discount Test]');
console.log(p14Test);
console.log('Pass:', p14Test.finalPrice === 86 && p14Test.discountApplied === '14%' ? '✅ PASSED' : '❌ FAILED');

// 4. Below Floor Failure Test
// LC Cost = $95, Floor = $99.75. ZYN = $100 -> 5% = $95 (< 99.75) -> FAIL Flag for review
const floorFailTest = calculatePrice(95, 100, true, null, false);
console.log('\n[Below Floor Flag Test]');
console.log(floorFailTest);
console.log('Pass:', floorFailTest.flagForReview === true ? '✅ PASSED' : '❌ FAILED');

// 5. Edge Case: Missing / Zero Cost
const zeroCost = calculatePrice(0, 100, true);
console.log('\n[Zero Cost Edge Case]');
console.log(zeroCost);
console.log('Pass:', zeroCost.flagForReview === true ? '✅ PASSED' : '❌ FAILED');

console.log('\n🎉 ALL TASK-05 UNIT TESTS COMPLETED!');
