import { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Edit3 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, fonts } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency, formatMonthLabel, shiftMonth, getMonthlyAmount } from "../../src/utils";
import { ACCOUNT_TAGS } from "../../src/types";

// ─── BAR CHART COMPONENT ───────────────────────────────────────────
function HBar({ label, amount, maxAmount, color, budget }: {
  label: string; amount: number; maxAmount: number; color: string; budget?: number;
}) {
  const pct = maxAmount > 0 ? Math.min(amount / maxAmount, 1) : 0;
  const isOver = budget != null && budget > 0 && amount > budget;
  const budgetPct = budget && maxAmount > 0 ? Math.min(budget / maxAmount, 1) : 0;
  return (
    <View style={cs.barRow}>
      <View style={cs.barLabelRow}>
        <Text style={cs.barLabel}>{label}</Text>
        <Text style={[cs.barAmt, isOver && { color: colors.red }]}>
          {formatCurrency(amount)}
          {budget != null && budget > 0 && (
            <Text style={cs.barBudget}> / {formatCurrency(budget)}</Text>
          )}
        </Text>
      </View>
      <View style={cs.barTrack}>
        {budgetPct > 0 && (
          <View style={[cs.barBudgetLine, { left: `${budgetPct * 100}%` as any }]} />
        )}
        <View style={[cs.barFill, { width: `${pct * 100}%` as any, backgroundColor: isOver ? colors.red : color }]} />
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  barRow: { gap: 4, paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  barLabel: { color: colors.white, fontSize: 13, fontWeight: "800", letterSpacing: 1, fontFamily: fonts.mono as any, textTransform: "uppercase" },
  barAmt: { color: colors.white, fontSize: 15, fontWeight: "800", fontFamily: fonts.mono as any },
  barBudget: { color: colors.textSecondary, fontWeight: "400", fontSize: 11 },
  barTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.06)", position: "relative" },
  barFill: { height: 6, position: "absolute", left: 0, top: 0 },
  barBudgetLine: { position: "absolute", top: -2, width: 2, height: 10, backgroundColor: "rgba(255,255,255,0.3)", zIndex: 1 },
});

// ─── COMPARISON BAR ────────────────────────────────────────────────
function ComparisonBar({ leftLabel, leftAmount, rightLabel, rightAmount, leftColor, rightColor }: {
  leftLabel: string; leftAmount: number; rightLabel: string; rightAmount: number; leftColor: string; rightColor: string;
}) {
  const max = Math.max(leftAmount, rightAmount, 1);
  const leftPct = leftAmount / max;
  const rightPct = rightAmount / max;
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ alignItems: "flex-start", gap: 2 }}>
          <Text style={{ color: leftColor, fontSize: 26, fontWeight: "900", fontFamily: fonts.mono as any }}>{formatCurrency(leftAmount)}</Text>
          <Text style={{ color: leftColor, fontSize: 12, fontWeight: "700", letterSpacing: 2, opacity: 1, fontFamily: fonts.mono as any }}>{leftLabel}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={{ color: rightColor, fontSize: 26, fontWeight: "900", fontFamily: fonts.mono as any }}>{formatCurrency(rightAmount)}</Text>
          <Text style={{ color: rightColor, fontSize: 12, fontWeight: "700", letterSpacing: 2, opacity: 1, fontFamily: fonts.mono as any }}>{rightLabel}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 2 }}>
        <View style={{ flex: leftPct, height: 10, backgroundColor: leftColor }} />
        <View style={{ flex: rightPct, height: 10, backgroundColor: rightColor }} />
      </View>
    </View>
  );
}

