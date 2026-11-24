import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.resolve('logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const ERROR_LOG_FILE = path.join(LOGS_DIR, 'error_log.json');
const FLAGS_REVIEW_FILE = path.join(LOGS_DIR, 'flags_review.json');
const SYNC_HISTORY_FILE = path.join(LOGS_DIR, 'sync_history.json');

function readJsonFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Logs pricing review flags (e.g. Below 5% profit floor or fuzzy match)
 */
export function logFlaggedProduct(entry) {
  const flags = readJsonFile(FLAGS_REVIEW_FILE);
  flags.push({
    timestamp: new Date().toISOString(),
    ...entry
  });
  writeJsonFile(FLAGS_REVIEW_FILE, flags);
}

/**
 * Logs technical and sync errors (e.g. API timeout, invalid format, missing critical fields)
 */
export function logSyncError(errorEntry) {
  const errors = readJsonFile(ERROR_LOG_FILE);
  errors.push({
    timestamp: new Date().toISOString(),
    ...errorEntry
  });
  writeJsonFile(ERROR_LOG_FILE, errors);
}

/**
 * Records overall sync run summary
 */
export function logSyncSummary(summary) {
  const history = readJsonFile(SYNC_HISTORY_FILE);
  history.push({
    timestamp: new Date().toISOString(),
    ...summary
  });
  writeJsonFile(SYNC_HISTORY_FILE, history);
}

export function getLogsSummary() {
  const errors = readJsonFile(ERROR_LOG_FILE);
  const flags = readJsonFile(FLAGS_REVIEW_FILE);
  const history = readJsonFile(SYNC_HISTORY_FILE);
  return {
    totalErrors: errors.length,
    totalFlagsForReview: flags.length,
    totalSyncRuns: history.length,
    lastRun: history[history.length - 1] || null
  };
}
