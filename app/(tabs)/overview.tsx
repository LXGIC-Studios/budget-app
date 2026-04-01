import { useMemo } from "react";
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
import { colors, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import {
  formatCurrency,
  formatMonthLabel,
  shiftMonth,
  getMonthlyAmount,
} from "../../src/utils";

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const isOver = value > total && total > 0;
  return (
    <View style={barStyles.track}>
      <View
        style={[
          barStyles.fill,
          { width: `${pct * 100}%` as any, backgroundColor: isOver ? colors.red : color },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});

// Dave Ramsey snowball: sort by balance asc, put minimum on all, extra on smallest
function calcSnowball(debts: { name: string; balance: number; minimumPayment: number }[], extraPerMonth: number) {
  const sorted = [...debts].sort((a, b) => a.balance - b.balance);
  const totalMin = sorted.reduce((s, d) => s + d.minimumPayment, 0);
  const totalPayment = totalMin + extraPerMonth;
  const monthlyLeft = extraPerMonth;

  let months = 0;
  let remaining = sorted.map((d) => ({ ...d }));

  while (remaining.length > 0 && months < 120) {
    months++;
    let extra = monthlyLeft;
    const next: typeof remaining = [];
    for (const d of remaining) {
      const pay = d === remaining[0] ? d.minimumPayment + extra : d.minimumPayment;
      d.balance = Math.max(0, d.balance - pay);
      if (d === remaining[0]) extra = 0;
      if (d.balance > 0) next.push(d);
    }
    remaining = next;
  }
  return months;
}

export default function OverviewScreen() {
  const { transactions, currentMonth, setCurrentMonth, currentBudget, debts } = useApp();

  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date.startsWith(currentMonth) && t.type !== "transfer"),
    [transactions, currentMonth]
  );

  const totalIncome = useMemo(
    () => monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  );
  const totalSpent = useMemo(
    () => monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  );
  const net = totalIncome - totalSpent;

  // Spending per category (expenses only)
  const categorySpend = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of monthTxns) {
      if (t.type !== "expense") continue;
      const key = t.category.toLowerCase();
      map[key] = (map[key] ?? 0) + t.amount;
    }
    return Object.entries(map)
      .map(([cat, amount]) => ({ cat, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTxns]);

  // Budget targets for flex categories
  const flexBudgets = useMemo(() => {
    if (!currentBudget) return {};
    const map: Record<string, number> = {};
    for (const c of currentBudget.categories) {
      if (c.type === "flexible") {
        map[c.name.toLowerCase()] = getMonthlyAmount(c.allocated, c.frequency || "monthly");
      }
    }
    return map;
  }, [currentBudget]);

  const fixedCategories = useMemo(() => {
    if (!currentBudget) return [];
    return currentBudget.categories.filter((c) => c.type === "fixed");
  }, [currentBudget]);

  const totalFixed = useMemo(
    () => fixedCategories.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0),
    [fixedCategories]
  );

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayments = debts.reduce((s, d) => s + d.minimumPayment, 0);

  // Snowball estimate: assume ~$500 extra/month toward debt
  const extraForDebt = Math.max(0, net - totalFixed - 500);
  const snowballMonths = debts.length > 0 ? calcSnowball(
    debts.map((d) => ({ name: d.name, balance: d.balance, minimumPayment: d.minimumPayment })),
    extraForDebt
  ) : 0;

  const navigate = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>OVERVIEW</Text>
        </View>

        {/* Month nav */}
        <View style={styles.monthNav}>
          <Pressable onPress={() => navigate(-1)} hitSlop={16}>
            <ChevronLeft size={22} color={colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
          <Pressable onPress={() => navigate(1)} hitSlop={16}>
            <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Income / Spent / Net */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: colors.primary }]}>
            <Text style={styles.statLabel}>INCOME</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.red }]}>
            <Text style={styles.statLabel}>SPENT</Text>
            <Text style={[styles.statValue, { color: colors.red }]}>{formatCurrency(totalSpent)}</Text>
          </View>
          <View style={[styles.statCard, { borderColor: net >= 0 ? colors.primary : colors.red }]}>
            <Text style={styles.statLabel}>LEFT</Text>
            <Text style={[styles.statValue, { color: net >= 0 ? colors.primary : colors.red }]}>
              {formatCurrency(net)}
            </Text>
          </View>
        </View>

        {/* Fixed bills this month */}
        {fixedCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>FIXED BILLS</Text>
              <Text style={styles.sectionSubtitle}>{formatCurrency(totalFixed)} / mo</Text>
            </View>
            {fixedCategories.map((c) => (
              <View key={c.id} style={styles.billRow}>
                <Text style={styles.billEmoji}>{c.emoji}</Text>
                <Text style={styles.billName}>{c.name}</Text>
                {c.dueDay && <Text style={styles.dueDay}>due {c.dueDay}</Text>}
                <Text style={styles.billAmount}>
                  {formatCurrency(getMonthlyAmount(c.allocated, c.frequency || "monthly"))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Spending breakdown */}
        {categorySpend.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SPENDING BREAKDOWN</Text>
              <Text style={styles.sectionSubtitle}>{formatCurrency(totalSpent)} spent</Text>
            </View>
            {categorySpend.map(({ cat, amount }) => {
              const budget = flexBudgets[cat] ?? 0;
              const isOver = budget > 0 && amount > budget;
              return (
                <View key={cat} style={styles.catRow}>
                  <View style={styles.catLabelRow}>
                    <Text style={styles.catName}>{cat}</Text>
                    <Text style={[styles.catAmount, isOver && { color: colors.red }]}>
                      {formatCurrency(amount)}
                      {budget > 0 && <Text style={styles.catBudget}> / {formatCurrency(budget)}</Text>}
                    </Text>
                  </View>
                  {budget > 0 && (
                    <ProgressBar value={amount} total={budget} color={colors.primary} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Income breakdown */}
        {monthTxns.some((t) => t.type === "income") && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>INCOME BREAKDOWN</Text>
              <Text style={styles.sectionSubtitle}>{formatCurrency(totalIncome)} total</Text>
            </View>
            {(() => {
              const map: Record<string, number> = {};
              monthTxns.filter((t) => t.type === "income").forEach((t) => {
                const key = t.note || t.category;
                map[key] = (map[key] ?? 0) + t.amount;
              });
              return Object.entries(map)
                .sort((a, b) => b[1] - a[1])
                .map(([label, amount]) => (
                  <View key={label} style={styles.incomeBreakRow}>
                    <Text style={styles.incomeBreakLabel}>{label}</Text>
                    <Text style={styles.incomeBreakAmount}>+{formatCurrency(amount)}</Text>
                  </View>
                ));
            })()}
          </View>
        )}

        {/* Debt snowball */}
        {debts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>DEBT SNOWBALL</Text>
              <Text style={styles.sectionSubtitle}>{formatCurrency(totalDebt)} total</Text>
            </View>
            {debts
              .slice()
              .sort((a, b) => a.balance - b.balance)
              .map((d, i) => (
                <View key={d.id} style={styles.debtRow}>
                  <View style={styles.debtRank}>
                    <Text style={styles.debtRankText}>{i + 1}</Text>
                  </View>
                  <View style={styles.debtMeta}>
                    <Text style={styles.debtName}>{d.name}</Text>
                    <Text style={styles.debtMin}>min ${d.minimumPayment}/mo</Text>
                  </View>
                  <View style={styles.debtRight}>
                    <Text style={styles.debtBalance}>{formatCurrency(d.balance)}</Text>
                    {i === 0 && <Text style={styles.debtTarget}>TARGET FIRST</Text>}
                  </View>
                </View>
              ))}
            <View style={styles.snowballFooter}>
              <Text style={styles.snowballLabel}>MIN PAYMENTS</Text>
              <Text style={styles.snowballValue}>{formatCurrency(totalMinPayments)}/mo</Text>
            </View>
            {snowballMonths > 0 && extraForDebt > 0 && (
              <View style={styles.snowballFooter}>
                <Text style={styles.snowballLabel}>DEBT FREE IN (est.)</Text>
                <Text style={[styles.snowballValue, { color: colors.primary }]}>
                  ~{snowballMonths} months
                </Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 6,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  monthLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    minWidth: 220,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: 2,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  billEmoji: {
    fontSize: 16,
  },
  billName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  dueDay: {
    color: colors.textSecondary,
    fontSize: 11,
    marginRight: spacing.sm,
  },
  billAmount: {
    color: colors.red,
    fontSize: 14,
    fontWeight: "700",
  },
  catRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  catLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
    flex: 1,
  },
  catAmount: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  catBudget: {
    color: colors.textSecondary,
    fontWeight: "400",
    fontSize: 12,
  },
  incomeBreakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  incomeBreakLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  incomeBreakAmount: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.sm,
  },
  debtRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  debtRankText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  debtMeta: {
    flex: 1,
    gap: 2,
  },
  debtName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  debtMin: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  debtRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  debtBalance: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "800",
  },
  debtTarget: {
    color: colors.yellow,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  snowballFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  snowballLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  snowballValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
