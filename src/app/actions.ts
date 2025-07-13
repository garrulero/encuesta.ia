"use server";

import { generateContextAwareQuestion, type GenerateContextAwareQuestionInput, type GenerateContextAwareQuestionOutput } from "@/ai/flows/generate-context-aware-question";
import { generateInefficiencyReport, type GenerateInefficiencyReportInput, type GenerateInefficiencyReportOutput } from "@/ai/flows/generate-inefficiency-report";

export async function getAIQuestion(input: GenerateContextAwareQuestionInput): Promise<GenerateContextAwareQuestionOutput> {
    try {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            throw new Error('API key no configurada');
        }
    return await generateContextAwareQuestion(input);
    } catch (error) {
        console.error('Error en getAIQuestion:', error);
        // Fallback para desarrollo
        return {
            responses: [{
                question: "¿Podrías contarme más sobre las tareas que consumen más tiempo en tu día a día?",
                phase: "task_identification",
                type: "textarea"
            }]
        };
    }
}

export async function getAIReport(input: GenerateInefficiencyReportInput): Promise<GenerateInefficiencyReportOutput> {
    try {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            throw new Error('API key no configurada');
        }
    return await generateInefficiencyReport(input);
    } catch (error) {
        console.error('Error en getAIReport:', error);
        // Fallback para desarrollo
        return {
            report: `Hola ${input.userName},\n\nGracias por completar el diagnóstico. Hemos detectado algunas áreas de mejora en tu empresa ${input.companyName}.\n\nEste es un informe de ejemplo mientras configuramos la conexión con la IA.\n\n¿Te gustaría que te contactemos para discutir las oportunidades de mejora?`
        };
    }
}
