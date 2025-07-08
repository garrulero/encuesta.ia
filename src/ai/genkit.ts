import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check if API key is available
if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.warn('GOOGLE_GENAI_API_KEY not found. AI features will not work.');
}

export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
  })],
  model: 'googleai/gemini-2.0-flash',
});
