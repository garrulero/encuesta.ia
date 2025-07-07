'use server';
/**
 * @fileOverview Generates a report summarizing detected inefficiencies, estimated time savings, and areas for improvement.
 *
 * - generateInefficiencyReport - A function that generates the inefficiency report.
 * - GenerateInefficiencyReportInput - The input type for the generateInefficiencyReport function.
 * - GenerateInefficiencyReportOutput - The return type for the generateInefficiencyReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInefficiencyReportInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  userName: z.string().describe('The name of the user requesting the report.'),
  userRole: z.string().describe('The role of the user in the company.'),
  inefficientTasks: z.array(z.string()).describe('A list of inefficient tasks identified.'),
  weeklyTimeLost: z.number().describe('The total weekly time lost due to these inefficiencies, in hours.'),
  companyDescription: z.string().describe('A description of the company and its activities.'),
  comments: z.string().optional().describe('Any additional comments or context about the company or its work organization.'),
});
export type GenerateInefficiencyReportInput = z.infer<typeof GenerateInefficiencyReportInputSchema>;

const GenerateInefficiencyReportOutputSchema = z.object({
  report: z.string().describe('A detailed report summarizing detected inefficiencies, estimated time savings, and areas for improvement.'),
});
export type GenerateInefficiencyReportOutput = z.infer<typeof GenerateInefficiencyReportOutputSchema>;

export async function generateInefficiencyReport(input: GenerateInefficiencyReportInput): Promise<GenerateInefficiencyReportOutput> {
  return generateInefficiencyReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInefficiencyReportPrompt',
  input: {schema: GenerateInefficiencyReportInputSchema},
  output: {schema: GenerateInefficiencyReportOutputSchema},
  prompt: `Eres un consultor de negocios experto en identificar ineficiencias en empresas locales.

  A partir de la siguiente información, genera un informe detallado en español que resuma las ineficiencias detectadas, estime el tiempo ahorrado y sugiera áreas de mejora para la empresa.

  Nombre de la empresa: {{{companyName}}}
  Nombre del usuario: {{{userName}}}
  Cargo del usuario: {{{userRole}}}
  Tareas ineficientes identificadas: {{#each inefficientTasks}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Tiempo perdido semanalmente: {{{weeklyTimeLost}}} horas
  Descripción de la empresa: {{{companyDescription}}}
  Comentarios adicionales: {{{comments}}}

  El informe debe estar escrito en un tono cercano y profesional, evitando tecnicismos y centrándose en los beneficios prácticos para la empresa.
  Nunca mencionar “automatización”, “transformación digital”, “consultoría”, “IA avanzada”, etc.
  Siempre hablar de forma natural sobre tareas, organización, formas de trabajar, pérdida de tiempo, etc.
  El informe debe incluir:
  - Un resumen de las ineficiencias detectadas.
  - Una estimación del tiempo perdido semanalmente debido a estas ineficiencias.
  - Sugerencias concretas para mejorar la eficiencia en cada una de las áreas identificadas.
  - Un mensaje final que motive a la empresa a tomar medidas para optimizar su gestión.
`,
  model: 'googleai/gemini-2.5-flash',
});

const generateInefficiencyReportFlow = ai.defineFlow(
  {
    name: 'generateInefficiencyReportFlow',
    inputSchema: GenerateInefficiencyReportInputSchema,
    outputSchema: GenerateInefficiencyReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
