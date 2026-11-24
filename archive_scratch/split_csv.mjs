import fs from 'fs';
import path from 'path';
import readline from 'readline';

const INPUT_CSV = path.resolve('shopify_all_products_import.csv');
const PART1_CSV = path.resolve('shopify_import_part1.csv');
const PART2_CSV = path.resolve('shopify_import_part2.csv');

console.log('🔄 Splitting file into 2 parts (<15MB each) for Shopify import...');

const fileStream = fs.createReadStream(INPUT_CSV);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let header = '';
const part1Stream = fs.createWriteStream(PART1_CSV, { encoding: 'utf8' });
const part2Stream = fs.createWriteStream(PART2_CSV, { encoding: 'utf8' });

let lineCount = 0;
const SPLIT_LIMIT = 17500; // Halfway mark

for await (const line of rl) {
  if (lineCount === 0) {
    header = line;
    part1Stream.write(header + '\n');
    part2Stream.write(header + '\n');
    lineCount++;
    continue;
  }

  if (lineCount <= SPLIT_LIMIT) {
    part1Stream.write(line + '\n');
  } else {
    part2Stream.write(line + '\n');
  }
  lineCount++;
}

part1Stream.end();
part2Stream.end();

console.log(`✅ Splitting complete! Total lines: ${lineCount}`);
console.log(`- Part 1 saved: ${PART1_CSV}`);
console.log(`- Part 2 saved: ${PART2_CSV}`);
