export interface CaseStudyFiles {
  "README.md": string;
  "PROBLEM_STATEMENT.md": string;
  "APPROACH.md": string;
  "EXECUTION.md": string;
  "RESULTS.md": string;
  "LESSONS_LEARNED.md": string;
}

export type FileName = keyof CaseStudyFiles;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface MetricCardData {
  title: string;
  before: string | number;
  after: string | number;
  change: string;
  savings?: string;
  description: string;
}
