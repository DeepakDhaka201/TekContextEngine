import * as dotenv from 'dotenv';
import * as path from 'path';

console.log('Testing .env file loading...\n');

// Method 1: Default dotenv loading
console.log('Method 1: Default dotenv.config()');
dotenv.config();
console.log('OPENAI_API_KEY from process.env:', process.env.OPENAI_API_KEY ? 
  `Found (${process.env.OPENAI_API_KEY.substring(0, 20)}...)` : 'NOT FOUND');

// Clear for next test
delete process.env.OPENAI_API_KEY;

// Method 2: Explicit path
console.log('\nMethod 2: Explicit path to .env');
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading from:', envPath);
dotenv.config({ path: envPath });
console.log('OPENAI_API_KEY from process.env:', process.env.OPENAI_API_KEY ? 
  `Found (${process.env.OPENAI_API_KEY.substring(0, 20)}...)` : 'NOT FOUND');

// Test multiple keys
console.log('\n--- Testing Multiple Key Pattern ---');
// Add test keys to .env first
const testKeys = [
  'TRANSLATOR_OPENAI_KEY',
  'RESEARCHER_OPENAI_KEY', 
  'DEFAULT_OPENAI_KEY'
];

testKeys.forEach(key => {
  const value = process.env[key];
  console.log(`${key}:`, value ? `Found (${value.substring(0, 20)}...)` : 'NOT FOUND');
});

console.log('\n--- All environment variables starting with OPENAI ---');
Object.keys(process.env)
  .filter(key => key.includes('OPENAI'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]?.substring(0, 30)}...`);
  });