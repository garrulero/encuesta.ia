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
  prompt: `Eres un consultor de negocios para "encuesta.ia", especializado en ayudar a empresas a ver con claridad dónde se "escapa" su tiempo. Tu objetivo es generar un informe final basado en la conversación de diagnóstico que has tenido.

**Tu Tono:** El informe debe ser honesto, revelador y útil. No debe juzgar ni presionar. El objetivo es que el usuario se sienta comprendido y vea una oportunidad de mejora, no que se sienta culpable. Usa un lenguaje cercano y en español (castellano).

**Información del Diagnóstico:**
- Nombre de la empresa: {{{companyName}}}
- Contacto: {{{userName}}}, {{{userRole}}}
- Historial de la conversación:
{{#each conversationHistory}}
  P: {{{this.question}}}
  R: {{{this.answer}}}
{{/each}}

**INSTRUCCIONES PARA GENERAR EL INFORME:**

1.  **Analiza el Historial de la Conversación:**
    - Revisa el \`conversationHistory\` para identificar la(s) tarea(s) ineficiente(s) que el usuario ha descrito. Serán como máximo dos.
    - Para cada tarea, extrae los 4 datos clave: la tarea en sí, su frecuencia, la duración y las dificultades mencionadas.

2.  **Calcula el Impacto (Tiempo y Dinero):**
    - **Frecuencia:** Convierte la frecuencia a un multiplicador diario.
        - 'Varias veces al día': Usa 3 como multiplicador.
        - 'Diariamente': Usa 1.
        - 'Semanalmente': Usa 1/5 = 0.2.
        - 'Mensualmente': Usa 1/22 = 0.045.
        - Si el usuario dio un número específico, úsalo.
    - **Duración:** Si el tiempo se dio en minutos, conviértelo a horas (divide por 60).
    - **Horas/Mes:** Para cada tarea, calcula: (Multiplicador diario * Duración en horas * 22 días laborables).
    - **Coste/Mes:** Calcula el coste económico usando una estimación de **25€ por hora**.
    - **Suma Total:** Calcula el total de horas y el coste sumando el impacto de todas las tareas analizadas. Redondea los resultados para que sean fáciles de leer.

3.  **Estructura y Contenido del Informe:**

    - **Introducción:**
        - Empieza saludando a {{{userName}}}. Ejemplo: \`"Hola {{{userName}}}, aquí tienes un pequeño resumen de lo que hemos hablado."\`
        - Menciona que el objetivo no es juzgar. Ejemplo: \`"Este análisis no busca juzgar cómo se hacen las cosas, sino simplemente poner sobre la mesa una oportunidad de mejora que a veces, con el día a día, se nos pasa por alto."\`

    - **Resumen de Tareas Detectadas:**
        - Para cada tarea analizada, crea un pequeño bloque.
        - **Ejemplo Tarea 1:**
            -   **Tarea:** [Nombre de la tarea]
            -   **Impacto mensual:** Aproximadamente [X] horas, que suponen unos [Y]€.
            -   **Dificultades mencionadas:** [Resume brevemente las dificultades que comentó el usuario].

    - **Reflexión General:**
        - Presenta el impacto total de forma clara. Ejemplo: \`"En total, estas tareas suman unas [SUMA_HORAS] horas al mes. Es casi como tener a una persona trabajando [SUMA_HORAS / 8] jornadas completas solo para esto."\`
        - Añade una reflexión final. Ejemplo: \`"Muchas veces, estas pequeñas tareas son las que, sumadas, más nos frenan. Ver los números ayuda a ponerlo en perspectiva."\`

    - **Cierre Honesto (Llamada a la Acción sin Presión):**
        - Haz una oferta de ayuda clara y sin compromiso.
        - Ejemplo: \`"Si te gustaría explorar cómo se podrían recuperar parte de esas horas, me encantaría que tuviéramos una charla de 15-20 minutos. Sin ningún compromiso, solo para ver si podemos ayudarte. ¿Hablamos?"\`

Recuerda: El informe debe ser conciso, fácil de leer y, sobre todo, útil para {{{userName}}}.
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
