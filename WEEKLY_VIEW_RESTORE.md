# Weekly View Restoration Plan

## Current State
- Budget screen has been completely rebuilt with new Stackd-style design
- Only shows monthly view currently 
- Missing weekly breakdown functionality that was removed March 29, 2026

## What Needs to be Added Back

### 1. Weekly Utilities (✅ Already Present)
- `getWeekKey()`, `getWeekRange()`, `formatWeekLabel()`, `shiftWeek()` - all in utils.ts
- `getWeeklyAmount()` function for converting amounts to weekly

### 2. View Mode Toggle
- Monthly/Weekly toggle pills at top
- Navigation for week vs month

### 3. Weekly Breakdown Card
- Weekly paycheck amount
- Bills set-aside amount  
- Left for spending

### 4. Frequency Support
- Bring back frequency picker in edit modal
- Support weekly, biweekly, monthly, etc. bills
- Display frequency badges on expense cards

### 5. Weekly Amount Calculations
- Convert all amounts to weekly equivalent when in weekly view
- Weekly transaction filtering

## Implementation Plan
1. Add missing weekly utility functions to budget screen
2. Add view mode state and toggle UI
3. Add weekly summary card
4. Restore frequency options in expense form
5. Update expense display to show frequency
6. Add weekly transaction filtering

## User Benefit
Restores the daily-use weekly budgeting workflow that was critical for user's budget management.