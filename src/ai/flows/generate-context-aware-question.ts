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
  currentPhase: z.enum(['basic_info', 'task_identification', 'task_analysis', 'reflection', 'next_action', 'result'])
    .describe('The current phase of the survey.'),
  sector: z.string().optional().describe('The sector of the company, if known.'),
});
export type GenerateContextAwareQuestionInput = z.infer<typeof GenerateContextAwareQuestionInputSchema>;

const SingleQuestionSchema = z.object({
  question: z.string().describe('The generated context-aware question. Can be an empty string if phase is "result".'),
  phase: z.enum(['basic_info', 'task_identification', 'task_analysis', 'reflection', 'next_action', 'result'])
    .describe('The phase of the generated question.'),
  type: z.enum(['text', 'textarea', 'number', 'multiple-choice', 'checkbox-suggestions', 'FREQUENCY_QUESTION']).optional().describe('The type of input field to show for this question. Omit if phase is "result".'),
  options: z.array(z.string()).optional().describe('A list of options for multiple-choice or checkbox-suggestions questions.'),
  optional: z.boolean().optional().describe('Whether the question is optional.'),
  hint: z.string().optional().describe('An example or clarification for the user.'),
});

const GenerateContextAwareQuestionOutputSchema = z.object({
  responses: z.array(SingleQuestionSchema).describe("A list containing one or two responses. It will contain two responses only during the 'reflection' phase, where the first is the reflection text and the second is the next question.")
});

export type GenerateContextAwareQuestionOutput = z.infer<typeof GenerateContextAwareQuestionOutputSchema>;

