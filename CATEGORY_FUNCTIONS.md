# Category Management Functions

## Problem
Bills calendar is calling createCategory/updateCategory/deleteCategory functions that don't exist in AppContext.

## Solution
Add these functions to AppContext to manage budget categories:

1. **createCategory** - Add new category to current budget
2. **updateCategory** - Update existing category 
3. **deleteCategory** - Remove category from budget

## Implementation
Categories are stored in MonthlyBudget.categories array. Functions will:
- Get current budget for current month
- Modify categories array
- Save updated budget back to storage

## Budget Structure
```
MonthlyBudget {
  month: "2026-05" 
  categories: BudgetCategory[]
}

BudgetCategory {
  id: string
  name: string
  emoji: string
  allocated: number
  type: "fixed" | "flexible"
  frequency?: BillFrequency
  dueDay?: number
}
```