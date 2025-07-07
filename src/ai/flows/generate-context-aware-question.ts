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
- 'time_calculation': Quantifying the time lost on these tasks.
- 'context_data': Gathering more context about the business.
- 'result': The survey is complete.

Your task is to generate the next question based on the conversation history. You must also decide which phase the new question belongs to.

All questions should be in Spanish (castellano). Maintain a natural, conversational tone. Avoid technical jargon.

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
3.  Generate a relevant question for the new phase.
4.  After you have gathered enough information across all phases (usually after 5-7 questions in total, including the initial ones), you MUST transition to the 'result' phase. To do this, set the 'phase' field in your output to 'result'. You can leave the 'question' field empty.

Return the generated question and its corresponding phase.
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
    if (input.conversationHistory.length >= 10) {
      return { question: '', phase: 'result' };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
