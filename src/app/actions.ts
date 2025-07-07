"use server";

import { generateContextAwareQuestion, type GenerateContextAwareQuestionInput, type GenerateContextAwareQuestionOutput } from "@/ai/flows/generate-context-aware-question";
import { generateInefficiencyReport, type GenerateInefficiencyReportInput, type GenerateInefficiencyReportOutput } from "@/ai/flows/generate-inefficiency-report";

export async function getAIQuestion(input: GenerateContextAwareQuestionInput): Promise<GenerateContextAwareQuestionOutput> {
    return await generateContextAwareQuestion(input);
}

export async function getAIReport(input: GenerateInefficiencyReportInput): Promise<GenerateInefficiencyReportOutput> {
    return await generateInefficiencyReport(input);
}
