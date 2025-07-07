export type Phase =
  | "basic_info"
  | "problem_detection"
  | "time_calculation"
  | "context_data"
  | "result";

export interface Question {
  id: string;
  phase: Phase;
  text: string;
  type: "text" | "number" | "textarea" | "multiple-choice";
  key: keyof FormData | `custom-${string}`;
  options?: string[];
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
  companyName: string;
  sector: string;
  tools: string;
  dataStorage: string;
  weeklyTasks: string;
  inefficientTasks: string[];
  timeLostDetails: Array<{ task: string, frequency: number, duration: number }>;
  weeklyTimeLost: number;
  companySize: number;
  companyDescription: string;
  comments: string;
  consent: boolean;
}
