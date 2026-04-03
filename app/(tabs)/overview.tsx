import { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, fonts } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency, formatMonthLabel, shiftMonth, getMonthlyAmount } from "../../src/utils";

// ─── HORIZONTAL BAR ────────────────────────────────────────────────
function Bar({ label, amount, max, color, budget }: {
  label: string; amount: number; max: number; color: string; budget?: number;
}) {
  const pct = max > 0 ? Math.min(amount / max, 1) : 0;
  const isOver = budget != null && budget > 0 && amount > budget;
  const budgetPct = budget && max > 0 ? Math.min(budget / max, 1) : 0;
  return (
    <View style={bs.row}>
      <View style={bs.header}>
        <Text style={bs.label}>{label}</Text>
        <Text style={[bs.amt, isOver && { color: colors.red }]}>
          {formatCurrency(amount)}
          {budget != null && budget > 0 && <Text style={bs.budget}> / {formatCurrency(budget)}</Text>}
        </Text>
      </View>
      <View style={bs.track}>
        {budgetPct > 0 && <View style={[bs.budgetMark, { left: `${budgetPct * 100}%` as any }]} />}
        <View style={[bs.fill, { width: `${pct * 100}%` as any, backgroundColor: isOver ? colors.red : color }]} />
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  row: { gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.white, fontSize: 14, fontWeight: "800", letterSpacing: 1, fontFamily: fonts.mono as any, textTransform: "uppercase" },
  amt: { color: colors.white, fontSize: 16, fontWeight: "900", fontFamily: fonts.mono as any },
  budget: { color: "#aaa", fontWeight: "400", fontSize: 13 },
  track: { height: 16, backgroundColor: "#1a1a1a", position: "relative" },
  fill: { height: 16, position: "absolute", left: 0, top: 0 },
  budgetMark: { position: "absolute", top: -3, width: 2, height: 22, backgroundColor: "rgba(255,255,255,0.4)", zIndex: 1 },
});

// ─── VERTICAL BAR GROUP (income vs expenses side by side) ──────────
function VerticalBars({ income, expenses }: { income: number; expenses: number }) {
  const max = Math.max(income, expenses, 1);
  const incPct = (income / max) * 100;
  const expPct = (expenses / max) * 100;
  const remaining = income - expenses;
  return (
    <View style={vs.container}>
      <View style={vs.barsRow}>
        <View style={vs.barCol}>
          <Text style={[vs.amt, { color: colors.primary }]}>{formatCurrency(income)}</Text>
          <View style={vs.barTrack}>
            <View style={[vs.barFill, { height: `${incPct}%` as any, backgroundColor: colors.primary }]} />
          </View>
          <Text style={vs.barLabel}>BUDGET</Text>
        </View>
        <View style={vs.barCol}>
          <Text style={[vs.amt, { color: colors.red }]}>{formatCurrency(expenses)}</Text>
          <View style={vs.barTrack}>
            <View style={[vs.barFill, { height: `${expPct}%` as any, backgroundColor: colors.red }]} />
          </View>
          <Text style={vs.barLabel}>SPENT</Text>
        </View>
      </View>
      <View style={vs.netRow}>
        <Text style={vs.netLabel}>REMAINING</Text>
        <Text style={[vs.netVal, { color: remaining >= 0 ? colors.primary : colors.red }]}>
          {remaining >= 0 ? "+" : ""}{formatCurrency(remaining)}
        </Text>
      </View>
    </View>
  );
}

const vs = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingVertical: 16, gap: 12 },
  barsRow: { flexDirection: "row", gap: 12, height: 180 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  amt: { fontSize: 18, fontWeight: "900", fontFamily: fonts.mono as any },
  barTrack: { flex: 1, width: "100%", backgroundColor: "#1a1a1a", justifyContent: "flex-end" },
  barFill: { width: "100%" },
  barLabel: { color: "#bbb", fontSize: 12, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 2, borderTopColor: colors.primary },
  netLabel: { color: "#bbb", fontSize: 14, fontWeight: "800", letterSpacing: 3, fontFamily: fonts.mono as any },
  netVal: { fontSize: 24, fontWeight: "900", fontFamily: fonts.mono as any },
});

