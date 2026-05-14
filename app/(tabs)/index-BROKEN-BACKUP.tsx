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
  getMonthlyAmount,
  formatMonthLabel,
  shiftMonth,
} from "../../src/utils";
import type { Transaction } from "../../src/types";

export default function HomeScreen() {
  const { transactions, currentMonth, setCurrentMonth, currentBudget, profile } = useApp();
  const [sheetVisible, setSheetVisible] = useState(false);

  const profileIncome = profile?.monthlyIncome ?? 0;

  // Auto-calculate actual income from transactions (exclude transfers)
  const actualMonthlyIncome = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.date.startsWith(currentMonth) &&
            t.type === "income" &&
            t.category !== "transfer"
        )
        .reduce((s, t) => s + t.amount, 0),
    [transactions, currentMonth]
  );

  // Use actual if we have transaction data, fall back to profile setting
  const monthlyIncome = actualMonthlyIncome > 0 ? actualMonthlyIncome : profileIncome;

  const categories = currentBudget?.categories ?? [];

  // Split categories into fixed and flexible
  const fixedCategories = useMemo(
    () => categories.filter((c) => c.type === "fixed"),
    [categories]
  );
  const flexibleCategories = useMemo(
    () => categories.filter((c) => c.type === "flexible"),
    [categories]
  );

  // Monthly expense transactions
  const monthTxns = useMemo(
    () =>
      transactions.filter(
        (t) => t.date.startsWith(currentMonth) && t.type === "expense"
      ),
    [transactions, currentMonth]
  );

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.forEach((t) => {
      const key = t.category.toLowerCase();
      map[key] = (map[key] || 0) + t.amount;
    });
    return map;
  }, [monthTxns]);

  // Totals - everything treated as monthly
  const totalFixed = useMemo(
    () =>
      fixedCategories.reduce(
        (s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"),
        0
      ),
    [fixedCategories]
  );

  const totalFlexible = useMemo(
    () =>
      flexibleCategories.reduce(
        (s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"),
        0
      ),
    [flexibleCategories]
  );

  const totalExpenses = useMemo(() => monthTxns.reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const leftToBudget = monthlyIncome - totalFixed - totalFlexible;
  const netIncome = monthlyIncome - totalExpenses;

  // Navigation
  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Budget</Text>

        {/* Month navigation */}
        <View style={styles.periodRow}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
            <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.periodLabel}>{formatMonthLabel(currentMonth)}</Text>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
            <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>INCOME</Text>
            <Text style={styles.summaryValueIncome}>{formatCurrency(monthlyIncome)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>BUDGETED</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalFixed + totalFlexible)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>SPENT</Text>
            <Text style={styles.summaryValueExpense}>{formatCurrency(totalExpenses)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>REMAINING</Text>
            <Text style={[styles.summaryValue, { color: netIncome >= 0 ? colors.primary : colors.red }]}>
              {formatCurrency(netIncome)}
            </Text>
          </View>
        </View>

        {/* Fixed Bills */}
        {fixedCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FIXED BILLS</Text>
            {fixedCategories.map((cat) => {
              const catKey = cat.name.toLowerCase();
              const displayAllocated = cat.frequency === "weekly" ? cat.allocated : getMonthlyAmount(cat.allocated, cat.frequency || "monthly");
              const spent = spentByCategory[catKey] || 0;
              const pct = displayAllocated > 0 ? Math.min(spent / displayAllocated, 1) : 0;
              const isOver = spent > displayAllocated;

              return (
                <View key={cat.id} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                      <Text style={styles.categoryName}>{cat.name}</Text>
                    </View>
                    <Text style={[styles.categoryAmount, isOver && { color: colors.red }]}>
                      {formatCurrency(spent)} / {formatCurrency(displayAllocated)}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(pct * 100, 100)}%`,
                          backgroundColor: isOver ? colors.red : colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Flexible Budget */}
        {flexibleCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPENDING CATEGORIES</Text>
            {flexibleCategories.map((cat) => {
              const catKey = cat.name.toLowerCase();
              const displayAllocated = getMonthlyAmount(cat.allocated, cat.frequency || "monthly");
              const spent = spentByCategory[catKey] || 0;
              const pct = displayAllocated > 0 ? Math.min(spent / displayAllocated, 1) : 0;
              const isOver = spent > displayAllocated;

              return (
                <View key={cat.id} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                      <Text style={styles.categoryName}>{cat.name}</Text>
                    </View>
                    <Text style={[styles.categoryAmount, isOver && { color: colors.red }]}>
                      {formatCurrency(spent)} / {formatCurrency(displayAllocated)}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(pct * 100, 100)}%`,
                          backgroundColor: isOver ? colors.red : colors.yellow,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Left to Budget */}
        {leftToBudget !== 0 && (
          <View style={styles.section}>
            <View style={[styles.summaryCard, { backgroundColor: leftToBudget >= 0 ? colors.primaryBg : colors.redBg }]}>
              <Text style={styles.summaryLabel}>LEFT TO BUDGET</Text>
              <Text style={[styles.summaryValue, { color: leftToBudget >= 0 ? colors.primary : colors.red }]}>
                {formatCurrency(leftToBudget)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <FAB onPress={() => setSheetVisible(true)} />
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={async (txn: Transaction) => {
          // Add transaction logic here
          console.log("Add transaction:", txn);
        }}
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
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  periodLabel: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    minWidth: 150,
    textAlign: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  summaryValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  summaryValueIncome: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  summaryValueExpense: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  categoryCard: {
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
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  categoryAmount: {
    color: colors.textSecondary,
    fontSize: 13,
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
    borderRadius: 2,
  },
});