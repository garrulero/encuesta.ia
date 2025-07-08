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
  conversationHistory: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    )
    .describe('The full conversation history of the survey.'),
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
  prompt: `Eres un consultor de negocios experto para GoiLab, especializado en ayudar a empresas a optimizar sus procesos con herramientas digitales inteligentes. Tu objetivo es generar un informe persuasivo y revelador a partir de un diagnóstico interactivo.

Información del diagnóstico:
- Nombre de la empresa: {{{companyName}}}
- Contacto: {{{userName}}}, {{{userRole}}}
- Historial de la conversación:
{{#each conversationHistory}}
  P: {{{this.question}}}
  R: {{{this.answer}}}
{{/each}}

Instrucciones para generar el informe en español:

1.  **Analiza el Historial:**
    - Revisa el \`conversationHistory\` para identificar las tareas ineficientes que el usuario ha señalado.
    - Para cada tarea, extrae su frecuencia (diaria, semanal, mensual) y la duración (en horas o minutos).

2.  **Calcula el Impacto (Tiempo y Dinero):**
    - Convierte las frecuencias a un multiplicador semanal: 'Diariamente' -> 5, 'Semanalmente' -> 1, 'Quincenalmente' -> 0.5, 'Mensualmente' -> 0.23 (1/4.33).
    - Si el tiempo se dio en minutos, conviértelo a horas (divide por 60).
    - Calcula el total de horas perdidas semanalmente sumando el producto de (frecuencia semanal * duración en horas) para cada tarea.
    - Calcula el total de horas perdidas mensualmente (total semanal * 4.33).
    - **MUY IMPORTANTE:** Calcula el coste económico mensual de este tiempo perdido. Usa una **estimación conservadora de 25€ por hora**.
    - Redondea las horas y el coste a números enteros o con un decimal para que sea fácil de leer.

3.  **Estructura y Contenido del Informe:**
    - Empieza agradeciendo a {{{userName}}}. Menciona que el informe revelará las horas que se están "escapando" y cómo la tecnología puede recuperarlas.
    - **Crea un bloque de resumen destacado.** Para la tarea más crítica (la que consume más tiempo), presenta un resumen claro con:
        -   **Tarea Crítica:** [Nombre de la tarea]
        -   **Impacto Mensual:** [X horas perdidas, ~Y€]
        -   **Recomendación Clave:** [Solución concreta de GoiLab para esta tarea]
    - Después del resumen, lista el resto de las tareas ineficientes identificadas.
    - Presenta el cálculo del tiempo y dinero perdido TOTAL de forma clara e impactante. Ejemplo: "En total, hemos detectado que estas tareas consumen aproximadamente X horas al mes, lo que supone un coste estimado de Y€ mensuales para tu negocio."
    - Para cada ineficiencia (incluida la del resumen), explica brevemente cómo se puede optimizar utilizando una **solución específica de GoiLab**. Por ejemplo, si el problema es la gestión de documentos, menciona una "herramienta de gestión documental inteligente". Si es la planificación, habla de un "asistente de planificación con IA". Conecta directamente el problema con una solución tangible que ofreces. Evita jerga técnica compleja.
    - Concluye el informe con una llamada a la acción potente y directa que invite al siguiente paso. Usa una frase como: "¿Quieres que empecemos a recuperar esas X horas este mismo mes? En GoiLab, somos especialistas en transformar estas ineficiencias en ahorro real. Te proponemos una sesión de análisis gratuita y sin compromiso para mostrarte cómo."

El tono debe ser profesional, cercano y motivador. El objetivo es que {{{userName}}} lea el informe y piense: "Necesito contactar a GoiLab para solucionar esto AHORA".
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
