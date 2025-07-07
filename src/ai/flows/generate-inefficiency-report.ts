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
  report: z.string().describe('A detailed report summarizing detected inefficiencies, estimated time savings, and areas for improvement. It must include monthly hours lost and an estimated monthly cost.'),
});
export type GenerateInefficiencyReportOutput = z.infer<typeof GenerateInefficiencyReportOutputSchema>;

export async function generateInefficiencyReport(input: GenerateInefficiencyReportInput): Promise<GenerateInefficiencyReportOutput> {
  return generateInefficiencyReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInefficiencyReportPrompt',
  input: {schema: GenerateInefficiencyReportInputSchema},
  output: {schema: GenerateInefficiencyReportOutputSchema},
  prompt: `Eres un consultor de negocios experto en identificar ineficiencias en empresas locales, trabajando para GoiLab. Tu objetivo es ayudar a las empresas a ver el tiempo y dinero que pierden y cómo GoiLab puede ayudarles a recuperarlo.

A partir de la siguiente información, genera un informe detallado en español. Este informe es la conclusión del diagnóstico interactivo de encuesta.ia.

Información de la empresa:
- Nombre de la empresa: {{{companyName}}}
- Contacto: {{{userName}}}, {{{userRole}}}
- Tareas ineficientes identificadas: {{#each inefficientTasks}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Tiempo total perdido semanalmente: {{{weeklyTimeLost}}} horas
- Descripción de la empresa: {{{companyDescription}}}
- Comentarios adicionales: {{{comments}}}

Estructura y contenido del informe:

1.  **Introducción Agradecida y Planteamiento del Problema:**
    - Empieza agradeciendo a {{{userName}}} por su tiempo.
    - Menciona que el informe revelará las horas que se están "escapando" cada semana y, lo más importante, cómo optimizar ese tiempo.

2.  **Análisis de Ineficiencias:**
    - Presenta un resumen claro de las tareas ineficientes detectadas.

3.  **Cuantificación del Impacto (Tiempo y Dinero):**
    - Calcula el tiempo perdido mensualmente (multiplica las horas semanales por 4.33).
    - **MUY IMPORTANTE:** Calcula el coste económico mensual de este tiempo perdido. Para ello, utiliza una **estimación conservadora de 25€ por hora de empleado**. Es crucial que menciones que esto es una estimación para que puedan hacerse una idea del impacto económico.
    - Presenta estas cifras de forma impactante. Por ejemplo: "Esto se traduce en aproximadamente X horas al mes, lo que podría equivaler a más de Y€ mensuales en costes de oportunidad y salarios."

4.  **Sugerencias de Optimización:**
    - Para cada tarea ineficiente, ofrece sugerencias concretas y prácticas sobre cómo mejorarla.
    - Habla de forma natural sobre mejorar la organización, las formas de trabajar y de simplificar procesos.
    - **Evita terminología compleja** como "automatización", "transformación digital", "consultoría", "IA avanzada".

5.  **Llamada a la Acción para GoiLab:**
    - Concluye el informe con un mensaje motivador.
    - El objetivo final es que contacten a GoiLab. Posiciona a GoiLab como el socio experto que puede ayudarles a implementar estas mejoras y a recuperar esas horas y dinero.
    - Usa una frase como: "En GoiLab estamos especializados en ayudar a empresas como la tuya a transformar estas áreas de mejora en resultados reales. ¿Hablamos de cómo podemos recuperar este tiempo para tu negocio?".

El tono debe ser cercano, profesional y, sobre todo, revelador y persuasivo. Quieres que {{{userName}}} termine de leer y piense: "Necesito llamar a GoiLab".
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
