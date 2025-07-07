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
  prompt: `You are an AI assistant designed to generate survey questions for a business inefficiency assessment tool called encuesta.ia.

  The goal is to create a conversational experience that feels natural and adapts to the user's responses.
  All questions should be in Spanish (castellano).

  Here's the conversation history so far:
  {{#each conversationHistory}}
    Question: {{{this.question}}}
    Answer: {{{this.answer}}}
  {{/each}}

  Current Phase: {{{currentPhase}}}
  Sector: {{#if sector}}{{{sector}}}{{else}}Unknown{{/if}}

  Generate the next question, taking into account the conversation history, current phase, and sector (if available). The question should be relevant to the previous answers and maintain a conversational tone.  Avoid technical jargon and focus on the user's daily tasks and experiences.

  Ensure the question is clear, concise, and easy to understand. Consider the user's previous answers to ask more specific and relevant questions.

  The question should be in Spanish (castellano), using simple and natural language.  Avoid anglicisms.

  Return the generated question and what phase it belongs to.
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
    const {output} = await prompt(input);
    return output!;
  }
);
