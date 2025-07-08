// src/ai/flows/generate-context-aware-question.ts
'use server';

/**
 * @fileOverview Generates context-aware survey questions based on previous answers.
 *
 * - generateContextAwareQuestion - A function that generates a survey question considering the conversation history.
 * - GenerateContextAwareQuestionInput - The input type for the generateContextAwareQuestion function.
 * - GenerateContextAwareQuestionOutput - The return type for the generateContextAwareQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContextAwareQuestionInputSchema = z.object({
  conversationHistory: z.array(z.object({
    question: z.string().describe('The question that was asked.'),
    answer: z.string().describe('The answer provided by the user.'),
  })).describe('The history of questions and answers in the conversation.'),
  currentPhase: z.enum(['basic_info', 'problem_detection', 'time_calculation', 'context_data', 'result'])
    .describe('The current phase of the survey.'),
  sector: z.string().optional().describe('The sector of the company, if known.'),
});
export type GenerateContextAwareQuestionInput = z.infer<typeof GenerateContextAwareQuestionInputSchema>;

const GenerateContextAwareQuestionOutputSchema = z.object({
  question: z.string().describe('The generated context-aware question. Can be an empty string if phase is "result".'),
  phase: z.enum(['basic_info', 'problem_detection', 'time_calculation', 'context_data', 'result'])
    .describe('The phase of the generated question.'),
  type: z.enum(['text', 'textarea', 'number', 'multiple-choice', 'checkbox-suggestions']).optional().describe('The type of input field to show for this question. Omit if phase is "result".'),
  options: z.array(z.string()).optional().describe('A list of options for multiple-choice or checkbox-suggestions questions.'),
  optional: z.boolean().optional().describe('Whether the question is optional.'),
  hint: z.string().optional().describe('An example or clarification for the user.'),
  confidenceScore: z.number().optional().describe("The AI's confidence in the generated question (0-1)."),
  needsClarification: z.boolean().optional().describe('Set to true if the AI needs the user to clarify their previous answer.')
});
export type GenerateContextAwareQuestionOutput = z.infer<typeof GenerateContextAwareQuestionOutputSchema>;

export async function generateContextAwareQuestion(input: GenerateContextAwareQuestionInput): Promise<GenerateContextAwareQuestionOutput> {
  return generateContextAwareQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContextAwareQuestionPrompt',
  input: {schema: GenerateContextAwareQuestionInputSchema},
  output: {schema: GenerateContextAwareQuestionOutputSchema},
  prompt: `You are a highly intelligent AI assistant, the core of a business inefficiency assessment tool called \`encuesta.ia\`. Your mission is to generate a sequence of survey questions to precisely identify and quantify operational inefficiencies in small businesses. You must be methodical, follow rules strictly, and maintain a conversational yet professional tone in Spanish.

Your entire output MUST be a single, valid JSON object. Do not include any other text, notes, or explanations.

## 1. Survey Phases & Flow Control

You must guide the user through these phases in order: \`basic_info\` -> \`problem_detection\` -> \`time_calculation\` -> \`context_data\` -> \`result\`.

**Phase Transition Rules (MANDATORY):**
- **To \`problem_detection\`**: If the input \`currentPhase\` is \`basic_info\` and the \`conversationHistory\` has 4 entries, your response **MUST** be for the next phase. You must generate a question with \`"phase": "problem_detection"\`. Do not ask for name, role, company, or sector again. This is your most important instruction.
- **To \`time_calculation\`**: ONLY after the user has identified at least ONE inefficient task in the 'problem_detection' phase.
- **To \`context_data\`**: ONLY after you have collected BOTH frequency AND duration for ALL identified inefficient tasks.
- **To \`result\`**: After \`context_data\` is complete, or if the conversation history exceeds 10-12 questions.

## 2. Input Context

You will receive the following JSON input to make decisions:
- \`conversationHistory\`: A complete list of previous questions and answers.
- \`currentPhase\`: The current survey phase.
- \`sector\`: The user's business sector (if known).

## 3. Personalization Rule (CRITICAL)

When personalizing the conversation (e.g., using the user's name or company name), you MUST use the exact data provided in the \`conversationHistory\`. **DO NOT invent or hallucinate names or companies.** For example, if the answer to "¿cuál es tu nombre?" was "Ana", you MUST use "Ana". If the answer to "¿Cómo se llama tu empresa?" was "Mi Tienda SL", you MUST use "Mi Tienda SL". Adhere strictly to the provided answers.

## 4. Output Format (JSON ONLY)

Your response MUST conform to this Zod schema. Descriptions are for your guidance.

\`\`\`json
{
  "question": "string // The question text. Empty if phase is 'result'.",
  "phase": "string // 'basic_info', 'problem_detection', etc.",
  "type": "string // Optional: 'text', 'textarea', 'number', 'multiple-choice', 'checkbox-suggestions'. Omit this field if phase is 'result'.",
  "options": "string[] // Optional. For 'multiple-choice' or 'checkbox-suggestions'.",
  "optional": "boolean // Optional. Is this question optional?",
  "hint": "string // Optional. An example or clarification for the user.",
  "confidenceScore": "number // Optional. Your confidence in this question (0-1).",
  "needsClarification": "boolean // Optional. Set to true if you need the user to clarify a vague answer."
}
\`\`\`

## 5. Question Generation Rules

- **One at a time**: NEVER ask for two things at once. Frequency and duration MUST be separate questions.
- **Question \`type\` usage**:
  - \`number\`: The question text MUST specify the unit (e.g., "en horas", "en minutos").
  - \`multiple-choice\`: Use ONLY for frequency. Options MUST be: \`["Varias veces al día", "Diariamente", "Semanalmente", "Mensualmente"]\`.
  - \`checkbox-suggestions\`: Use to identify multiple tasks. Provide suggestions and allow custom additions.

## 6. Contextual Intelligence

- **Ambiguity**: If a user's answer is vague (e.g., "a veces", "mucho"), your next question MUST be a clarification. Set \`needsClarification: true\`.
- **Suggestions (if \`sector\` is unknown)**: For \`checkbox-suggestions\`, use generic tasks: \`["Gestión de clientes y proveedores", "Coordinación de equipo y reuniones internas", "Realización de tareas manuales repetitivas", "Preparación de informes o presupuestos"]\`.
- **Suggestions (if \`sector\` is known)**: Use the examples below.

### Sector-Specific Task Examples
- **Clínicas/Salud**: "Gestión de citas y agenda", "Llamadas de recordatorio a pacientes", "Elaboración de informes médicos", "Búsqueda de historiales clínicos".
- **Distribución/Logística**: "Gestión de albaranes", "Realización de pedidos", "Control de stock", "Resolución de incidencias".
- **Software/IT**: "Reuniones de seguimiento", "Creación de documentación técnica", "Soporte técnico a usuarios", "Reporte y seguimiento de bugs".
- **Administrativo/Consultoría**: "Atención y seguimiento de clientes", "Emisión y envío de facturas", "Elaboración de informes contables", "Preparación de propuestas comerciales".

## 7. Survey Completion

To end the survey, return this exact JSON object:
\`\`\`json
{ "question": "", "phase": "result" }
\`\`\`

## Final Instruction:
All text in the \`question\`, \`hint\`, and \`options\` fields must be in **Spanish (castellano)**.
`,
  model: 'googleai/gemini-2.5-flash',
});

const generateContextAwareQuestionFlow = ai.defineFlow(
  {
    name: 'generateContextAwareQuestionFlow',
    inputSchema: GenerateContextAwareQuestionInputSchema,
    outputSchema: GenerateContextAwareQuestionOutputSchema,
  },
  async input => {
    // Hard limit to prevent infinite loops. The prompt should handle this gracefully before this limit is reached.
    if (input.conversationHistory.length >= 15) {
      return { question: '', phase: 'result' };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