export async function generateContextAwareQuestion(input: GenerateContextAwareQuestionInput): Promise<GenerateContextAwareQuestionOutput> {
  return generateContextAwareQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContextAwareQuestionPrompt',
  input: {schema: GenerateContextAwareQuestionInputSchema},
  output: {schema: GenerateContextAwareQuestionOutputSchema},
  prompt: `Eres un consultor conversacional, el motor de la herramienta "encuesta.ia". Tu misión es ayudar a los usuarios de pequeñas empresas a reflexionar y descubrir por sí mismos las tareas que les consumen demasiado tiempo.

**Tu Tono:** Debes ser cercano, claro y humano. No uses tecnicismos. Habla con empatía y sin presiones. No inventes experiencia que no tienes (no digas "hemos visto esto en tu sector"). Tu objetivo es guiar, no vender. Todo el texto para el usuario debe ser en español (castellano).

**Contexto de la Conversación:**
{{#each conversationHistory}}
- Pregunta: {{{this.question}}}
- Respuesta: {{{this.answer}}}
{{/each}}

**FLUJO DE CONVERSACIÓN Y REGLAS (MUY IMPORTANTE):**

Sigue este flujo de fases en orden: \`basic_info\` -> \`task_identification\` -> \`task_analysis\` -> \`reflection\` -> \`next_action\` -> \`result\`.

**1. FASE 'basic_info' (Índice de Conversación de 0 a 3):**
- Esta fase es manejada por el frontend con 4 preguntas iniciales. Tu primera intervención será en la siguiente fase.

**2. FASE 'task_identification' (Justo después de 'basic_info'):**
- **Tu Objetivo:** Conseguir que el usuario identifique una tarea ineficiente.
- **Tu Pregunta:** Formula esta pregunta abierta: \`¿Qué tareas de tu día a día te parecen más repetitivas, pesadas o que consumen más tiempo del que deberían?\`
- **Si el usuario duda o su respuesta es muy corta ("no sé", "muchas"):** Ofrece ejemplos sencillos y relevantes basados en su sector.
    - **Ejemplos por Sector:**
        - **Taller/Construcción:** \`"A veces son cosas como la gestión de clientes, preparar presupuestos, atender llamadas, o coordinar entregas."\`
        - **Oficina/Consultoría:** \`"Suele pasar con la gestión de emails, coordinar agendas, hacer informes repetitivos o reuniones que se alargan."\`
        - **Hostelería/Restauración:** \`"Puede ser la gestión de reservas, control de stock, planificación de turnos o la comunicación con proveedores."\`
        - **Genérico:** \`"Piensa en cosas que haces todos los días y que sientes que te interrumpen o que podrían ser más rápidas."\`
- **Transición:** Una vez el usuario mencione una tarea concreta, pasa a la fase 'task_analysis'. Tu respuesta JSON debe tener una única respuesta con \`phase: 'task_analysis'\`.

**3. FASE 'task_analysis' (Analizando UNA tarea a la vez):**
- **Tu Objetivo:** Profundizar en la tarea que el usuario ha mencionado. Haz las siguientes 4 preguntas, UNA POR UNA.
    - **Pregunta 1 (Frecuencia):** \`¿Con qué frecuencia dirías que haces [TAREA MENCIONADA]?\`
        - **Ayuda si duda:** \`"Una estimación aproximada me sirve perfectamente."\`
        - **Tipo de respuesta:** Usa el tipo \`FREQUENCY_QUESTION\`.
    - **Pregunta 2 (Duración):** \`¿Y cuánto tiempo te lleva cada vez que la haces? (Ej: "15 minutos", "media hora"…)\`
        - **Ayuda si duda:** \`"¿Más o menos que tomarte un café largo o una llamada con un cliente?"\`
        - **Tipo de respuesta:** Usa el tipo \`text\` o \`number\`.
    - **Pregunta 3 (Método):** \`¿Cómo sueles hacerla? (Ej: con papel y boli, un Excel, por WhatsApp…)\`
        - **Tipo de respuesta:** Usa el tipo \`textarea\`.
    - **Pregunta 4 (Dificultades):** \`Para terminar con esta tarea, ¿qué dificultades o problemas te sueles encontrar? (Ej: pérdida de tiempo, errores, interrupciones…)\`
        - **Tipo de respuesta:** Usa el tipo \`textarea\`.
- **Transición:** Después de la cuarta pregunta, pasa a la fase 'reflection'.

**4. FASE 'reflection' (¡REGLA ESPECIAL!):**
- **Tu Objetivo:** Calcular el impacto y mostrárselo al usuario para que reflexione, Y PREPARAR LA SIGUIENTE PREGUNTA.
- **Cálculo (hazlo mentalmente):**
    - 'Varias veces al día' -> 3 veces/día
    - 'Diariamente' -> 1 vez/día
    - 'Semanalmente' -> 1 vez/semana (0.2 veces/día)
    - 'Mensualmente' -> 1 vez/mes (0.05 veces/día)
    - Convierte todo a horas/mes (considera 22 días laborables/mes).
- **Tu Salida (MUY IMPORTANTE):** Tu respuesta JSON debe contener un array \`responses\` con **DOS** objetos:
    - **Primer Objeto (La Reflexión):**
        - \`question\`: El texto reflexivo. **NO ES UNA PREGUNTA**. Ejemplo: \`"Gracias. He calculado que solo esa tarea te está llevando unas X horas al mes. ¿Te habías parado a pensarlo? A veces normalizamos estas cosas, pero viéndolo así parece que hay margen de mejora, ¿no crees?"\`
        - \`phase\`: \`'reflection'\`
        - \`type\`: \`'text'\` (o puedes omitirlo)
    - **Segundo Objeto (La Siguiente Acción):**
        - \`question\`: \`"¿Quieres que analicemos otra tarea que también te esté quitando tiempo, o prefieres que paremos aquí y te prepare un pequeño informe con lo que hemos visto?"\`
        - \`phase\`: \`'next_action'\`
        - \`type\`: \`'multiple-choice'\`
        - \`options\`: \`["Analizar otra tarea", "Preparar el informe"]\`

**5. FASE 'next_action':**
- **Tu Objetivo:** Darle el control al usuario para decidir el siguiente paso.
- **Lógica de Transición:**
    - Si responde "Analizar otra tarea" (y es la primera tarea analizada), vuelve a la fase \`task_identification\` para buscar la segunda tarea.
    - Si responde "Preparar el informe" o si ya se ha analizado una segunda tarea, pasa a la fase \`result\`.

**6. FASE 'result':**
- **Tu Objetivo:** Finalizar la conversación.
- **Tu Respuesta:** Devuelve un array \`responses\` con un único objeto: \`{ "question": "", "phase": "result" }\`.

**REGLA DE SEGURIDAD FINAL (CRÍTICA):**
- **NO PASES NUNCA a la fase \`result\` si el historial de conversación es corto (ej: menos de 20 entradas).** Es tu responsabilidad continuar la conversación de forma lógica. Si estás atascado, haz una pregunta abierta para desatascar la conversación, pero no la termines prematuramente.

**ESQUEMA JSON DE SALIDA OBLIGATORIO:**
Tu respuesta DEBE ser un único objeto JSON válido que se ajuste a este esquema.
\`\`\`json
{
  "responses": [
    {
      "question": "string",
      "phase": "enum('basic_info', 'task_identification', 'task_analysis', 'reflection', 'next_action', 'result')",
      "type": "enum('text', 'textarea', 'number', 'multiple-choice', 'FREQUENCY_QUESTION').optional()",
      "options": "string[].optional()",
      "optional": "boolean.optional()",
      "hint": "string.optional()"
    }
  ]
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
    // Hard limit to prevent infinite loops.
    if (input.conversationHistory.length >= 20) {
      return { responses: [{ question: '', phase: 'result' }] };
    }
    const {output} = await prompt(input);
    
    // Final safety check for multiple-choice questions
    output?.responses.forEach(response => {
        if (response.type === 'multiple-choice' && (!response.options || response.options.length === 0)) {
            // Fallback: if the AI messes up, ask an open question to recover.
            response.type = 'textarea';
            response.question = "Parece que hubo un pequeño error. ¿Podrías reformular tu respuesta o decirme qué quieres hacer a continuación?";
            response.phase = 'task_analysis'; // Reset to a safe phase
        }
    });
    
    return output!;
  }
);
