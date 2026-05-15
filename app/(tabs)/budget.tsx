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
import { Plus, Edit3, Trash2, X } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { StatCard } from "../../src/components/StatCard";
import {
  formatCurrency,
  getMonthlyAmount,
} from "../../src/utils";

export default function BudgetScreen() {
  const { profile, updateProfile, currentBudget, createCategory, updateCategory, deleteCategory } = useApp();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState(profile?.monthlyIncome?.toString() || "12926");
  
  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    emoji: "💰",
    allocated: "",
    frequency: "monthly",
    dueDay: "",
  });

  const monthlyIncome = profile?.monthlyIncome ?? 12926;

  const fixedExpenses = useMemo(() => {
    const cats = currentBudget?.categories ?? [];
    return cats.filter((c) => c.type === "fixed");
  }, [currentBudget]);

  const totalFixed = useMemo(() => {
    return fixedExpenses.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);
  }, [fixedExpenses]);

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
        frequency: expense.frequency || "monthly",
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
          <Text style={styles.headerTitle}>BUDGET SETUP</Text>
          <Text style={styles.headerSubtitle}>Manage your income and fixed expenses</Text>
        </View>

        {/* Monthly Income */}
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
                </View>
                <Edit3 size={20} color={colors.textSecondary} />
              </View>
            </Pressable>
          )}
        </View>

        {/* Fixed Expenses Summary */}
        <View style={styles.statsRow}>
          <StatCard
            emoji="🏠"
            label="Total Fixed Expenses"
            value={formatCurrency(totalFixed)}
            accentColor={colors.red}
            variant="negative"
          />
          <StatCard
            emoji="💰"
            label="Disposable Income"
            value={formatCurrency(monthlyIncome - totalFixed)}
            accentColor={monthlyIncome - totalFixed >= 0 ? colors.primary : colors.red}
            variant={monthlyIncome - totalFixed >= 0 ? "positive" : "negative"}
          />
        </View>

        {/* Fixed Expenses List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FIXED EXPENSES</Text>
            <Pressable style={styles.addBtn} onPress={() => openExpenseForm()}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          </View>

          {fixedExpenses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No fixed expenses yet</Text>
              <Text style={styles.emptySubtext}>Add your bills and recurring payments</Text>
            </View>
          ) : (
            fixedExpenses.map((expense) => {
              const monthlyAmount = getMonthlyAmount(expense.allocated, expense.frequency || "monthly");
              
              return (
                <View key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseContent}>
                    <View style={styles.expenseLeft}>
                      <Text style={styles.expenseEmoji}>{expense.emoji}</Text>
                      <View>
                        <Text style={styles.expenseName}>{expense.name.toUpperCase()}</Text>
                        <Text style={styles.expenseFreq}>
                          {expense.frequency?.toUpperCase() || "MONTHLY"}
                          {expense.dueDay && ` • DUE ${expense.dueDay}`}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>{formatCurrency(monthlyAmount)}</Text>
                      <Text style={styles.expenseMonthly}>per month</Text>
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

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>EMOJI</Text>
              <TextInput
                style={styles.fieldInput}
                value={expenseForm.emoji}
                onChangeText={(text) => setExpenseForm({...expenseForm, emoji: text})}
                placeholder="💰"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, {flex: 1}]}>
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

              <View style={[styles.formField, {flex: 1}]}>
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
    paddingBottom: spacing.md,
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
    fontSize: 20,
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
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
    alignItems: "center",
    gap: spacing.sm,
  },
  expenseLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  expenseEmoji: {
    fontSize: 20,
  },
  expenseName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  expenseFreq: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
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