export default function OverviewScreen() {
  const { transactions, currentMonth, setCurrentMonth, currentBudget, debts, profile } = useApp();
  const router = useRouter();
  const [accountFilter, setAccountFilter] = useState<string | null>(null);

  // ─── ACCOUNT FILTER TAGS ─────────────────────────────────────────
  const usedTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach((t) => { if (t.accountTag) tags.add(t.accountTag); });
    return Array.from(tags);
  }, [transactions]);

  // ─── EXPECTED INCOME (from profile) ──────────────────────────────
  const expectedIncome = profile?.monthlyIncome ?? 0;

  // ─── EXPECTED FIXED BILLS ────────────────────────────────────────
  const fixedCats = useMemo(() => currentBudget?.categories.filter((c) => c.type === "fixed") ?? [], [currentBudget]);
  const totalFixedExpected = fixedCats.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);

  // ─── FLEX BUDGETS ────────────────────────────────────────────────
  const flexCats = useMemo(() => currentBudget?.categories.filter((c) => c.type === "flexible") ?? [], [currentBudget]);
  const totalFlexBudget = flexCats.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);
  const flexBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    flexCats.forEach((c) => { map[c.name.toLowerCase()] = getMonthlyAmount(c.allocated, c.frequency || "monthly"); });
    return map;
  }, [flexCats]);

  // ─── ACTUAL TRANSACTIONS (filtered by account) ──────────────────
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
  const netCashFlow = actualIncome - actualExpenses;

  // ─── SPENDING BY CATEGORY (actual, excluding bill payments) ──────
  const catSpend = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter((t) => t.type === "expense").forEach((t) => {
      // Skip Mark Paid entries - they're tracked in fixed bills
      if (t.note?.startsWith("Paid:") || t.note?.endsWith("- marked paid") || t.note?.endsWith("- paid")) return;
      if (t.category.toLowerCase() === "bills") return;
      const k = t.category.toLowerCase();
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTxns]);

  const maxCatSpend = catSpend.length > 0 ? catSpend[0][1] : 0;

  // ─── BILLS PAID THIS MONTH ──────────────────────────────────────
  const billsPaid = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter((t) => t.type === "expense").forEach((t) => {
      if (t.note?.startsWith("Paid:") || t.note?.endsWith("- marked paid") || t.note?.endsWith("- paid") || t.category.toLowerCase() === "bills") {
        const name = t.note?.replace(/^Paid:\s*/, "").replace(/\s*-\s*(marked paid|paid)$/, "") || t.category;
        map[name] = (map[name] ?? 0) + t.amount;
      }
    });
    return map;
  }, [monthTxns]);
  const totalBillsPaid = Object.values(billsPaid).reduce((s, v) => s + v, 0);

  // ─── INCOME BY SOURCE ───────────────────────────────────────────
  const incomeBySource = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter((t) => t.type === "income").forEach((t) => {
      const k = t.note || t.category;
      map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTxns]);
  const maxIncome = incomeBySource.length > 0 ? incomeBySource[0][1] : 0;

  const navigate = (delta: number) => { impact("Light"); setCurrentMonth(shiftMonth(currentMonth, delta)); };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── TOP BAR ── */}
        <View style={s.topBar}>
          <Text style={s.logo}>OVERVIEW</Text>
          <Pressable onPress={() => router.push("/(tabs)/budget")} style={s.editBudgetBtn}>
            <Edit3 size={14} color="#000" strokeWidth={2.5} />
            <Text style={s.editBudgetText}>EDIT BUDGET</Text>
          </Pressable>
        </View>

        {/* ── MONTH NAV ── */}
        <View style={s.monthNav}>
          <Pressable onPress={() => navigate(-1)} hitSlop={16}><ChevronLeft size={20} color={colors.textSecondary} /></Pressable>
          <Text style={s.monthLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
          <Pressable onPress={() => navigate(1)} hitSlop={16}><ChevronRight size={20} color={colors.textSecondary} /></Pressable>
        </View>

        {/* ── ACCOUNT FILTER ── */}
        {usedTags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterBar}>
            <Pressable
              onPress={() => { impact("Light"); setAccountFilter(null); }}
              style={[s.filterPill, !accountFilter && s.filterPillActive]}
            >
              <Text style={[s.filterPillText, !accountFilter && s.filterPillTextActive]}>ALL</Text>
            </Pressable>
            {usedTags.map((tag) => {
              const info = ACCOUNT_TAGS.find((t) => t.id === tag);
              if (!info) return null;
              return (
                <Pressable
                  key={tag}
                  onPress={() => { impact("Light"); setAccountFilter(accountFilter === tag ? null : tag); }}
                  style={[s.filterPill, accountFilter === tag && s.filterPillActive]}
                >
                  <Text style={s.filterPillEmoji}>{info.emoji}</Text>
                  <Text style={[s.filterPillText, accountFilter === tag && s.filterPillTextActive]}>{info.label.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── INCOME vs EXPENSES CHART ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionHeaderText}>// INCOME vs EXPENSES</Text>
        </View>
        <ComparisonBar
          leftLabel="ACTUAL INCOME"
          leftAmount={actualIncome}
          rightLabel="ACTUAL SPENT"
          rightAmount={actualExpenses}
          leftColor={colors.primary}
          rightColor={colors.red}
        />
        <View style={s.netRow}>
          <Text style={s.netLabel}>NET CASH FLOW</Text>
          <Text style={[s.netValue, { color: netCashFlow >= 0 ? colors.primary : colors.red }]}>
            {netCashFlow >= 0 ? "+" : ""}{formatCurrency(netCashFlow)}
          </Text>
        </View>

        {/* ── EXPECTED vs ACTUAL ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionHeaderText}>// EXPECTED THIS MONTH</Text>
          <Text style={s.sectionHeaderRight}>{formatCurrency(expectedIncome)}</Text>
        </View>
        <View style={s.expectRow}>
          <View style={[s.expectBlock, { borderColor: colors.primary }]}>
            <Text style={s.expectLabel}>EXPECTED IN</Text>
            <Text style={[s.expectNum, { color: colors.primary }]}>{formatCurrency(expectedIncome)}</Text>
            <Text style={s.expectSub}>RECEIVED: {formatCurrency(actualIncome)}</Text>
            <View style={s.expectBar}>
              <View style={[s.expectBarFill, { width: `${Math.min((actualIncome / Math.max(expectedIncome, 1)) * 100, 100)}%` as any, backgroundColor: colors.primary }]} />
            </View>
          </View>
          <View style={[s.expectBlock, { borderColor: colors.red }]}>
            <Text style={s.expectLabel}>EXPECTED OUT</Text>
            <Text style={[s.expectNum, { color: colors.red }]}>{formatCurrency(totalFixedExpected + totalFlexBudget)}</Text>
            <Text style={s.expectSub}>SPENT: {formatCurrency(actualExpenses)}</Text>
            <View style={s.expectBar}>
              <View style={[s.expectBarFill, { width: `${Math.min((actualExpenses / Math.max(totalFixedExpected + totalFlexBudget, 1)) * 100, 100)}%` as any, backgroundColor: colors.red }]} />
            </View>
          </View>
        </View>

        {/* ── BILLS STATUS ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionHeaderText}>// FIXED BILLS</Text>
          <Text style={s.sectionHeaderRight}>{formatCurrency(totalBillsPaid)} / {formatCurrency(totalFixedExpected)}</Text>
        </View>
        <View style={s.billsSummary}>
          <View style={s.billsBar}>
            <View style={[s.billsBarFill, { width: `${Math.min((totalBillsPaid / Math.max(totalFixedExpected, 1)) * 100, 100)}%` as any }]} />
          </View>
          <Text style={s.billsPct}>
            {Math.round((totalBillsPaid / Math.max(totalFixedExpected, 1)) * 100)}% PAID
          </Text>
        </View>
        {fixedCats.map((c) => {
          const expected = getMonthlyAmount(c.allocated, c.frequency || "monthly");
          const paid = billsPaid[c.name] ?? 0;
          const isPaid = paid >= expected * 0.95; // 95% threshold
          return (
            <View key={c.id} style={[s.billRow, isPaid && s.billRowPaid]}>
              <Text style={s.billEmoji}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.billName, isPaid && s.billStrike]}>{c.name}</Text>
                {c.dueDay != null && <Text style={s.billDue}>due {c.dueDay}</Text>}
              </View>
              {isPaid ? (
                <Text style={s.billPaidTag}>PAID</Text>
              ) : (
                <Text style={s.billAmt}>{formatCurrency(expected)}</Text>
              )}
            </View>
          );
        })}

        {/* ── SPENDING CHART ── */}
        {catSpend.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionHeaderText}>// SPENDING BY CATEGORY</Text>
              <Text style={s.sectionHeaderRight}>{formatCurrency(catSpend.reduce((s, [, a]) => s + a, 0))}</Text>
            </View>
            {catSpend.map(([cat, amt]) => (
              <HBar
                key={cat}
                label={cat}
                amount={amt}
                maxAmount={Math.max(maxCatSpend, flexBudgets[cat] ?? 0)}
                color={colors.yellow}
                budget={flexBudgets[cat]}
              />
            ))}
          </>
        )}

        {/* ── INCOME SOURCES CHART ── */}
        {incomeBySource.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionHeaderText}>// INCOME SOURCES</Text>
              <Text style={s.sectionHeaderRight}>{formatCurrency(actualIncome)}</Text>
            </View>
            {incomeBySource.map(([label, amt]) => (
              <HBar
                key={label}
                label={label}
                amount={amt}
                maxAmount={maxIncome}
                color={colors.primary}
              />
            ))}
          </>
        )}

        {/* ── DEBT SNAPSHOT ── */}
        {debts.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionHeaderText}>// DEBT</Text>
              <Text style={s.sectionHeaderRight}>{formatCurrency(debts.reduce((s, d) => s + d.balance, 0))}</Text>
            </View>
            {debts.slice().sort((a, b) => a.balance - b.balance).map((d, i) => (
              <View key={d.id} style={s.debtRow}>
                <View style={[s.debtNum, i === 0 && { backgroundColor: colors.primary }]}>
                  <Text style={[s.debtNumText, i === 0 && { color: "#000" }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.debtName}>{d.name}</Text>
                  <Text style={s.debtMin}>min ${d.minimumPayment}/mo</Text>
                </View>
                <Text style={s.debtBal}>{formatCurrency(d.balance)}</Text>
              </View>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Top bar
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,255,204,0.15)",
  },
  logo: { color: colors.primary, fontSize: 24, fontWeight: "900", letterSpacing: 8, fontFamily: fonts.heading as any },
  editBudgetBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 12,
  },
  editBudgetText: { color: "#000", fontSize: 12, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.mono as any },

  // Month nav
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)",
  },
  monthLabel: { color: colors.white, fontSize: 14, fontWeight: "800", letterSpacing: 2, fontFamily: fonts.mono as any },

  // Net row
  netRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)",
  },
  netLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
  netValue: { fontSize: 22, fontWeight: "900", fontFamily: fonts.mono as any },

  // Section headers
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(0,255,204,0.15)",
    backgroundColor: "rgba(0,255,204,0.03)", marginTop: 2,
  },
  sectionHeaderText: { color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 3, fontFamily: fonts.mono as any },
  sectionHeaderRight: { color: "#bbb", fontSize: 14, fontWeight: "600", fontFamily: fonts.mono as any },

  // Expected blocks
  expectRow: { flexDirection: "row", gap: 1 },
  expectBlock: {
    flex: 1, padding: spacing.md, gap: 6,
    backgroundColor: "rgba(255,255,255,0.02)", borderBottomWidth: 2,
  },
  expectLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },
  expectNum: { fontSize: 22, fontWeight: "900", fontFamily: fonts.mono as any },
  expectSub: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.mono as any },
  expectBar: { height: 4, backgroundColor: "rgba(255,255,255,0.06)" },
  expectBarFill: { height: 4 },

  // Bills summary
  billsSummary: {
    paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 6,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  billsBar: { height: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  billsBarFill: { height: 8, backgroundColor: colors.primary },
  billsPct: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 2, fontFamily: fonts.mono as any },

  // Bill rows
  billRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  billRowPaid: { opacity: 0.8 },
  billEmoji: { fontSize: 14, width: 22 },
  billName: { color: colors.white, fontSize: 15, fontWeight: "600", fontFamily: fonts.body as any },
  billStrike: { textDecorationLine: "line-through", color: colors.textSecondary },
  billDue: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.mono as any },
  billAmt: { color: colors.red, fontSize: 16, fontWeight: "800", fontFamily: fonts.mono as any },
  billPaidTag: { color: colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 2, fontFamily: fonts.mono as any },

  // Debt
  debtRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  debtNum: {
    width: 28, height: 28, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  debtNumText: { color: colors.textSecondary, fontSize: 12, fontWeight: "900", fontFamily: fonts.mono as any },
  debtName: { color: colors.white, fontSize: 16, fontWeight: "700", fontFamily: fonts.body as any },
  debtMin: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: fonts.mono as any },
  debtBal: { color: colors.red, fontSize: 18, fontWeight: "900", fontFamily: fonts.mono as any },

  // Account filter bar
  filterBar: {
    flexDirection: "row", gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)",
  },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: "#1c1c1c", backgroundColor: "#050505",
  },
  filterPillActive: {
    borderColor: colors.primary, backgroundColor: "rgba(0,255,204,0.1)",
  },
  filterPillEmoji: { fontSize: 10 },
  filterPillText: {
    color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1.5,
    fontFamily: fonts.mono as any,
  },
  filterPillTextActive: { color: colors.primary },
});
