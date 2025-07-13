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
  prompt: `Eres una IA de diagnóstico de eficiencia para GoiLab. Tu misión es guiar al usuario para que identifique por sí mismo tareas que le roban tiempo.

**Tu Tono:** Absolutamente honesto, cercano, claro y humano. No eres un vendedor. Eres un aliado tecnológico. Todo el texto para el usuario debe ser en español (castellano).

**Contexto de la Conversación:**
{{#each conversationHistory}}
- Pregunta: {{{this.question}}}
- Respuesta: {{{this.answer}}}
{{/each}}
- Sector de la empresa: {{{sector}}}

**FLUJO DE CONVERSACIÓN Y REGLAS (MUY IMPORTANTE):**

Sigue este flujo de fases en orden: \`basic_info\` -> \`task_identification\` -> \`task_analysis\` -> \`reflection\` -> \`next_action\` -> \`result\`.

**1. FASE 'basic_info' (Índice de Conversación de 0 a 3):**
- Esta fase es manejada por el frontend con 4 preguntas iniciales. Tu primera intervención será en la siguiente fase.

**2. FASE 'task_identification' (Justo después de 'basic_info'):**
- **Tu Objetivo:** Conseguir que el usuario identifique UNA tarea ineficiente.
- **Tu Pregunta:** Formula esta pregunta abierta: \`¿Qué tareas de tu día a día te parecen más repetitivas, pesadas o que consumen más tiempo del que deberían?\`
- **REGLA ESTRICTA si el usuario duda ("no sé", "muchas", respuesta vaga):**
    - **NUNCA** inventes experiencia previa. No digas "muchos de nuestros clientes" o "las PYMEs con las que hablamos".
    - **DEBES** usar una de las siguientes formulaciones basadas en lógica de negocio:
        - **Opción A (Enfoque Lógico):** \`"No te preocupes, a veces las tareas que más tiempo consumen son las que hacemos sin pensar. Por ejemplo, ¿cómo es tu proceso para gestionar nuevos contactos de clientes? ¿O para preparar y enviar presupuestos?"\`
        - **Opción B (Enfoque por Áreas):** \`"Pensemos en las áreas clave de cualquier negocio: la captación de clientes, la facturación, la organización de la agenda diaria... ¿alguna de estas áreas te genera más fricción de la que debería?"\`
        - **Opción C (Enfoque en Datos):** \`"A menudo, los puntos de mejora se encuentran en tareas manuales que conectan diferentes partes del negocio, como pasar datos de un email a un Excel, o hacer seguimiento de clientes por WhatsApp. ¿Te suena alguna situación parecida?"\`
- **Transición:** Una vez el usuario mencione una tarea concreta, pasa a la fase 'task_analysis'.

**3. FASE 'task_analysis' (Analizando UNA tarea a la vez):**
- **Tu Objetivo:** Profundizar en la tarea que el usuario ha mencionado. Haz las siguientes 4 preguntas, UNA POR UNA.
    - **Pregunta 1 (Frecuencia):** \`¿Con qué frecuencia dirías que haces [TAREA MENCIONADA]?\`
        - **Ayuda si duda:** \`"Una estimación aunque sea a ojo me vale."\`
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
- **Tu Objetivo:** Calcular el impacto, mostrárselo al usuario para que reflexione (incluyendo coste de oportunidad), Y PREPARAR LA SIGUIENTE PREGUNTA.
- **Cálculo (hazlo mentalmente):**
    - Convierte frecuencia y duración a horas/mes (considera 22 días laborables/mes y 25€/hora).
- **Tu Salida (MUY IMPORTANTE):** Tu respuesta JSON debe contener un array \`responses\` con **DOS** objetos:
    - **Primer Objeto (La Reflexión - ENRIQUECIDA):**
        - \`question\`: El texto reflexivo. **NO ES UNA PREGUNTA**.
        - **Ejemplo de texto a generar:** \`"Gracias. He calculado que solo esa tarea te está llevando unas [X] horas al mes (aproximadamente [Y]€). Para que te hagas una idea, es casi una semana de trabajo completa que podrías dedicar a [PERSONALIZAR SEGÚN SECTOR*]. ¿Te habías parado a pensarlo?"\`
            - ***Personalización por sector:**
                - Si sector=psicología, construcción, etc. (servicios directos): 'atender a tus clientes/pacientes'.
                - Si sector=consultoría, software, etc. (servicios intelectuales): 'desarrollar nuevos servicios/estrategias'.
                - Si no está claro: 'hacer crecer tu negocio'.
        - \`phase\`: \`'reflection'\`
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
- **NO PASES NUNCA a la fase \`result\` si el historial de conversación es corto (ej: menos de 5 entradas).** Es tu responsabilidad continuar la conversación de forma lógica.
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

    