import axios from 'axios';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const STORE_ID = '3210';
const BASE_URL = 'https://prtl.liquorconnect.com';
const COOKIES_FILE = path.resolve('session_cookies.json');
const DATA_DIR = path.resolve('data');

/**
 * Loads stored session cookies
 */
function loadCookies() {
  if (fs.existsSync(COOKIES_FILE)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf-8'));
      return cookies.map(c => c.split(';')[0]).join('; ');
    } catch (e) {
      console.error('Error reading session cookies:', e.message);
    }
  }
  return null;
}

/**
 * Downloads a daily file from LiquorConnect Retailer Portal
 * @param {string} fileName - e.g. "F66074.csv" or "F66BT.csv"
 * @param {string} destPath - destination file path
 */
export async function downloadPortalFile(fileName, destPath) {
  const cookieHeader = loadCookies();
  if (!cookieHeader) {
    throw new Error('No session cookies found. Please authenticate first.');
  }

  const downloadUrl = `${BASE_URL}/Downloads/DailyDownload/${STORE_ID}/${fileName}`;
  const userAgent = process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  console.log(`⬇️ Downloading LiquorConnect ${fileName} from ${downloadUrl}...`);

  const response = await axios({
    method: 'GET',
    url: downloadUrl,
    headers: {
      'User-Agent': userAgent,
      'Cookie': cookieHeader,
      'Referer': `${BASE_URL}/Downloads/Pages/default.aspx`
    },
    responseType: 'stream',
    timeout: 60000
  });

  if (response.status !== 200) {
    throw new Error(`Failed to download ${fileName}. HTTP Status: ${response.status}`);
  }

  // Ensure data directory exists
  if (!fs.existsSync(path.dirname(destPath))) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
  }

  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      const stats = fs.statSync(destPath);
      console.log(`✅ ${fileName} downloaded successfully! Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      resolve(destPath);
    });
    writer.on('error', reject);
  });
}

/**
 * Main function to download all daily inventory & catalog feeds
 */
export async function downloadDailyFeeds() {
  console.log('🔄 Checking LiquorConnect Daily Feeds...');
  const catalogPath = path.resolve(DATA_DIR, 'liquorconnect_latest.csv');
  const stockPath = path.resolve(DATA_DIR, 'bottle_stock_latest.csv');

  try {
    await downloadPortalFile('F66074.csv', catalogPath);
    await downloadPortalFile('F66BT.csv', stockPath);
    return {
      success: true,
      catalogPath,
      stockPath
    };
  } catch (error) {
    console.error('❌ Error downloading LiquorConnect daily feeds:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Allow standalone CLI execution: node src/scraper/liquorconnect_downloader.js
if (process.argv[1] && process.argv[1].endsWith('liquorconnect_downloader.js')) {
  downloadDailyFeeds();
}
