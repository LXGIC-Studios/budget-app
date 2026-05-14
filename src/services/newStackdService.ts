import { supabase } from '../lib/supabase';
import { IncomeSource, FixedExpense, Payment, HouseholdSettings, PaymentStatus } from '../types-new';

export class NewStackdService {
  // Income Sources CRUD
  static async getIncomeSources(householdId: string): Promise<IncomeSource[]> {
    const { data, error } = await supabase
      .from('income_sources')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createIncomeSource(source: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<IncomeSource> {
    const { data, error } = await supabase
      .from('income_sources')
      .insert({
        name: source.name,
        amount: source.amount,
        frequency: source.frequency,
        day_of_week: source.dayOfWeek,
        day_of_month: source.dayOfMonth,
        start_date: source.startDate,
        active: source.active,
        household_id: source.householdId,
        created_by: source.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapIncomeSourceFromDB(data);
  }

  static async updateIncomeSource(id: string, updates: Partial<IncomeSource>): Promise<IncomeSource> {
    const { data, error } = await supabase
      .from('income_sources')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.frequency && { frequency: updates.frequency }),
        ...(updates.dayOfWeek !== undefined && { day_of_week: updates.dayOfWeek }),
        ...(updates.dayOfMonth !== undefined && { day_of_month: updates.dayOfMonth }),
        ...(updates.startDate !== undefined && { start_date: updates.startDate }),
        ...(updates.active !== undefined && { active: updates.active }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapIncomeSourceFromDB(data);
  }

  static async deleteIncomeSource(id: string): Promise<void> {
    const { error } = await supabase
      .from('income_sources')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Fixed Expenses CRUD
  static async getFixedExpenses(householdId: string): Promise<FixedExpense[]> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(this.mapFixedExpenseFromDB) || [];
  }

  static async createFixedExpense(expense: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<FixedExpense> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        name: expense.name,
        amount: expense.amount,
        frequency: expense.frequency,
        due_day: expense.dueDay,
        auto_deducted: expense.autoDeducted,
        category: expense.category,
        emoji: expense.emoji,
        active: expense.active,
        household_id: expense.householdId,
        created_by: expense.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapFixedExpenseFromDB(data);
  }

  static async updateFixedExpense(id: string, updates: Partial<FixedExpense>): Promise<FixedExpense> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.frequency && { frequency: updates.frequency }),
        ...(updates.dueDay !== undefined && { due_day: updates.dueDay }),
        ...(updates.autoDeducted !== undefined && { auto_deducted: updates.autoDeducted }),
        ...(updates.category && { category: updates.category }),
        ...(updates.emoji && { emoji: updates.emoji }),
        ...(updates.active !== undefined && { active: updates.active }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFixedExpenseFromDB(data);
  }

  static async deleteFixedExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('fixed_expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Payments CRUD
  static async getPayments(householdId: string, startDate?: string, endDate?: string): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select('*')
      .eq('household_id', householdId);

    if (startDate) {
      query = query.gte('due_date', startDate);
    }
    if (endDate) {
      query = query.lte('due_date', endDate);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;
    return data?.map(this.mapPaymentFromDB) || [];
  }

  static async createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        expense_id: payment.expenseId,
        due_date: payment.dueDate,
        paid_date: payment.paidDate,
        amount: payment.amount,
        status: payment.status,
        household_id: payment.householdId,
        paid_by: payment.paidBy,
        notes: payment.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapPaymentFromDB(data);
  }

  static async updatePaymentStatus(id: string, status: PaymentStatus, paidBy?: string): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .update({
        status,
        paid_date: status === 'paid' ? new Date().toISOString().split('T')[0] : null,
        paid_by: status === 'paid' ? paidBy : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapPaymentFromDB(data);
  }

  static async deletePayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Household Settings
  static async getHouseholdSettings(householdId: string): Promise<HouseholdSettings | null> {
    const { data, error } = await supabase
      .from('household_settings')
      .select('*')
      .eq('household_id', householdId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data ? this.mapHouseholdSettingsFromDB(data) : null;
  }

  static async upsertHouseholdSettings(settings: Omit<HouseholdSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<HouseholdSettings> {
    const { data, error } = await supabase
      .from('household_settings')
      .upsert({
        household_id: settings.householdId,
        savings_target_weekly: settings.savingsTargetWeekly,
        savings_target_monthly: settings.savingsTargetMonthly,
        view_mode: settings.viewMode,
        currency: settings.currency,
        timezone: settings.timezone,
        created_by: settings.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapHouseholdSettingsFromDB(data);
  }

  // Payment Generation - create payments for expenses
  static async generatePaymentsForExpense(expenseId: string, householdId: string): Promise<void> {
    // Get the expense details
    const { data: expense, error: expenseError } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (expenseError) throw expenseError;

    // Generate next payment based on frequency
    const nextDueDate = this.calculateNextDueDate(expense);
    
    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('expense_id', expenseId)
      .eq('due_date', nextDueDate)
      .single();

    if (!existingPayment) {
      await this.createPayment({
        expenseId,
        dueDate: nextDueDate,
        amount: expense.amount,
        status: expense.auto_deducted ? 'auto-paid' : 'pending',
        householdId,
      });
    }
  }

  private static calculateNextDueDate(expense: any): string {
    const now = new Date();
    let dueDate: Date;

    switch (expense.frequency) {
      case 'weekly':
        dueDate = new Date();
        const currentDay = dueDate.getDay();
        const targetDay = expense.due_day; // 0=Sunday, 1=Monday, etc.
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        dueDate.setDate(dueDate.getDate() + (daysUntilTarget || 7));
        break;

      case 'monthly':
        dueDate = new Date(now.getFullYear(), now.getMonth(), expense.due_day);
        if (dueDate <= now) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        break;

      case 'yearly':
        dueDate = new Date(now.getFullYear(), now.getMonth(), expense.due_day);
        if (dueDate <= now) {
          dueDate.setFullYear(dueDate.getFullYear() + 1);
        }
        break;

      default:
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Fallback
    }

    return dueDate.toISOString().split('T')[0];
  }

  // DB Mapping functions
  private static mapIncomeSourceFromDB(data: any): IncomeSource {
    return {
      id: data.id,
      name: data.name,
      amount: parseFloat(data.amount),
      frequency: data.frequency,
      dayOfWeek: data.day_of_week,
      dayOfMonth: data.day_of_month,
      startDate: data.start_date,
      active: data.active,
      householdId: data.household_id,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapFixedExpenseFromDB(data: any): FixedExpense {
    return {
      id: data.id,
      name: data.name,
      amount: parseFloat(data.amount),
      frequency: data.frequency,
      dueDay: data.due_day,
      autoDeducted: data.auto_deducted,
      category: data.category,
      emoji: data.emoji,
      active: data.active,
      householdId: data.household_id,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapPaymentFromDB(data: any): Payment {
    return {
      id: data.id,
      expenseId: data.expense_id,
      dueDate: data.due_date,
      paidDate: data.paid_date,
      amount: parseFloat(data.amount),
      status: data.status,
      householdId: data.household_id,
      paidBy: data.paid_by,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  private static mapHouseholdSettingsFromDB(data: any): HouseholdSettings {
    return {
      id: data.id,
      householdId: data.household_id,
      savingsTargetWeekly: data.savings_target_weekly ? parseFloat(data.savings_target_weekly) : undefined,
      savingsTargetMonthly: data.savings_target_monthly ? parseFloat(data.savings_target_monthly) : undefined,
      viewMode: data.view_mode,
      currency: data.currency,
      timezone: data.timezone,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}