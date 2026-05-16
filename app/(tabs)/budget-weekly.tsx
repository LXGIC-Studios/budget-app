import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Edit3, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { StatCard } from "../../src/components/StatCard";
import {
  formatCurrency,
  getMonthlyAmount,
  formatMonthLabel,
  shiftMonth,
  getWeekKey,
  getWeekRange,
  formatWeekLabel,
  shiftWeek,
} from "../../src/utils";

// Add the missing frequency types and functions
type BillFrequency = "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "yearly";

const FREQUENCY_OPTIONS: { value: BillFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Bimonthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

/** Convert a category's allocated amount to its weekly equivalent */
function getWeeklyAmount(allocated: number, frequency: BillFrequency): number {
  switch (frequency) {
    case "weekly":
      return allocated;
    case "biweekly":
      return allocated / 2.17;
    case "monthly":
      return allocated / 4.33;
    case "bimonthly":
      return allocated / (4.33 * 2);
    case "quarterly":
      return allocated / 13;
    case "yearly":
      return allocated / 52;
    default:
      return allocated / 4.33;
  }
}

export default function BudgetWeeklyScreen() {
  const { profile, updateProfile, currentBudget, currentMonth, setCurrentMonth, 
          createCategory, updateCategory, deleteCategory, transactions } = useApp();
  
  // View mode state
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  
  // Form states
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState(profile?.monthlyIncome?.toString() || "12926");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    emoji: "💰",
    allocated: "",
    frequency: "monthly" as BillFrequency,
    dueDay: "",
  });

  const monthlyIncome = profile?.monthlyIncome ?? 12926;
  const weeklyIncome = monthlyIncome / 4.33;

  // Get all categories
  const allCategories = currentBudget?.categories ?? [];
  
  // Monthly transactions
  const monthTxns = useMemo(
    () =>
      transactions.filter(
        (t) => t.type === "expense" && t.date.startsWith(currentMonth)
      ),
    [transactions, currentMonth]
  );

  // Weekly transactions
  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);
  const weekTxns = useMemo(
    () =>
      transactions.filter((t) => {
        if (t.type !== "expense") return false;
        const d = new Date(t.date);
        return d >= weekRange.start && d <= weekRange.end;
      }),
    [transactions, weekRange]
  );

  const activeTxns = viewMode === "weekly" ? weekTxns : monthTxns;

  // Calculate spent amounts by category
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    activeTxns.forEach((t) => {
      const key = t.category.toLowerCase();
      map[key] = (map[key] || 0) + t.amount;
    });
    return map;
  }, [activeTxns]);

  // Calculate totals
  const totalBudgetMonthly = useMemo(
    () =>
      allCategories.reduce(
        (s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"),
        0
      ),
    [allCategories]
  );

  const totalBudgetWeekly = useMemo(
    () =>
      allCategories.reduce(
        (s, c) => s + getWeeklyAmount(c.allocated, (c.frequency as BillFrequency) || "monthly"),
        0
      ),
    [allCategories]
  );

  const weeklyLeftForSpending = weeklyIncome - totalBudgetWeekly;
  const monthlyLeftForSpending = monthlyIncome - totalBudgetMonthly;

  // Navigation functions
  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  const navigateWeek = (delta: number) => {
    impact("Light");
    setCurrentWeek(shiftWeek(currentWeek, delta));
  };

  const switchViewMode = (mode: "monthly" | "weekly") => {
    setViewMode(mode);
    impact("Light");
  };

  // Expense management functions
  const saveIncome = async () => {
    const newIncome = parseFloat(incomeValue);
    if (isNaN(newIncome) || newIncome < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid income amount");
      return;
    }
    
    await updateProfile({ monthlyIncome: newIncome });
    setEditingIncome(false);
    impact("Light");
  };

  const openExpenseForm = (expense?: any) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        name: expense.name,
        emoji: expense.emoji,
        allocated: expense.allocated.toString(),
        frequency: (expense.frequency as BillFrequency) || "monthly",
        dueDay: expense.dueDay?.toString() || "",
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        name: "",
        emoji: "💰",
        allocated: "",
        frequency: "monthly",
        dueDay: "",
      });
    }
    setShowExpenseForm(true);
  };

  const closeExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const saveExpense = async () => {
    if (!expenseForm.name.trim() || !expenseForm.allocated) {
      Alert.alert("Missing Info", "Please enter name and amount");
      return;
    }

    const amount = parseFloat(expenseForm.allocated);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    const expenseData = {
      name: expenseForm.name.trim(),
      emoji: expenseForm.emoji,
      allocated: amount,
      frequency: expenseForm.frequency,
      type: "fixed" as const,
      dueDay: expenseForm.dueDay ? parseInt(expenseForm.dueDay) : undefined,
    };

    try {
      if (editingExpense) {
        await updateCategory(editingExpense.id, expenseData);
      } else {
        await createCategory(expenseData);
      }
      closeExpenseForm();
      impact("Light");
    } catch (error) {
      Alert.alert("Error", "Failed to save expense");
    }
  };

  const handleDeleteExpense = (expense: any) => {
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete "${expense.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(expense.id);
              impact("Light");
            } catch (error) {
              Alert.alert("Error", "Failed to delete expense");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>BUDGET</Text>
          <Text style={styles.headerSubtitle}>Weekly & Monthly Budget Management</Text>
        </View>

        {/* Period navigation */}
        {viewMode === "monthly" ? (
          <View style={styles.periodRow}>
            <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
              <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
            <Text style={styles.periodLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
            <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
              <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.periodRow}>
            <Pressable onPress={() => navigateWeek(-1)} hitSlop={12}>
              <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
            <Text style={styles.periodLabel}>{formatWeekLabel(currentWeek).toUpperCase()}</Text>
            <Pressable onPress={() => navigateWeek(1)} hitSlop={12}>
              <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>
        )}

        {/* View mode toggle */}
        <View style={styles.viewToggleRow}>
          <Pressable
            onPress={() => switchViewMode("monthly")}
            style={[
              styles.viewToggleBtn,
              viewMode === "monthly" && styles.viewToggleBtnActive,
            ]}
          >
            <Text style={[styles.viewToggleText, viewMode === "monthly" && styles.viewToggleTextActive]}>
              MONTHLY
            </Text>
          </Pressable>
          <Pressable
            onPress={() => switchViewMode("weekly")}
            style={[
              styles.viewToggleBtn,
              viewMode === "weekly" && styles.viewToggleBtnActive,
            ]}
          >
            <Text style={[styles.viewToggleText, viewMode === "weekly" && styles.viewToggleTextActive]}>
              WEEKLY
            </Text>
          </Pressable>
        </View>

        {/* Monthly Income Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MONTHLY INCOME</Text>
          
          {editingIncome ? (
            <View style={styles.editCard}>
              <TextInput
                style={styles.textInput}
                value={incomeValue}
                onChangeText={setIncomeValue}
                keyboardType="numeric"
                placeholder="Enter monthly income"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <View style={styles.editActions}>
                <Pressable onPress={() => setEditingIncome(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </Pressable>
                <Pressable onPress={saveIncome} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>SAVE</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setEditingIncome(true)} style={styles.incomeCard}>
              <View style={styles.incomeContent}>
                <Text style={styles.incomeEmoji}>💵</Text>
                <View style={styles.incomeDetails}>
                  <Text style={styles.incomeLabel}>TOTAL MONTHLY INCOME</Text>
                  <Text style={styles.incomeAmount}>{formatCurrency(monthlyIncome)}</Text>
                  <Text style={styles.incomeWeekly}>Weekly: {formatCurrency(weeklyIncome)}</Text>
                </View>
                <Edit3 size={20} color={colors.textSecondary} />
              </View>
            </Pressable>
          )}
        </View>

        {/* Summary - Monthly or Weekly Breakdown */}
        {viewMode === "monthly" ? (
          <View style={styles.summaryRow}>
            <StatCard
              emoji="💵"
              label="Income"
              value={formatCurrency(monthlyIncome)}
              accentColor={colors.primary}
              variant="positive"
            />
            <StatCard
              emoji="🏠"
              label="Budgeted"
              value={formatCurrency(totalBudgetMonthly)}
              accentColor={totalBudgetMonthly > monthlyIncome ? colors.red : colors.yellow}
              variant={totalBudgetMonthly > monthlyIncome ? "negative" : "neutral"}
            />
            <StatCard
              emoji="💰"
              label="Remaining"
              value={formatCurrency(monthlyLeftForSpending)}
              accentColor={monthlyLeftForSpending >= 0 ? colors.primary : colors.red}
              variant={monthlyLeftForSpending >= 0 ? "positive" : "negative"}
            />
          </View>
        ) : (
          /* Weekly Breakdown Card */
          <View style={styles.weeklyCard}>
            <Text style={styles.weeklyCardTitle}>WEEKLY BREAKDOWN</Text>
            <View style={styles.weeklyCardRows}>
              <View style={styles.weeklyCardRow}>
                <Text style={styles.weeklyCardLabel}>Weekly Paycheck</Text>
                <Text
                  style={[
                    styles.weeklyCardValue,
                    { textShadowColor: 'rgba(0, 255, 204, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
                  ]}
                >
                  {formatCurrency(weeklyIncome)}
                </Text>
              </View>
              <View style={styles.weeklyCardDivider} />
              <View style={styles.weeklyCardRow}>
                <Text style={styles.weeklyCardLabel}>Bills Set-Aside</Text>
                <Text
                  style={[
                    styles.weeklyCardValue,
                    { color: colors.red, textShadowColor: 'rgba(255, 0, 60, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
                  ]}
                >
                  {formatCurrency(totalBudgetWeekly)}
                </Text>
              </View>
              <View style={styles.weeklyCardDivider} />
              <View style={styles.weeklyCardRow}>
                <Text style={styles.weeklyCardLabel}>Left for Spending</Text>
                <Text
                  style={[
                    styles.weeklyCardValue,
                    {
                      color: weeklyLeftForSpending >= 0 ? colors.primary : colors.red,
                      textShadowColor: weeklyLeftForSpending >= 0
                        ? 'rgba(0, 255, 204, 0.6)'
                        : 'rgba(255, 0, 60, 0.6)',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 6,
                    },
                  ]}
                >
                  {formatCurrency(weeklyLeftForSpending)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Expenses List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {viewMode === "weekly" ? "WEEKLY " : "MONTHLY "}BILLS & EXPENSES
            </Text>
            <Pressable style={styles.addBtn} onPress={() => openExpenseForm()}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          </View>

          {allCategories.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>Add your bills and spending categories</Text>
            </View>
          ) : (
            allCategories.map((expense) => {
              const freq = (expense.frequency as BillFrequency) || "monthly";
              const displayAmount = viewMode === "weekly" 
                ? getWeeklyAmount(expense.allocated, freq)
                : getMonthlyAmount(expense.allocated, freq);
              const catKey = expense.name.toLowerCase();
              const spent = spentByCategory[catKey] || 0;
              const showFreqBadge = freq !== "monthly";
              
              return (
                <View key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseContent}>
                    <View style={styles.expenseLeft}>
                      <Text style={styles.expenseEmoji}>{expense.emoji}</Text>
                      <View style={styles.expenseDetails}>
                        <View style={styles.expenseNameRow}>
                          <Text style={styles.expenseName}>{expense.name.toUpperCase()}</Text>
                          {showFreqBadge && (
                            <View style={styles.freqBadge}>
                              <Text style={styles.freqBadgeText}>{freq.toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.expenseInfo}>
                          {expense.dueDay && `Due ${expense.dueDay} • `}
                          Spent: {formatCurrency(spent)}
                        </Text>
                        {/* Progress bar */}
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.min((spent / displayAmount) * 100, 100)}%`,
                                backgroundColor: spent > displayAmount ? colors.red : colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>{formatCurrency(displayAmount)}</Text>
                      <Text style={styles.expenseMonthly}>
                        per {viewMode === "weekly" ? "week" : "month"}
                      </Text>
                    </View>
                    
                    <View style={styles.expenseActions}>
                      <Pressable style={styles.actionBtn} onPress={() => openExpenseForm(expense)}>
                        <Edit3 size={16} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable style={styles.actionBtn} onPress={() => handleDeleteExpense(expense)}>
                        <Trash2 size={16} color={colors.red} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* Expense Form Modal */}
      <Modal
        visible={showExpenseForm}
        transparent
        animationType="slide"
        onRequestClose={closeExpenseForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingExpense ? "EDIT EXPENSE" : "ADD EXPENSE"}
              </Text>
              <Pressable onPress={closeExpenseForm} style={styles.closeBtn}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={expenseForm.name}
                onChangeText={(text) => setExpenseForm({...expenseForm, name: text})}
                placeholder="e.g. Rent, Utilities, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, {flex: 1}]}>
                <Text style={styles.fieldLabel}>EMOJI</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={expenseForm.emoji}
                  onChangeText={(text) => setExpenseForm({...expenseForm, emoji: text})}
                  placeholder="💰"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={[styles.formField, {flex: 2}]}>
                <Text style={styles.fieldLabel}>AMOUNT</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={expenseForm.allocated}
                  onChangeText={(text) => setExpenseForm({...expenseForm, allocated: text})}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Frequency picker */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>FREQUENCY</Text>
              <View style={styles.freqRow}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setExpenseForm({...expenseForm, frequency: opt.value})}
                    style={[
                      styles.freqPill,
                      expenseForm.frequency === opt.value && styles.freqPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.freqPillText,
                        expenseForm.frequency === opt.value && styles.freqPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>DUE DAY (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={expenseForm.dueDay}
                onChangeText={(text) => setExpenseForm({...expenseForm, dueDay: text})}
                placeholder="15"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={closeExpenseForm} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={saveExpense} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveText}>
                  {editingExpense ? "UPDATE" : "ADD"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    alignItems: "center",
  },
  headerTitle: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 1,
    textAlign: "center",
  },
  periodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  periodLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },
  // View mode toggle
  viewToggleRow: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    padding: 3,
    marginBottom: spacing.md,
  },
  viewToggleBtn: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 2,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  viewToggleTextActive: {
    color: "#000000",
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  // Weekly breakdown card
  weeklyCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 2,
    padding: spacing.md,
  },
  weeklyCardTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.sm,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  weeklyCardRows: {
    gap: 0,
  },
  weeklyCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  weeklyCardLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  weeklyCardValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  weeklyCardDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  incomeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  incomeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  incomeEmoji: {
    fontSize: 24,
  },
  incomeDetails: {
    flex: 1,
  },
  incomeLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  incomeAmount: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  incomeWeekly: {
    color: colors.dimmed,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  editCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  textInput: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  saveBtnText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  expenseCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  expenseContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  expenseLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    flex: 1,
  },
  expenseEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  expenseName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  freqBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  freqBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  expenseInfo: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  expenseRight: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "800",
  },
  expenseMonthly: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  expenseActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  formField: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  freqRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  freqPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.inputBg,
  },
  freqPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  freqPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  freqPillTextActive: {
    color: '#000000',
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  modalSaveText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
});