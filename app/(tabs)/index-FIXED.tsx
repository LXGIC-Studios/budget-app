import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import {
  formatCurrency,
  formatMonthLabel,
  shiftMonth,
} from "../../src/utils";
import type { Transaction } from "../../src/types";

export default function HomeScreen() {
  const { transactions, currentMonth, setCurrentMonth, addTransaction, profile } = useApp();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Calculate actual income from transactions
  const monthlyIncome = useMemo(
    () => {
      const income = transactions
        .filter(t => t.date.startsWith(currentMonth) && t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      return income > 0 ? income : (profile?.monthlyIncome ?? 0);
    },
    [transactions, currentMonth, profile]
  );

  // Calculate expenses  
  const monthlyExpenses = useMemo(
    () =>
      transactions
        .filter(t => t.date.startsWith(currentMonth) && t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [transactions, currentMonth]
  );

  // Calculate spending by category
  const categorySpending = useMemo(() => {
    const spending: Record<string, { amount: number; count: number }> = {};
    transactions
      .filter(t => t.date.startsWith(currentMonth) && t.type === "expense")
      .forEach(t => {
        const cat = t.category;
        if (!spending[cat]) spending[cat] = { amount: 0, count: 0 };
        spending[cat].amount += t.amount;
        spending[cat].count += 1;
      });
    
    return Object.entries(spending)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, currentMonth]);

  const remaining = monthlyIncome - monthlyExpenses;

  // Navigation
  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <Text style={styles.header}>Budget</Text>

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
            <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth)}</Text>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
            <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <Text style={styles.cardLabel}>INCOME</Text>
            <Text style={styles.incomeAmount}>{formatCurrency(monthlyIncome)}</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <Text style={styles.cardLabel}>SPENT</Text>
            <Text style={styles.expenseAmount}>{formatCurrency(monthlyExpenses)}</Text>
          </View>
        </View>

        {/* Remaining */}
        <View style={[styles.remainingCard, remaining >= 0 ? styles.positiveCard : styles.negativeCard]}>
          <Text style={styles.remainingLabel}>REMAINING</Text>
          <Text style={[styles.remainingAmount, { color: remaining >= 0 ? colors.primary : colors.red }]}>
            {remaining >= 0 ? "+" : ""}{formatCurrency(remaining)}
          </Text>
        </View>

        {/* Spending by Category */}
        {categorySpending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPENDING BY CATEGORY</Text>
            {categorySpending.map(({ category, amount, count }) => {
              const maxAmount = categorySpending[0]?.amount || 1;
              const percentage = (amount / maxAmount) * 100;
              
              return (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{category}</Text>
                    <View style={styles.categoryStats}>
                      <Text style={styles.categoryCount}>{count} transaction{count !== 1 ? 's' : ''}</Text>
                      <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${percentage}%` }]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK STATS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{transactions.filter(t => t.date.startsWith(currentMonth)).length}</Text>
              <Text style={styles.statLabel}>TRANSACTIONS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{categorySpending.length}</Text>
              <Text style={styles.statLabel}>CATEGORIES</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {monthlyExpenses > 0 ? formatCurrency(monthlyExpenses / transactions.filter(t => t.date.startsWith(currentMonth) && t.type === "expense").length) : "$0"}
              </Text>
              <Text style={styles.statLabel}>AVG PER TRANSACTION</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      <FAB onPress={() => setSheetVisible(true)} />
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={addTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  monthLabel: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    minWidth: 150,
    textAlign: "center",
  },
  summarySection: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  incomeCard: {
    backgroundColor: colors.greenBg,
    borderColor: colors.greenBorder,
  },
  expenseCard: {
    backgroundColor: colors.redBg,
    borderColor: colors.redBorder,
  },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  incomeAmount: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  expenseAmount: {
    color: colors.red,
    fontSize: 18,
    fontWeight: "800",
  },
  remainingCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  positiveCard: {
    backgroundColor: colors.greenBg,
    borderColor: colors.greenBorder,
  },
  negativeCard: {
    backgroundColor: colors.redBg,
    borderColor: colors.redBorder,
  },
  remainingLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  remainingAmount: {
    fontSize: 24,
    fontWeight: "900",
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  categoryRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  categoryStats: {
    alignItems: "flex-end",
  },
  categoryCount: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  categoryAmount: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
  },
});