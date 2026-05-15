import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Edit3, Trash2, DollarSign } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import {
  formatCurrency,
  getMonthlyAmount,
} from "../../src/utils";

export default function IncomeExpensesScreen() {
  const { profile, updateProfile, currentBudget } = useApp();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState(profile?.monthlyIncome?.toString() || "12926");

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>INCOME & EXPENSES</Text>
          <Text style={styles.headerSubtitle}>Edit your monthly income and fixed expenses</Text>
        </View>

        {/* Monthly Income Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MONTHLY INCOME</Text>
            <Text style={styles.sectionTotal}>{formatCurrency(monthlyIncome)}</Text>
          </View>
          
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
            <>
              <Pressable onPress={() => setEditingIncome(true)} style={styles.incomeCard}>
                <View style={styles.incomeContent}>
                  <DollarSign size={24} color={colors.primary} />
                  <View style={styles.incomeDetails}>
                    <Text style={styles.incomeLabel}>TOTAL MONTHLY INCOME</Text>
                    <Text style={styles.incomeAmount}>{formatCurrency(monthlyIncome)}</Text>
                  </View>
                  <Edit3 size={20} color={colors.textSecondary} />
                </View>
              </Pressable>
              
              {/* Add more income sources */}
              <Pressable style={styles.addIncomeBtn}>
                <Plus size={16} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.addIncomeBtnText}>ADD INCOME SOURCE</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Fixed Expenses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FIXED EXPENSES</Text>
            <Text style={styles.sectionTotal}>{formatCurrency(totalFixed)}</Text>
          </View>
          
          <View style={styles.addExpenseHeader}>
            <Pressable style={styles.addBtn}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD EXPENSE</Text>
            </Pressable>
          </View>

          {fixedExpenses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No fixed expenses</Text>
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
                      <View style={styles.expenseInfo}>
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
                      <Pressable style={styles.actionBtn}>
                        <Edit3 size={16} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable style={styles.actionBtn}>
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
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
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
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
  },
  sectionTotal: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "800",
  },
  addExpenseHeader: {
    marginBottom: spacing.md,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  incomeCard: {
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  incomeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
  addIncomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderStyle: "dashed",
    borderRadius: radius.sm,
  },
  addIncomeBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
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
  expenseInfo: {
    flex: 1,
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
    marginRight: spacing.sm,
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
});