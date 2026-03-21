import type { BudgetCategory, Bill } from "./types";
import { generateId } from "./utils";

/**
 * Auto-budget using adapted 50/30/20 rule.
 * Bills are fixed from onboarding. Remaining is split across flexible categories.
 * Savings = 20% of total income always.
 */
export function generateBudgetCategories(
  monthlyIncome: number,
  bills: Bill[]
): BudgetCategory[] {
  const totalBills = bills.reduce((sum, b) => sum + b.amount, 0);
  const savings = Math.round(monthlyIncome * 0.2 * 100) / 100;
  const remaining = monthlyIncome - totalBills - savings;

  const categories: BudgetCategory[] = [
    {
      id: generateId(),
      name: "Bills",
      emoji: "\uD83C\uDFE0",
      allocated: totalBills,
      type: "fixed",
    },
    {
      id: generateId(),
      name: "Food",
      emoji: "\uD83C\uDF54",
      allocated: Math.round(remaining * 0.15 * 100) / 100,
      type: "flexible",
    },
    {
      id: generateId(),
      name: "Transport",
      emoji: "\uD83D\uDE97",
      allocated: Math.round(remaining * 0.1 * 100) / 100,
      type: "flexible",
    },
    {
      id: generateId(),
      name: "Shopping",
      emoji: "\uD83D\uDED2",
      allocated: Math.round(remaining * 0.1 * 100) / 100,
      type: "flexible",
    },
    {
      id: generateId(),
      name: "Fun",
      emoji: "\uD83C\uDFAE",
      allocated: Math.round(remaining * 0.1 * 100) / 100,
      type: "flexible",
    },
    {
      id: generateId(),
      name: "Health",
      emoji: "\uD83D\uDC8A",
      allocated: Math.round(remaining * 0.05 * 100) / 100,
      type: "flexible",
    },
    {
      id: generateId(),
      name: "Savings",
      emoji: "\uD83D\uDCB0",
      allocated: savings,
      type: "flexible",
    },
  ];

  // "Other" gets whatever is left
  const allocated = categories.reduce((s, c) => s + c.allocated, 0);
  const otherAmount = Math.round((monthlyIncome - allocated) * 100) / 100;

  categories.push({
    id: generateId(),
    name: "Other",
    emoji: "\uD83D\uDCE6",
    allocated: Math.max(0, otherAmount),
    type: "flexible",
  });

  return categories;
}
