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
  getWeekKey,
  getWeekRange,
  formatWeekLabel,
  shiftWeek,
} from "../../src/utils";
import type { BudgetCategory, BillFrequency } from "../../src/types";

const FREQUENCY_OPTIONS: { value: BillFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Bimonthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function FrequencyLabel(freq: BillFrequency): string {
  return freq.toUpperCase();
}

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
  const freq = cat.frequency || "monthly";
  const showFreqBadge = freq !== "monthly";

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
            {showFreqBadge && (
              <View style={styles.fixedBadge}>
                <Text style={styles.fixedText}>{FrequencyLabel(freq)}</Text>
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
  const [editFrequency, setEditFrequency] = useState<BillFrequency>("monthly");
  const [editDueDay, setEditDueDay] = useState("");
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());

  const categories = currentBudget?.categories ?? [];

  // Monthly transactions
  const monthTxns = useMemo(
    () =>
      transactions.filter(
        (t) => t.date.startsWith(currentMonth) && t.type === "expense"
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

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    activeTxns.forEach((t) => {
      const key = t.category.toLowerCase();
      map[key] = (map[key] || 0) + t.amount;
    });
    return map;
  }, [activeTxns]);

  // Monthly totals
  const totalBudgetMonthly = useMemo(
    () =>
      categories.reduce(
        (s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"),
        0
      ),
    [categories]
  );

  // Weekly totals
  const weeklyIncome = monthlyIncome / 4.33;

  const totalBudgetWeekly = useMemo(
    () =>
      categories.reduce(
        (s, c) => s + getWeeklyAmount(c.allocated, c.frequency || "monthly"),
        0
      ),
    [categories]
  );

  const weeklyLeftForSpending = weeklyIncome - totalBudgetWeekly;

  // Navigation
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

  const handleEditSave = () => {
    if (!editCat || !currentBudget) return;
    const newAmount = parseFloat(editAmount) || 0;
    const newDueDay = parseInt(editDueDay) || undefined;
    impact("Medium");
    const updated = {
      ...currentBudget,
      categories: currentBudget.categories.map((c) =>
        c.id === editCat.id
          ? { ...c, allocated: newAmount, frequency: editFrequency, dueDay: newDueDay }
          : c
      ),
    };
    saveBudget(updated);
    setEditCat(null);
  };

  const openEdit = (cat: BudgetCategory) => {
    setEditCat(cat);
    setEditAmount(cat.allocated.toString());
    setEditFrequency(cat.frequency || "monthly");
    setEditDueDay(cat.dueDay?.toString() || "");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>BUDGET</Text>

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

      {/* Summary */}
      {viewMode === "monthly" ? (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryItem, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
            <Text style={styles.summaryLabel}>INCOME</Text>
            <Text style={[styles.summaryValue, { textShadowColor: 'rgba(0, 255, 204, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>
              {formatCurrency(monthlyIncome)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryItem,
              totalBudgetMonthly > monthlyIncome
                ? { backgroundColor: colors.redBg, borderColor: colors.redBorder }
                : { backgroundColor: colors.yellowBg, borderColor: colors.yellowBorder },
            ]}
          >
            <Text style={styles.summaryLabel}>BUDGETED</Text>
            <Text
              style={[
                styles.summaryValue,
                totalBudgetMonthly > monthlyIncome
                  ? { color: colors.red, textShadowColor: 'rgba(255, 0, 60, 0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }
                  : { textShadowColor: 'rgba(204, 255, 0, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
              ]}
            >
              {formatCurrency(totalBudgetMonthly)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryItem,
              monthlyIncome - totalBudgetMonthly >= 0
                ? { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }
                : { backgroundColor: colors.redBg, borderColor: colors.redBorder },
            ]}
          >
            <Text style={styles.summaryLabel}>REMAINING</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    monthlyIncome - totalBudgetMonthly >= 0 ? colors.primary : colors.red,
                  textShadowColor:
                    monthlyIncome - totalBudgetMonthly >= 0
                      ? 'rgba(0, 255, 204, 0.6)'
                      : 'rgba(255, 0, 60, 0.6)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 8,
                },
              ]}
            >
              {formatCurrency(monthlyIncome - totalBudgetMonthly)}
            </Text>
          </View>
        </View>
      ) : (
        /* Weekly Savings Breakdown Card */
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

      <View style={styles.catList}>
        {categories
          .filter((cat) => {
            if (viewMode !== "weekly") return true;
            const freq = cat.frequency || "monthly";
            // In weekly view, hide monthly/bimonthly/quarterly fixed bills
            // Only show weekly, biweekly, and flexible categories
            if (freq === "weekly" || freq === "biweekly") return true;
            if (cat.type === "flexible") return true;
            // For monthly fixed bills, only show in the week they're due
            if (cat.dueDay && freq === "monthly") {
              const [y, m] = currentMonth.split("-").map(Number);
              const dueDate = new Date(y, m - 1, cat.dueDay);
              const dayOfWeek = dueDate.getDay();
              const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const weekStart = cat.dueDay - mondayOffset;
              const weekEnd = weekStart + 6;
              // Check if current week contains the due day
              const now = new Date();
              const today = now.getDate();
              const todayDow = now.getDay();
              const todayMondayOffset = todayDow === 0 ? 6 : todayDow - 1;
              const thisWeekStart = today - todayMondayOffset;
              const thisWeekEnd = thisWeekStart + 6;
              return cat.dueDay >= thisWeekStart && cat.dueDay <= thisWeekEnd;
            }
            // Monthly fixed without due day = hide from weekly
            return false;
          })
          .map((cat) => {
          const catKey = cat.name.toLowerCase();
          const freq = cat.frequency || "monthly";
          const displayAllocated =
            viewMode === "weekly"
              ? (freq === "weekly" ? cat.allocated : freq === "biweekly" ? cat.allocated : cat.allocated)
              : getMonthlyAmount(cat.allocated, freq);
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
      </View>
      </ScrollView>

      <FAB onPress={() => setSheetVisible(true)} />
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={addTransaction}
      />

      {/* Edit modal */}
      <Modal visible={!!editCat} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setEditCat(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {editCat?.name} Budget
            </Text>

            {/* Amount */}
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

            {/* Frequency picker */}
            <View>
              <Text style={styles.modalFieldLabel}>FREQUENCY</Text>
              <View style={styles.freqRow}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setEditFrequency(opt.value)}
                    style={[
                      styles.freqPill,
                      editFrequency === opt.value && styles.freqPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.freqPillText,
                        editFrequency === opt.value && styles.freqPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Due day */}
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
    backgroundColor: '#00ffcc',
  },
  viewToggleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  viewToggleTextActive: {
    color: '#050505',
  },
  // Monthly summary
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
  // Weekly savings breakdown card
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
  // Category list
  catList: {
    padding: spacing.md,
    gap: 10,
    paddingBottom: 100,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.3)',
    borderRadius: 2,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 340,
    gap: spacing.lg,
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
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.3)',
    borderRadius: 2,
    padding: spacing.md,
  },
  modalDollar: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "700",
  },
  modalInput: {
    flex: 1,
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
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
    borderColor: '#00ffcc',
    backgroundColor: '#00ffcc',
  },
  freqPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  freqPillTextActive: {
    color: '#050505',
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
