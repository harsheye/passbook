import dotenv from 'dotenv';
import path from 'path';
import { AIService } from '../services/ai.service';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

const key = process.env.GEMINI_API_KEY;
console.log('Detected GEMINI_API_KEY:', key ? `${key.substring(0, 8)}...` : 'NONE');

async function runTest() {
  if (!key) {
    console.warn('\n--- NOTICE ---');
    console.warn('No GEMINI_API_KEY found in backend/.env file. The AI Service will default to the Local Heuristics NLP.');
    console.log('Running test with Local Heuristics NLP fallback...');
  } else {
    console.log('Running test with live Google Gemini API...');
  }
  
  console.log('Active model identified:', AIService.getActiveModel());
  console.log('Query: "Spent 1250 at Dominos for pizza in CP CPI"');
  
  try {
    const result = await AIService.parseTransaction("Spent 1250 at Dominos for pizza in CP CPI");
    console.log('\n--- SUCCESS! PARSE RESULT ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\n--- ERROR CONNECTING TO GEMINI API ---');
    console.error(err);
  }
}

runTest();
