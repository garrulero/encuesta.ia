import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Verificar que la API key esté disponible
if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.warn('GOOGLE_GENAI_API_KEY no está configurada. Las funciones de IA no funcionarán.');
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
