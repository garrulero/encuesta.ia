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
  type: z.enum(['text', 'textarea', 'number', 'multiple-choice', 'checkbox-suggestions', 'FREQUENCY_QUESTION']).optional().describe('The type of input field to show for this question. Omit if phase is "result".'),
  options: z.array(z.string()).optional().describe('A list of options for multiple-choice or checkbox-suggestions questions.'),
  optional: z.boolean().optional().describe('Whether the question is optional.'),
  hint: z.string().optional().describe('An example or clarification for the user.'),
  confidenceScore: z.number().optional().describe("The AI's confidence in the generated question (0-1)."),
  needsClarification: z.boolean().optional().describe('Set to true if the AI needs the user to clarify their previous answer.')
}).refine(data => {
    if ((data.type === 'multiple-choice' || data.type === 'checkbox-suggestions') && (!data.options || data.options.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "When type is 'multiple-choice' or 'checkbox-suggestions', the 'options' array must be provided and not be empty."
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

Your entire output MUST be a single, valid JSON object that conforms to the schema provided at the end. Do not include any other text, notes, or explanations.

**CONTEXT OF THE CONVERSATION SO FAR:**
Here is the history of questions and answers. Use this to understand the conversation and decide the next question. Do not repeat questions.

{{#each conversationHistory}}
- Question: {{{this.question}}}
- Answer: {{{this.answer}}}
{{/each}}

Now, generate the next question by following these non-negotiable rules:

## RULE 1: SURVEY FLOW & PHASE TRANSITIONS
You must guide the user through these phases in order: \`basic_info\` -> \`problem_detection\` -> \`time_calculation\` -> \`context_data\` -> \`result\`.

- **To \`problem_detection\`**: If \`currentPhase\` is \`basic_info\` and \`conversationHistory\` has 4 entries, your response **MUST** move to the \`problem_detection\` phase. Do not ask for basic info again.
- **To \`time_calculation\`**: After the user identifies at least one inefficient task in the \`problem_detection\` phase.
- **To \`context_data\`**: After you have collected frequency AND duration for ALL identified inefficient tasks.
- **To \`result\`**: After \`context_data\` is complete, or if \`conversationHistory\` has more than 10-12 entries.

## RULE 2: CRITICAL QUESTION GENERATION LOGIC
This is the most important set of rules. Follow it precisely.

- **If PHASE is \`problem_detection\`:**
  - Your goal is to identify multiple inefficient tasks.
  - The question type **MUST** be \`checkbox-suggestions\`.
  - You **MUST** provide a list of suggested tasks in the \`options\` field. Use the sector-specific examples if the sector is known.

- **If PHASE is \`time_calculation\`:**
  - This phase has two steps for EACH task: FREQUENCY, then DURATION.
  - **For FREQUENCY questions (e.g., asking "con qué frecuencia"):**
    - The \`type\` in your JSON output **MUST** be \`FREQUENCY_QUESTION\`.
    - **This rule is absolute. If your question is about frequency, you MUST use this type.**
  - **For DURATION questions (e.g., asking "cuánto tiempo"):**
    - The \`type\` in your JSON output **MUST** be \`number\`.
    - The \`question\` text **MUST** specify the unit (e.g., "en horas" o "en minutos").

- **For all other phases:** Use \`text\` or \`textarea\` as appropriate.

## RULE 3: PERSONALIZATION
When using the user's name or company, you **MUST** use the exact data from \`conversationHistory\`. **DO NOT invent data.**

## RULE 4: CLARIFICATION
If a user's answer is vague (e.g., "a veces"), your next question **MUST** be a clarification. Set \`needsClarification: true\`.

## RULE 5: SURVEY COMPLETION
To end the survey, return this exact JSON object:
\`{ "question": "", "phase": "result" }\`

## SECTOR-SPECIFIC EXAMPLES (for \`problem_detection\`)
- **Generic**: \`["Gestión de clientes", "Coordinación interna", "Tareas repetitivas", "Informes"]\`
- **Clínicas/Salud**: \`["Gestión de citas", "Llamadas a pacientes", "Informes médicos", "Búsqueda historiales"]\`
- **Distribución/Logística**: \`["Gestión de albaranes", "Pedidos", "Control de stock", "Incidencias"]\`
- **Software/IT**: \`["Reuniones de seguimiento", "Documentación técnica", "Soporte técnico", "Reporte de bugs"]\`
- **Administrativo/Consultoría**: \`["Seguimiento de clientes", "Emisión de facturas", "Informes contables", "Propuestas"]\`

## FINAL INSTRUCTIONS
- All user-facing text (\`question\`, \`hint\`, \`options\`) MUST be in **Spanish (castellano)**.
- Your response MUST conform to this Zod schema. The system will reject it if it doesn't.
\`\`\`json
{
  "question": "string",
  "phase": "enum('basic_info', 'problem_detection', 'time_calculation', 'context_data', 'result')",
  "type": "enum('text', 'textarea', 'number', 'multiple-choice', 'checkbox-suggestions', 'FREQUENCY_QUESTION').optional()",
  "options": "string[].optional()",
  "optional": "boolean.optional()",
  "hint": "string.optional()",
  "confidenceScore": "number.optional()",
  "needsClarification": "boolean.optional()"
}
\`\`\`
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
