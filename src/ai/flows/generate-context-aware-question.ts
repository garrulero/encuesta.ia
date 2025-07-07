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
  type: z.enum(['text', 'textarea', 'number', 'multiple-choice']).describe('The type of input field to show for this question.'),
  options: z.array(z.string()).optional().describe('A list of options for multiple-choice questions. Only provide if type is "multiple-choice".'),
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
- 'time_calculation': Quantifying the time lost on these tasks. This is where you should ask questions that help quantify time or frequency.
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
4.  Determine the best input \`type\` for the question:
    - 'text': For short, open-ended answers.
    - 'textarea': For longer, descriptive answers.
    - 'number': For questions that require a numeric answer (e.g., "How many times a week?").
    - 'multiple-choice': For questions where the user should select from a predefined list. For example, for frequency ("Daily", "Weekly", "Monthly") or for ranges of time. Make the options clear and easy to choose.
5.  If you choose \`type: 'multiple-choice'\`, you MUST provide an \`options\` array with relevant choices.
6.  After you have gathered enough information across all phases (usually after 6-8 questions in total, including the initial ones), you MUST transition to the 'result' phase. To do this, set the 'phase' field in your output to 'result' and you can leave the other fields empty.

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
    if (input.conversationHistory.length >= 10) {
      return { question: '', phase: 'result', type: 'text' };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
