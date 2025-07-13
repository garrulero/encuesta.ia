"use server";

import { generateContextAwareQuestion, type GenerateContextAwareQuestionInput, type GenerateContextAwareQuestionOutput } from "@/ai/flows/generate-context-aware-question";
import { generateInefficiencyReport, type GenerateInefficiencyReportInput, type GenerateInefficiencyReportOutput } from "@/ai/flows/generate-inefficiency-report";

export async function getAIQuestion(input: GenerateContextAwareQuestionInput): Promise<GenerateContextAwareQuestionOutput> {
    try {
        return await generateContextAwareQuestion(input);
    } catch (error) {
        console.error('Error en getAIQuestion:', error);
        throw error;
    }
}

export async function getAIReport(input: GenerateInefficiencyReportInput): Promise<GenerateInefficiencyReportOutput> {
    try {
        return await generateInefficiencyReport(input);
    } catch (error) {
        console.error('Error en getAIReport:', error);
        throw error;
    }
}
