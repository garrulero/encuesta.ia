"use server";

import { generateContextAwareQuestion, type GenerateContextAwareQuestionInput, type GenerateContextAwareQuestionOutput } from "@/ai/flows/generate-context-aware-question";
import { generateInefficiencyReport, type GenerateInefficiencyReportInput, type GenerateInefficiencyReportOutput } from "@/ai/flows/generate-inefficiency-report";

export async function getAIQuestion(input: GenerateContextAwareQuestionInput): Promise<GenerateContextAwareQuestionOutput> {
    try {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            // Fallback response when API key is not available
            return {
                question: "¿Podrías contarme más sobre las tareas que realizas en tu día a día?",
                phase: "problem_detection",
                type: "textarea"
            };
        }
    return await generateContextAwareQuestion(input);
    } catch (error) {
        console.error("Error generating AI question:", error);
        // Fallback response
        return {
            question: "¿Hay alguna tarea específica que sientes que te toma más tiempo del necesario?",
            phase: "problem_detection",
            type: "textarea"
        };
    }
}

export async function getAIReport(input: GenerateInefficiencyReportInput): Promise<GenerateInefficiencyReportOutput> {
    try {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            // Fallback response when API key is not available
            return {
                report: `Estimado/a ${input.userName},

Gracias por completar nuestro diagnóstico interactivo. Basándonos en la información proporcionada, hemos identificado algunas áreas de mejora en ${input.companyName}.

**Tareas ineficientes detectadas:**
${input.inefficientTasks.map(task => `• ${task}`).join('\n')}

**Impacto estimado:**
- Tiempo perdido semanalmente: ${input.weeklyTimeLost} horas
- Tiempo perdido mensualmente: ${Math.round(input.weeklyTimeLost * 4.33)} horas
- Coste estimado mensual: ${Math.round(input.weeklyTimeLost * 4.33 * 25)}€ (estimación conservadora a 25€/hora)

**Recomendaciones:**
Estas ineficiencias representan una oportunidad significativa de mejora. Optimizar estos procesos podría liberar tiempo valioso para actividades más estratégicas.

En GoiLab estamos especializados en ayudar a empresas como la tuya a transformar estas áreas de mejora en resultados reales. ¿Hablamos de cómo podemos recuperar este tiempo para tu negocio?`
            };
        }
    return await generateInefficiencyReport(input);
    } catch (error) {
        console.error("Error generating AI report:", error);
        // Fallback response
        return {
            report: `Estimado/a ${input.userName},

Gracias por completar nuestro diagnóstico. Hemos detectado oportunidades de mejora en ${input.companyName} que podrían generar ahorros significativos de tiempo y recursos.

Para obtener un análisis detallado personalizado, te invitamos a contactar con nuestro equipo de GoiLab.`
        };
    }
}
