import { AppState } from 'react-native';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { Transaction, UserProfile, MonthlyBudget, BudgetCategory, Debt, Household, HouseholdMember, AccountTag, ScheduledTransaction } from "../types";
import * as storage from "../storage";
import { invalidateAuthCache } from "../storage";
import { supabase } from "../lib/supabase";
import { getMonthKey, generateId, getTodayCT, dateToNoonISO } from "../utils";

// Known ending balance from bank data as of Dec 31, 2025
const DEC_2025_ENDING_BALANCE = 1373;

interface AppState {
  profile: UserProfile | null;
  transactions: Transaction[];
  currentBudget: MonthlyBudget | null;
  currentMonth: string;
  debts: Debt[];
  userAccounts: AccountTag[];
  loading: boolean;
  household: Household | null;
  householdMembers: HouseholdMember[];
  scheduledTransactions: ScheduledTransaction[];
}

interface AppContextValue extends AppState {
  monthlyRollover: number;
  setCurrentMonth: (month: string) => void;
  reload: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  addTransaction: (txn: Transaction) => Promise<void>;
  addTransactions: (txns: Transaction[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => Promise<void>;
  saveBudget: (budget: MonthlyBudget) => Promise<void>;
  addDebt: (debt: Debt) => Promise<void>;
  updateDebt: (id: string, updates: Partial<Omit<Debt, "id" | "createdAt">>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addUserAccount: (label: string, emoji: string) => Promise<void>;
  deleteUserAccount: (id: string) => Promise<void>;
  updateEmergencyFund: (amount: number) => Promise<void>;
  addScheduledTransaction: (st: ScheduledTransaction) => Promise<void>;
  updateScheduledTransaction: (id: string, updates: Partial<Omit<ScheduledTransaction, "id" | "createdAt">>) => Promise<void>;
  deleteScheduledTransaction: (id: string) => Promise<void>;
  resetAll: () => Promise<void>;
  createHousehold: (name: string) => Promise<boolean>;
  joinHousehold: (code: string) => Promise<boolean>;
  leaveHousehold: () => Promise<void>;
  createCategory: (category: Omit<BudgetCategory, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Omit<BudgetCategory, 'id'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    profile: null,
    transactions: [],
    currentBudget: null,
    currentMonth: getMonthKey(),
    debts: [],
    userAccounts: [],
    loading: true,
    household: null,
    householdMembers: [],
    scheduledTransactions: [],
  });

  const loadData = useCallback(async (month?: string) => {
    const targetMonth = month ?? getMonthKey();
    const [profile, transactions, budget, debts, userAccounts, household, householdMembers, scheduledTransactions] = await Promise.all([
      storage.getProfile(),
      storage.getTransactions(),
      storage.getBudgetForMonth(targetMonth),
      storage.getDebts(),
      storage.getUserAccounts(),
      storage.getHousehold(),
      storage.getHouseholdMembers(),
      storage.getScheduledTransactions(),
    ]);

    // Auto-create transactions for any scheduled items due today (CT date)
    const today = getTodayCT();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Helper: check if a scheduled transaction is due today
    function isScheduledDueToday(st: { frequency: string; dayOfMonth: number; startDate?: string }): boolean {
      const freq = st.frequency || "monthly";
      if (freq === "monthly") {
        return today.getDate() === st.dayOfMonth;
      }
      if (freq === "weekly") {
        // dayOfMonth stores day-of-week: 0=Mon, 1=Tue, ... 6=Sun
        const jsDay = today.getDay(); // 0=Sun..6=Sat
        const isoDay = jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon..6=Sun
        return isoDay === st.dayOfMonth;
      }
      return false;
    }

    // Check if we've already created this scheduled transaction today
    const hasTransactionToday = (st: any): boolean => {
      return transactions.some(
        (txn) =>
          txn.date === todayKey &&
          txn.category === st.category &&
          txn.amount === st.amount &&
          txn.type === st.type
      );
    };

    // Auto-create scheduled transactions
    for (const st of scheduledTransactions) {
      if (isScheduledDueToday(st) && !hasTransactionToday(st)) {
        try {
          const newTxn: Transaction = {
            id: generateId(),
            type: st.type,
            amount: st.amount,
            category: st.category,
            note: `Auto: ${st.description}`,
            date: todayKey,
            createdAt: new Date().toISOString(),
          };
          await storage.addTransaction(newTxn);
        } catch (error) {
          console.warn("Failed to auto-create scheduled transaction:", error);
        }
      }
    }

    setState({
      profile,
      transactions,
      currentBudget: budget,
      currentMonth: targetMonth,
      debts,
      userAccounts,
      loading: false,
      household,
      householdMembers,
      scheduledTransactions,
    });
  }, []);

  const reload = useCallback(() => loadData(state.currentMonth), [loadData, state.currentMonth]);

  const setCurrentMonth = useCallback(
    async (month: string) => {
      setState((prev) => ({ ...prev, currentMonth: month }));
      await loadData(month);
    },
    [loadData]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App became active, reload data to get latest
        reload();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [reload]);

  const saveProfile = useCallback(async (profile: UserProfile) => {
    setState((prev) => ({ ...prev, profile }));
    await storage.saveProfile(profile);
  }, []);

  const addTransaction = useCallback(
    async (txn: Transaction) => {
      setState((prev) => ({
        ...prev,
        transactions: [txn, ...prev.transactions],
      }));
      await storage.addTransaction(txn);
    },
    []
  );

  const addTransactions = useCallback(
    async (txns: Transaction[]) => {
      setState((prev) => ({
        ...prev,
        transactions: [...txns, ...prev.transactions],
      }));
      await storage.addTransactions(txns);
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((txn) => txn.id !== id),
    }));
    await storage.deleteTransaction(id);
  }, []);

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((txn) =>
          txn.id === id ? { ...txn, ...updates } : txn
        ),
      }));
      await storage.updateTransaction(id, updates);
    },
    []
  );

  const saveBudget = useCallback(
    async (budget: MonthlyBudget) => {
      // saveBudgetForMonth returns budget with DB-assigned IDs
      const saved = await storage.saveBudgetForMonth(budget);
      setState((prev) => ({ ...prev, currentBudget: saved }));
    },
    []
  );

  const addDebt = useCallback(async (debt: Debt) => {
    setState((prev) => ({ ...prev, debts: [...prev.debts, debt] }));
    await storage.addDebt(debt);
  }, []);

  const updateDebt = useCallback(
    async (id: string, updates: Partial<Omit<Debt, "id" | "createdAt">>) => {
      setState((prev) => ({
        ...prev,
        debts: prev.debts.map((debt) =>
          debt.id === id ? { ...debt, ...updates, updatedAt: new Date().toISOString() } : debt
        ),
      }));
      await storage.updateDebt(id, updates);
    },
    []
  );

  const deleteDebt = useCallback(async (id: string) => {
    setState((prev) => ({
      ...prev,
      debts: prev.debts.filter((debt) => debt.id !== id),
    }));
    await storage.deleteDebt(id);
  }, []);

  // User account actions
  const addUserAccountAction = useCallback(async (label: string, emoji: string) => {
    const id = generateId();
    const account = { id, label, emoji };
    setState((prev) => ({ ...prev, userAccounts: [...prev.userAccounts, account] }));
    await storage.addUserAccount(account);
  }, []);

  const deleteUserAccountAction = useCallback(async (id: string) => {
    setState((prev) => ({
      ...prev,
      userAccounts: prev.userAccounts.filter((acc) => acc.id !== id),
    }));
    await storage.deleteUserAccount(id);
  }, []);

  const updateEmergencyFund = useCallback(
    async (amount: number) => {
      if (!state.profile) return;
      const updated = { ...state.profile, emergencyFundCurrent: amount };
      setState((prev) => ({ ...prev, profile: updated }));
      await storage.saveProfile(updated);
    },
    [state.profile]
  );

  // Scheduled transactions
  const addScheduledTransactionAction = useCallback(async (st: ScheduledTransaction) => {
    setState((prev) => ({
      ...prev,
      scheduledTransactions: [...prev.scheduledTransactions, st],
    }));
    await storage.addScheduledTransaction(st);
  }, []);

  const updateScheduledTransactionAction = useCallback(
    async (id: string, updates: Partial<Omit<ScheduledTransaction, "id" | "createdAt">>) => {
      setState((prev) => ({
        ...prev,
        scheduledTransactions: prev.scheduledTransactions.map((st) =>
          st.id === id ? { ...st, ...updates } : st
        ),
      }));
      await storage.updateScheduledTransaction(id, updates);
    },
    []
  );

  const deleteScheduledTransactionAction = useCallback(async (id: string) => {
    setState((prev) => ({
      ...prev,
      scheduledTransactions: prev.scheduledTransactions.filter((st) => st.id !== id),
    }));
    await storage.deleteScheduledTransaction(id);
  }, []);

  // Household actions
  const createHouseholdAction = useCallback(async (name: string): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return false;

      const { data: household, error } = await supabase.rpc('create_household', { household_name: name });
      if (error) throw error;

      invalidateAuthCache();
      await reload();
      return true;
    } catch (error) {
      console.error('Create household error:', error);
      return false;
    }
  }, [reload]);

  const joinHouseholdAction = useCallback(async (code: string): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return false;

      const { error } = await supabase.rpc('join_household', { invite_code: code });
      if (error) throw error;

      invalidateAuthCache();
      await reload();
      return true;
    } catch (error) {
      console.error('Join household error:', error);
      return false;
    }
  }, [reload]);

  const leaveHouseholdAction = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      await supabase.from('household_members').delete().eq('user_id', data.user.id);
      await supabase.from('profiles').update({ household_id: null }).eq('id', data.user.id);

      invalidateAuthCache();
      await reload();
    } catch (error) {
      console.error('Leave household error:', error);
    }
  }, [reload]);

  // Starting from DEC_2025_ENDING_BALANCE, sum all REAL income and subtract
  // all REAL expenses for every month BEFORE currentMonth.
  // Transfers are excluded - they don't change net worth.
  const monthlyRollover = useMemo(() => {
    let balance = DEC_2025_ENDING_BALANCE;
    for (const t of state.transactions) {
      const txnMonth = t.date.substring(0, 7); // "YYYY-MM"
      if (txnMonth < "2026-01") continue; // before our starting point
      if (txnMonth >= state.currentMonth) continue; // not a prior month
      // Skip transfers - they don't affect net balance
      if (t.type === "transfer" || t.category === "transfer") continue;
      if (t.type === "income") {
        balance += t.amount;
      } else {
        balance -= t.amount;
      }
    }
    return balance;
  }, [state.transactions, state.currentMonth]);

  const resetAll = useCallback(async () => {
    await storage.resetAllData();
    setState({
      profile: null,
      transactions: [],
      currentBudget: null,
      currentMonth: getMonthKey(),
      debts: [],
      userAccounts: [],
      loading: false,
      household: null,
      householdMembers: [],
      scheduledTransactions: [],
    });
  }, []);

  // SIMPLIFIED CATEGORY FUNCTIONS - Direct DB operations instead of full budget save
  const createCategory = useCallback(async (categoryData: Omit<BudgetCategory, 'id'>) => {
    const newCategory: BudgetCategory = {
      ...categoryData,
      id: generateId(),
    };
    
    let budget = state.currentBudget;
    if (!budget) {
      budget = {
        month: state.currentMonth,
        categories: [],
      };
    }
    
    const updatedBudget = {
      ...budget,
      categories: [...budget.categories, newCategory],
    };
    
    // Use the existing saveBudget function which handles DB sync properly
    await saveBudget(updatedBudget);
  }, [state.currentBudget, state.currentMonth, saveBudget]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Omit<BudgetCategory, 'id'>>) => {
    if (!state.currentBudget) return;
    
    const updatedBudget = {
      ...state.currentBudget,
      categories: state.currentBudget.categories.map(cat => 
        cat.id === id ? { ...cat, ...updates } : cat
      ),
    };
    
    // Use the existing saveBudget function which handles DB sync properly
    await saveBudget(updatedBudget);
  }, [state.currentBudget, saveBudget]);

  const deleteCategory = useCallback(async (id: string) => {
    console.log('deleteCategory called with ID:', id);
    if (!state.currentBudget) {
      console.log('No current budget found');
      return;
    }
    
    console.log('Current budget categories:', state.currentBudget.categories.length);
    const updatedBudget = {
      ...state.currentBudget,
      categories: state.currentBudget.categories.filter(cat => cat.id !== id),
    };
    
    console.log('Updated budget categories:', updatedBudget.categories.length);
    
    try {
      // Use the existing saveBudget function which handles DB sync properly
      await saveBudget(updatedBudget);
      console.log('Budget saved successfully via saveBudget');
    } catch (error) {
      console.error('Error saving budget:', error);
      throw error;
    }
  }, [state.currentBudget, saveBudget]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!state.profile) return;
    
    const updatedProfile = {
      ...state.profile,
      ...updates,
    };
    
    setState(prev => ({ ...prev, profile: updatedProfile }));
    await storage.saveProfile(updatedProfile);
  }, [state.profile]);

  return (
    <AppContext.Provider
      value={{
        ...state,
        monthlyRollover,
        setCurrentMonth,
        reload,
        saveProfile,
        addTransaction,
        addTransactions,
        deleteTransaction,
        updateTransaction,
        saveBudget,
        addDebt,
        updateDebt,
        deleteDebt,
        addUserAccount: addUserAccountAction,
        deleteUserAccount: deleteUserAccountAction,
        updateEmergencyFund,
        addScheduledTransaction: addScheduledTransactionAction,
        updateScheduledTransaction: updateScheduledTransactionAction,
        deleteScheduledTransaction: deleteScheduledTransactionAction,
        resetAll,
        createHousehold: createHouseholdAction,
        joinHousehold: joinHouseholdAction,
        leaveHousehold: leaveHouseholdAction,
        createCategory,
        updateCategory,
        deleteCategory,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    // Return a safe default when outside AppProvider (e.g. login screen on web)
    return {
      profile: null,
      transactions: [],
      currentBudget: null,
      currentMonth: getMonthKey(),
      debts: [],
      loading: true,
      household: null,
      householdMembers: [],
      monthlyRollover: 0,
      setCurrentMonth: () => {},
      reload: async () => {},
      saveProfile: async () => {},
      addTransaction: async () => {},
      addTransactions: async () => {},
      deleteTransaction: async () => {},
      updateTransaction: async () => {},
      saveBudget: async () => {},
      addDebt: async () => {},
      updateDebt: async () => {},
      deleteDebt: async () => {},
      addUserAccount: async () => {},
      deleteUserAccount: async () => {},
      updateEmergencyFund: async () => {},
      addScheduledTransaction: async () => {},
      updateScheduledTransaction: async () => {},
      deleteScheduledTransaction: async () => {},
      resetAll: async () => {},
      scheduledTransactions: [],
      createHousehold: async () => false,
      joinHousehold: async () => false,
      leaveHousehold: async () => {},
      createCategory: async () => {},
      updateCategory: async () => {},
      deleteCategory: async () => {},
      updateProfile: async () => {},
    } as AppContextValue;
  }
  return ctx;
}