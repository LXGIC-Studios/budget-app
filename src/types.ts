export interface Transaction {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  note?: string;
  date: string;
  createdAt: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  emoji: string;
  allocated: number;
  type: "fixed" | "flexible";
}

export interface UserProfile {
  monthlyIncome: number;
  currency: string;
  onboardingComplete: boolean;
  emergencyFundGoal: number;
  emergencyFundCurrent: number;
  babyStep: number;
  createdAt: string;
}

export type DebtType = 'credit_card' | 'student_loan' | 'car_loan' | 'mortgage' | 'medical' | 'personal' | 'other';

export interface Debt {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  interestRate: number;
  type: DebtType;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudget {
  month: string;
  categories: BudgetCategory[];
}

export interface Bill {
  name: string;
  amount: number;
  emoji: string;
}

export const EXPENSE_CATEGORIES = [
  { id: "food", name: "Food", emoji: "\uD83C\uDF54" },
  { id: "shopping", name: "Shopping", emoji: "\uD83D\uDED2" },
  { id: "transport", name: "Transport", emoji: "\uD83D\uDE97" },
  { id: "bills", name: "Bills", emoji: "\uD83C\uDFE0" },
  { id: "fun", name: "Fun", emoji: "\uD83C\uDFAE" },
  { id: "health", name: "Health", emoji: "\uD83D\uDC8A" },
  { id: "other", name: "Other", emoji: "\uD83D\uDCE6" },
] as const;

export const INCOME_CATEGORIES = [
  { id: "salary", name: "Salary", emoji: "\uD83D\uDCBC" },
  { id: "freelance", name: "Freelance", emoji: "\uD83D\uDCB8" },
  { id: "transfer", name: "Transfer", emoji: "\uD83C\uDFE6" },
  { id: "other", name: "Other", emoji: "\uD83D\uDCE6" },
] as const;

export const BILL_PRESETS: Bill[] = [
  { name: "Rent", amount: 0, emoji: "\uD83C\uDFE0" },
  { name: "Car", amount: 0, emoji: "\uD83D\uDE97" },
  { name: "Insurance", amount: 0, emoji: "\uD83D\uDEE1\uFE0F" },
  { name: "Phone", amount: 0, emoji: "\uD83D\uDCF1" },
  { name: "Subscriptions", amount: 0, emoji: "\uD83D\uDCFA" },
  { name: "Utilities", amount: 0, emoji: "\uD83D\uDCA1" },
];
