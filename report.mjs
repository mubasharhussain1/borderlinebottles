import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.resolve('logs');
const FLAGS_FILE = path.join(LOGS_DIR, 'flags_review.json');
const ERROR_FILE = path.join(LOGS_DIR, 'error_log.json');
const HISTORY_FILE = path.join(LOGS_DIR, 'sync_history.json');

function readJson(file) {
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

const flags = readJson(FLAGS_FILE);
const errors = readJson(ERROR_FILE);
const history = readJson(HISTORY_FILE);

console.log('\n' + '='.repeat(65));
console.log('   📊 SHOPIFYSYNQ - SYSTEM HEALTH & LOGS REPORT');
console.log('='.repeat(65));

// 1. Overall Status
console.log(`\n📌 OVERVIEW:`);
console.log(`   • Total Products Flagged for Review: ${flags.length}`);
console.log(`   • Total Sync Errors Recorded:       ${errors.length}`);
console.log(`   • Total Sync Runs Completed:        ${history.length}`);

// 2. Last Sync Details
if (history.length > 0) {
  const last = history[history.length - 1];
  console.log(`\n🕒 LAST SYNC RUN:`);
  console.log(`   • Time:      ${last.timestamp}`);
  console.log(`   • Processed: ${last.totalProductsProcessed || 0} items`);
  console.log(`   • Updated:   ${last.updated || 0} items`);
  console.log(`   • Flagged:   ${last.flaggedForReview || 0} items`);
  console.log(`   • Errors:    ${last.errors || 0} items`);
}

// 3. Recent Flagged Products (Floor Protection)
if (flags.length > 0) {
  console.log(`\n🚩 ITEMS FLAGGED FOR CLIENT REVIEW (Sample / Recent):`);
  flags.slice(-5).forEach((f, i) => {
    console.log(`   ${i + 1}. [SKU: ${f.sku}] "${f.title || 'Product'}"`);
    console.log(`      Cost: $${f.cost} | Competitor: $${f.competitorPrice || f.zynPrice || 'N/A'}`);
    console.log(`      Reason: ${f.reason}`);
  });
}

// 4. Recent Technical Errors
if (errors.length > 0) {
  console.log(`\n⚠️ RECENT ERRORS (Last 3):`);
  errors.slice(-3).forEach((e, i) => {
    console.log(`   ${i + 1}. [SKU: ${e.sku || 'N/A'}] ${e.error || e.message} (${e.timestamp})`);
  });
} else {
  console.log(`\n✅ No technical errors recorded!`);
}

console.log('\n' + '='.repeat(65));
console.log('💡 Tip: Detailed raw logs are stored in the /logs directory:');
console.log('   - logs/flags_review.json');
console.log('   - logs/error_log.json');
console.log('   - logs/sync_history.json');
console.log('='.repeat(65) + '\n');
