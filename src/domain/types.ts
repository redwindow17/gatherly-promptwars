export type EventType = 'wedding' | 'birthday' | 'community';
export interface EventBrief {
  timeZone?: string;
  title: string;
  type: EventType;
  date: string;
  location: string;
  guests: number;
  budgetPaise: number;
  priorities: string[];
  notes: string;
}
export interface AIAdvice {
  summary: string;
  budget: { category: string; weight: number; rationale: string }[];
  tasks: { title: string; daysBefore: number; owner: string }[];
  vendors: { category: string; questions: string[] }[];
  ideas: { title: string; description: string }[];
  cautions: string[];
}
export interface BudgetItem {
  id: string;
  category: string;
  amountPaise: number;
  rationale: string;
}
export interface Task {
  id: string;
  title: string;
  date: string;
  owner: string;
  done: boolean;
  urgent: boolean;
}
export interface Vendor {
  id: string;
  category: string;
  questions: { id: string; text: string; done: boolean }[];
}
export interface Plan {
  id: string;
  createdAt: string;
  brief: EventBrief;
  budgetItems: BudgetItem[];
  reservePaise: number;
  tasks: Task[];
  vendors: Vendor[];
  ideas: AIAdvice['ideas'];
  summary: string;
  cautions: string[];
  source: 'gemini' | 'starter';
  ai?: { prompt: string; response: string; model: string };
}
export interface GenerateResponse {
  plan: Plan;
}
export interface BudgetSummary {
  allocatedPaise: number;
  committedPaise: number;
  remainingPaise: number;
  overBudgetPaise: number;
  perGuestPaise: number;
}
