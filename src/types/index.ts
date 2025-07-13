export type Phase =
  | "basic_info"
  | "task_identification"
  | "task_analysis"
  | "reflection"
  | "next_action"
  | "result";

export interface Question {
  id: string;
  phase: Phase;
  text: string;
  type: "text" | "number" | "textarea" | "multiple-choice" | "checkbox-suggestions" | "FREQUENCY_QUESTION";
  key: keyof FormData | `custom-${string}`;
  options?: string[];
  optional?: boolean;
  hint?: string;
}

export type ConversationEntry = {
  question: string;
  answer: string;
};
export type Conversation = ConversationEntry[];

export interface FormData {
  userName: string;
  userRole: string;
  userEmail: string;
  userPhone?: string;
  companyName: string;
  sector: string;
  [key: string]: any; // Permitir propiedades dinámicas
}
