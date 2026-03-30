import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
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
  formatDueDay,
  formatMonthLabel,
  shiftMonth,
} from "../../src/utils";
import type { BudgetCategory } from "../../src/types";

function CategoryRow({
  cat,
  spent,
  displayAllocated,
  onPress,
}: {
  cat: BudgetCategory;
  spent: number;
  displayAllocated: number;
  onPress: () => void;
}) {
  const pct = displayAllocated > 0 ? Math.min(spent / displayAllocated, 1.5) : 0;
  const isOver = spent > displayAllocated;
  const barColor = isOver ? colors.red : colors.primary;

  // Left accent border color by type: fixed = primary (#00ffcc), flexible = yellow (#ccff00)
  const accentColor = cat.type === "fixed" ? colors.primary : colors.yellow;

  // Tinted background based on over/under status
  const cardBg = isOver ? colors.redBg : colors.greenBg;
  const cardBorderColor = isOver ? colors.redBorder : colors.greenBorder;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.catCard,
        {
          borderLeftWidth: 3,
          borderLeftColor: accentColor,
          backgroundColor: cardBg,
          borderColor: cardBorderColor,
        },
      ]}
    >
      <View style={styles.catHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.catInfo}>
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={styles.catName}>{cat.name}</Text>
            {cat.type === "fixed" && (
              <View style={styles.fixedBadge}>
                <Text style={styles.fixedText}>FIXED</Text>
              </View>
            )}
          </View>
          {cat.dueDay != null && (
            <Text style={styles.dueDayText}>{formatDueDay(cat.dueDay)}</Text>
          )}
        </View>
        <Text
          style={[
            styles.catSpent,
            isOver && { color: colors.red, textShadowColor: 'rgba(255, 0, 60, 0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
            !isOver && { textShadowColor: 'rgba(0, 255, 204, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 },
          ]}
        >
          {formatCurrency(spent)}{" "}
          <Text style={styles.catOf}>/ {formatCurrency(displayAllocated)}</Text>
        </Text>
      </View>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(pct * 100, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

export default function BudgetScreen() {
  const { profile, currentBudget, transactions, currentMonth, setCurrentMonth, saveBudget, addTransaction } =
    useApp();

  const monthlyIncome = profile?.monthlyIncome ?? 0;
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editCat, setEditCat] = useState<BudgetCategory | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDueDay, setEditDueDay] = useState("");

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

  const leftToBudget = monthlyIncome - totalFixed;

  // Navigation
  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  const handleEditSave = () => {
    if (!editCat || !currentBudget) return;
    const newAmount = parseFloat(editAmount) || 0;
    const newDueDay = parseInt(editDueDay) || undefined;
    impact("Medium");
    const updated = {
      ...currentBudget,
      categories: currentBudget.categories.map((c) =>
        c.id === editCat.id
          ? { ...c, allocated: newAmount, dueDay: newDueDay }
          : c
      ),
    };
    saveBudget(updated);
    setEditCat(null);
  };

  const openEdit = (cat: BudgetCategory) => {
    setEditCat(cat);
    setEditAmount(cat.allocated.toString());
    setEditDueDay(cat.dueDay?.toString() || "");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>BUDGET</Text>

      {/* Month navigation */}
      <View style={styles.periodRow}>
        <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
          <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.periodLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
        <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
          <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Summary: Income | Fixed Bills | Left to Budget */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
          <Text style={styles.summaryLabel}>INCOME</Text>
          <Text style={[styles.summaryValue, { textShadowColor: 'rgba(0, 255, 204, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>
            {formatCurrency(monthlyIncome)}
          </Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.redBg, borderColor: colors.redBorder }]}>
          <Text style={styles.summaryLabel}>FIXED BILLS</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: colors.red, textShadowColor: 'rgba(255, 0, 60, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
            ]}
          >
            {formatCurrency(totalFixed)}
          </Text>
        </View>
        <View
          style={[
            styles.summaryItem,
            leftToBudget >= 0
              ? { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }
              : { backgroundColor: colors.redBg, borderColor: colors.redBorder },
          ]}
        >
          <Text style={styles.summaryLabel}>LEFT TO BUDGET</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color: leftToBudget >= 0 ? colors.primary : colors.red,
                textShadowColor: leftToBudget >= 0
                  ? 'rgba(0, 255, 204, 0.6)'
                  : 'rgba(255, 0, 60, 0.6)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              },
            ]}
          >
            {formatCurrency(leftToBudget)}
          </Text>
        </View>
      </View>

      {/* FIXED BILLS section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>FIXED BILLS</Text>
        <Text style={styles.sectionCount}>{fixedCategories.length} bills</Text>
      </View>
      <View style={styles.catList}>
        {fixedCategories.map((cat) => {
          const catKey = cat.name.toLowerCase();
          const displayAllocated = getMonthlyAmount(cat.allocated, cat.frequency || "monthly");
          return (
            <CategoryRow
              key={cat.id}
              cat={cat}
              spent={spentByCategory[catKey] || 0}
              displayAllocated={displayAllocated}
              onPress={() => openEdit(cat)}
            />
          );
        })}
        {fixedCategories.length === 0 && (
          <Text style={styles.emptySection}>No fixed bills set up yet</Text>
        )}
      </View>

      {/* SPENDING BUDGET section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>SPENDING BUDGET</Text>
        <Text style={styles.sectionCount}>{formatCurrency(leftToBudget)} available</Text>
      </View>
      <View style={styles.catList}>
        {flexibleCategories.map((cat) => {
          const catKey = cat.name.toLowerCase();
          const displayAllocated = getMonthlyAmount(cat.allocated, cat.frequency || "monthly");
          return (
            <CategoryRow
              key={cat.id}
              cat={cat}
              spent={spentByCategory[catKey] || 0}
              displayAllocated={displayAllocated}
              onPress={() => openEdit(cat)}
            />
          );
        })}
        {flexibleCategories.length === 0 && (
          <Text style={styles.emptySection}>No spending categories set up yet</Text>
        )}
      </View>
      </ScrollView>

      <FAB onPress={() => setSheetVisible(true)} />
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={addTransaction}
      />

      {/* Edit modal - simplified: amount + due day only */}
      <Modal visible={!!editCat} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setEditCat(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {editCat?.name} Budget
            </Text>

            {/* Amount */}
            <View>
              <Text style={styles.modalFieldLabel}>MONTHLY AMOUNT</Text>
              <View style={styles.modalInputRow}>
                <Text style={styles.modalDollar}>$</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="decimal-pad"
                  value={editAmount}
                  onChangeText={setEditAmount}
                  autoFocus
                />
              </View>
            </View>

            {/* Due day - only for fixed bills */}
            {editCat?.type === "fixed" && (
              <View>
                <Text style={styles.modalFieldLabel}>DUE DAY (OPTIONAL)</Text>
                <View style={styles.modalInputRow}>
                  <TextInput
                    style={[styles.modalInput, { fontSize: 18 }]}
                    keyboardType="number-pad"
                    value={editDueDay}
                    onChangeText={setEditDueDay}
                    placeholder="e.g. 15"
                    placeholderTextColor={colors.dimmed}
                    maxLength={2}
                  />
                </View>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setEditCat(null)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleEditSave} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    fontWeight: "900",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: 3,
    textTransform: "uppercase",
    textShadowColor: 'rgba(0, 255, 204, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // Period navigation
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  periodLabel: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    minWidth: 200,
    textAlign: "center",
    letterSpacing: 2,
  },
  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 2,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  // Section headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  sectionCount: {
    color: colors.dimmed,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  emptySection: {
    color: colors.dimmed,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  // Category list
  catList: {
    paddingHorizontal: spacing.md,
    gap: 10,
    marginBottom: spacing.lg,
  },
  catCard: {
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  catEmoji: {
    fontSize: 18,
  },
  catName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  fixedBadge: {
    backgroundColor: '#00ffcc',
    borderWidth: 1,
    borderColor: '#00ffcc',
    borderRadius: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fixedText: {
    color: '#050505',
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dueDayText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    marginLeft: 26,
  },
  catSpent: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  catOf: {
    color: colors.textSecondary,
    fontWeight: "400",
  },
  barBg: {
    height: 6,
    backgroundColor: colors.dimmed,
    borderRadius: 1,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 1,
  },
  // Edit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#0c0c0c',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 2,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 360,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  modalFieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalDollar: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "700",
  },
  modalInput: {
    flex: 1,
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
  },
  modalCancelBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  modalBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 2,
  },
  modalBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
});
