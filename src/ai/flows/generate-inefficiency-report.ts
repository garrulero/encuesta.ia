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
  prompt: `Eres un consultor de negocios para GoiLab, especializado en ayudar a PYMES a ver con claridad dónde se "escapa" su tiempo. Tu objetivo es generar un informe final honesto y persuasivo basado en la conversación de diagnóstico.

**Tu Tono:** El informe debe ser honesto, revelador y útil, reflejando que somos un "aliado tecnológico". El objetivo es que el usuario se sienta comprendido y vea una oportunidad de mejora, no que se sienta culpable. Usa un lenguaje cercano y en español (castellano).

**Información del Diagnóstico:**
- Nombre del contacto: {{{userName}}}
- Historial de la conversación:
{{#each conversationHistory}}
  P: {{{this.question}}}
  R: {{{this.answer}}}
{{/each}}

**INSTRUCCIONES PARA GENERAR EL INFORME (Plantilla V2.0):**

Usa esta estructura de Markdown para el informe. Sé conciso y directo.

---
Hola {{{userName}}},

Aquí tienes el resumen de nuestro diagnóstico. El objetivo no es juzgar, sino iluminar una oportunidad de mejora que el día a día a menudo nos oculta.

**1. El Diagnóstico:**
- **Tarea Identificada:** [Extrae del historial la primera tarea ineficiente que el usuario describió.]
- **Impacto Mensual:** Aproximadamente [Calcula las horas perdidas al mes] horas, que suponen un coste oculto estimado de [Calcula el coste a 25€/hora]€.

**2. La Causa Raíz:**
Nos comentabas que la principal dificultad es [Resume en una frase las dificultades que mencionó el usuario para esa tarea, por ejemplo: 'la gestión manual con un Excel y la pérdida de tiempo en buscar datos']. Esto provoca [Describe la consecuencia directa, ej: 'pérdida de tiempo, posibles errores y una alta carga manual'].

**3. La Oportunidad (Reflexión Final):**
Esas [repite el número de horas] horas al mes son un activo muy valioso. Recuperarlas significaría más tiempo para [Personaliza según el sector, ej: 'la estrategia de tu negocio', 'atender a tus clientes', 'desarrollar nuevos servicios'].

**4. Nuestro Siguiente Paso (La Invitación):**
Para solucionar precisamente esto, en GoiLab no nos limitamos a vender un software, sino que diseñamos soluciones a medida con un acompañamiento continuo.

Me encantaría tener una charla de 15 minutos contigo, no para venderte nada, sino para mostrarte un boceto visual de cómo podría ser una herramienta sencilla para tu caso y cómo trabajaríamos juntos para implementarla. Sin ningún compromiso.

¿Hablamos?
---

**Cálculos Importantes:**
- Para calcular las horas/mes: (Multiplicador diario * Duración en horas * 22 días laborables).
    - 'Varias veces al día': Usa 3.
    - 'Diariamente': Usa 1.
    - 'Semanalmente': Usa 0.2 (1/5).
    - 'Mensualmente': Usa 0.045 (1/22).
- Redondea los resultados para que sean fáciles de leer.
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

    