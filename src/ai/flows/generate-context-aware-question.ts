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
  question: z.string().describe('The generated context-aware question.'),
  phase: z.enum(['basic_info', 'problem_detection', 'time_calculation', 'context_data', 'result'])
    .describe('The phase of the generated question.'),
  type: z.enum(['text', 'textarea', 'number', 'multiple-choice', 'checkbox-suggestions']).describe('The type of input field to show for this question.'),
  options: z.array(z.string()).optional().describe('A list of options for multiple-choice or checkbox-suggestions questions.'),
});
export type GenerateContextAwareQuestionOutput = z.infer<typeof GenerateContextAwareQuestionOutputSchema>;

export async function generateContextAwareQuestion(input: GenerateContextAwareQuestionInput): Promise<GenerateContextAwareQuestionOutput> {
  return generateContextAwareQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContextAwareQuestionPrompt',
  input: {schema: GenerateContextAwareQuestionInputSchema},
  output: {schema: GenerateContextAwareQuestionOutputSchema},
  prompt: `You are an AI assistant designed to generate survey questions for a business inefficiency assessment tool called encuesta.ia. Your goal is to identify areas where a small business can improve its processes.

The survey progresses through several phases:
- 'basic_info': Gathering initial information about the user and their company.
- 'problem_detection': Identifying specific tasks that are inefficient.
- 'time_calculation': Quantifying the time lost on these tasks. In this phase, your goal is to determine the frequency (how often a task is done) and duration (how long it takes) for each inefficient task identified earlier. **You MUST focus on one task at a time and ask for frequency and duration in separate questions.**
- 'context_data': Gathering more context about the business.
- 'result': The survey is complete.

Your task is to generate the next question based on the conversation history. You must also decide which phase the new question belongs to and what type of input is most appropriate for the answer.

All questions should be in Spanish (castellano). Maintain a natural, conversational tone. The questions should be detailed and probing, not superficial or "a bit short".

Here's the conversation history so far:
{{#each conversationHistory}}
  Question: {{{this.question}}}
  Answer: {{{this.answer}}}
{{/each}}

Current Phase: {{{currentPhase}}}
Sector: {{#if sector}}{{{sector}}}{{else}}Unknown{{/if}}

Instructions:
1.  Look at the \`currentPhase\` and the \`conversationHistory\`.
2.  If the current phase's goal is complete, transition to the next phase.
3.  Generate a relevant, detailed question for the new phase.
4.  **IMPORTANT: Ask for only one piece of information at a time. Never ask for two things in one question (e.g., do not ask for frequency AND duration at once).**
5.  Determine the best input \`type\` for the question:
    - 'text': For short, open-ended answers.
    - 'textarea': For longer, descriptive answers.
    - 'number': For questions that require a numeric answer (e.g., "How many hours does it take?"). Ideal for duration.
    - 'multiple-choice': For questions where the user should select from a predefined list. **Ideal for frequency** (e.g., ["Diariamente", "Semanalmente", "Mensualmente"]). The user can only select ONE option.
    - 'checkbox-suggestions': Use this specifically when asking the user to identify multiple inefficient tasks. Provide a list of 3-5 common tasks in the 'options' field based on the business context. The question should ask the user to select the relevant tasks and add any others. The user can select multiple options and also add their own.
6.  If you choose \`type: 'multiple-choice'\` or \`type: 'checkbox-suggestions'\`, you MUST provide an \`options\` array with relevant choices.
7.  After you have gathered enough information across all phases (usually after 8-10 questions in total, including the initial ones), you MUST transition to the 'result' phase. To do this, set the 'phase' field in your output to 'result' and you can leave the other fields empty.

Return the generated question, its corresponding phase, type, and options (if applicable).
Output should be in JSON format.
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
      return { question: '', phase: 'result', type: 'text' };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