export default function OverviewScreen() {
  const { transactions, currentMonth, setCurrentMonth, currentBudget, profile } = useApp();
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const expectedIncome = profile?.monthlyIncome ?? 0;

  const flexCats = useMemo(() => currentBudget?.categories.filter((c) => c.type === "flexible") ?? [], [currentBudget]);
  const flexBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    flexCats.forEach((c) => { map[c.name.toLowerCase()] = getMonthlyAmount(c.allocated, c.frequency || "monthly"); });
    return map;
  }, [flexCats]);

  const monthTxns = useMemo(() =>
    transactions.filter((t) => {
      if (!t.date.startsWith(currentMonth) || t.type === "transfer") return false;
      if (accountFilter && t.accountTag !== accountFilter) return false;
      return true;
    }),
    [transactions, currentMonth, accountFilter]
  );

  const actualIncome = useMemo(() => monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const actualExpenses = useMemo(() => monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [monthTxns]);

  // Spending by category (exclude bill payments)
  const catSpend = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter((t) => t.type === "expense").forEach((t) => {
      if (t.note?.startsWith("Paid:") || t.note?.endsWith("- marked paid") || t.note?.endsWith("- paid")) return;
      if (t.category.toLowerCase() === "bills") return;
      const k = t.category.toLowerCase();
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTxns]);

  const maxCatSpend = catSpend.length > 0 ? Math.max(catSpend[0][1], ...catSpend.map(([k]) => flexBudgets[k] ?? 0)) : 0;

  // Account tags for filter
  const userAccounts = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach((t) => { if (t.accountTag) tags.add(t.accountTag); });
    return Array.from(tags);
  }, [transactions]);

  const navigate = (delta: number) => { impact("Light"); setCurrentMonth(shiftMonth(currentMonth, delta)); };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        <View style={s.topBar}>
          <Text style={s.logo}>CHARTS</Text>
        </View>

        {/* Month nav */}
        <View style={s.monthNav}>
          <Pressable onPress={() => navigate(-1)} hitSlop={16}><ChevronLeft size={20} color={colors.white} /></Pressable>
          <Text style={s.monthLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
          <Pressable onPress={() => navigate(1)} hitSlop={16}><ChevronRight size={20} color={colors.white} /></Pressable>
        </View>

        {/* ── CASH FLOW - real income logged vs real spending ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionText}>// CASH FLOW</Text>
        </View>
        <VerticalBars income={actualIncome} expenses={actualExpenses} />

        {/* ── SPENDING BY CATEGORY - HORIZONTAL BAR CHART ── */}
        {catSpend.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionText}>// SPENDING BY CATEGORY</Text>
              <Text style={s.sectionRight}>{formatCurrency(catSpend.reduce((s, [, a]) => s + a, 0))}</Text>
            </View>
            {catSpend.map(([cat, amt]) => (
              <Bar
                key={cat}
                label={cat}
                amount={amt}
                max={maxCatSpend}
                color={colors.yellow}
                budget={flexBudgets[cat]}
              />
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  topBar: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,255,204,0.15)",
  },
  logo: { color: colors.primary, fontSize: 26, fontWeight: "900", letterSpacing: 8, fontFamily: fonts.heading as any },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)",
  },
  monthLabel: { color: colors.white, fontSize: 16, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(0,255,204,0.15)",
    backgroundColor: "rgba(0,255,204,0.03)", marginTop: 2,
  },
  sectionText: { color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 3, fontFamily: fonts.mono as any },
  sectionRight: { color: "#bbb", fontSize: 15, fontWeight: "700", fontFamily: fonts.mono as any },
});
