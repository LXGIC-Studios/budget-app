import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency, formatMonthLabel, shiftMonth, getMonthlyAmount } from "../../src/utils";

function calcSnowball(debts: { name: string; balance: number; minimumPayment: number }[], extra: number) {
  const sorted = [...debts].sort((a, b) => a.balance - b.balance);
  let months = 0;
  let remaining = sorted.map((d) => ({ ...d }));
  while (remaining.length > 0 && months < 120) {
    months++;
    let snowball = extra;
    const next: typeof remaining = [];
    for (const d of remaining) {
      const pay = d === remaining[0] ? d.minimumPayment + snowball : d.minimumPayment;
      d.balance = Math.max(0, d.balance - pay);
      if (d === remaining[0]) snowball = 0;
      if (d.balance > 0) next.push(d);
      else if (d !== remaining[0]) snowball += d.minimumPayment;
    }
    remaining = next;
  }
  return months;
}

export default function OverviewScreen() {
  const { transactions, currentMonth, setCurrentMonth, currentBudget, debts } = useApp();

  const monthTxns = useMemo(() =>
    transactions.filter((t) => t.date.startsWith(currentMonth) && t.type !== "transfer"),
    [transactions, currentMonth]
  );

  const totalIncome = useMemo(() => monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const totalSpent = useMemo(() => monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const net = totalIncome - totalSpent;

  const catSpend = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter((t) => t.type === "expense").forEach((t) => {
      const k = t.category.toLowerCase(); map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTxns]);

  const flexBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    currentBudget?.categories.filter((c) => c.type === "flexible").forEach((c) => {
      map[c.name.toLowerCase()] = getMonthlyAmount(c.allocated, c.frequency || "monthly");
    });
    return map;
  }, [currentBudget]);

  const fixedCats = useMemo(() => currentBudget?.categories.filter((c) => c.type === "fixed") ?? [], [currentBudget]);
  const totalFixed = fixedCats.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const extra = Math.max(0, net - totalFixed - 500);
  const snowballMonths = debts.length > 0 ? calcSnowball(debts.map((d) => ({ name: d.name, balance: d.balance, minimumPayment: d.minimumPayment })), extra) : 0;

  const navigate = (delta: number) => { impact("Light"); setCurrentMonth(shiftMonth(currentMonth, delta)); };

  const incomeBySource = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter((t) => t.type === "income").forEach((t) => {
      const k = t.note || t.category; map[k] = (map[k] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTxns]);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* TOP BAR */}
        <View style={s.topBar}>
          <Text style={s.logo}>OVERVIEW</Text>
        </View>

        {/* Month nav */}
        <View style={s.monthNav}>
          <Pressable onPress={() => navigate(-1)} hitSlop={16}><ChevronLeft size={20} color={colors.textSecondary} /></Pressable>
          <Text style={s.monthLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
          <Pressable onPress={() => navigate(1)} hitSlop={16}><ChevronRight size={20} color={colors.textSecondary} /></Pressable>
        </View>

        {/* Big 3 stats - shield-scan full bleed style */}
        <View style={s.statsRow}>
          <View style={[s.statBlock, { backgroundColor: colors.primary }]}>
            <Text style={s.statNum}>{formatCurrency(totalIncome)}</Text>
            <Text style={s.statLabel}>INCOME</Text>
          </View>
          <View style={[s.statBlock, { backgroundColor: colors.red }]}>
            <Text style={s.statNum}>{formatCurrency(totalSpent)}</Text>
            <Text style={s.statLabel}>SPENT</Text>
          </View>
          <View style={[s.statBlock, { backgroundColor: net >= 0 ? "#1a1a1a" : colors.red, borderWidth: net >= 0 ? 2 : 0, borderColor: colors.primary }]}>
            <Text style={[s.statNum, { color: net >= 0 ? colors.primary : "#000" }]}>{formatCurrency(net)}</Text>
            <Text style={[s.statLabel, { color: net >= 0 ? colors.textSecondary : "rgba(0,0,0,0.6)" }]}>LEFT</Text>
          </View>
        </View>

        {/* Fixed bills */}
        {fixedCats.length > 0 && (
          <>
            <View style={s.blockHeader}>
              <Text style={s.blockHeaderText}>// FIXED BILLS</Text>
              <Text style={s.blockHeaderRight}>{formatCurrency(totalFixed)}/mo</Text>
            </View>
            <View style={s.block}>
              {fixedCats.map((c) => (
                <View key={c.id} style={s.row}>
                  <Text style={s.rowEmoji}>{c.emoji}</Text>
                  <Text style={s.rowName}>{c.name}</Text>
                  {c.dueDay && <Text style={s.dueTag}>due {c.dueDay}</Text>}
                  <Text style={s.rowAmtRed}>{formatCurrency(getMonthlyAmount(c.allocated, c.frequency || "monthly"))}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Spending breakdown */}
        {catSpend.length > 0 && (
          <>
            <View style={s.blockHeader}>
              <Text style={s.blockHeaderText}>// SPENDING BREAKDOWN</Text>
              <Text style={s.blockHeaderRight}>{formatCurrency(totalSpent)}</Text>
            </View>
            <View style={s.block}>
              {catSpend.map(([cat, amt]) => {
                const budget = flexBudgets[cat] ?? 0;
                const isOver = budget > 0 && amt > budget;
                const pct = budget > 0 ? Math.min(amt / budget, 1) : 0;
                return (
                  <View key={cat} style={s.catRow}>
                    <View style={s.catTop}>
                      <Text style={s.catName}>{cat.toUpperCase()}</Text>
                      <Text style={[s.catAmt, isOver && { color: colors.red }]}>
                        {formatCurrency(amt)}{budget > 0 && <Text style={s.catOf}> / {formatCurrency(budget)}</Text>}
                      </Text>
                    </View>
                    {budget > 0 && (
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${pct * 100}%` as any, backgroundColor: isOver ? colors.red : colors.primary }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Income sources */}
        {incomeBySource.length > 0 && (
          <>
            <View style={s.blockHeader}>
              <Text style={s.blockHeaderText}>// INCOME SOURCES</Text>
              <Text style={s.blockHeaderRight}>{formatCurrency(totalIncome)}</Text>
            </View>
            <View style={s.block}>
              {incomeBySource.map(([label, amt]) => (
                <View key={label} style={s.row}>
                  <View style={s.greenDot} />
                  <Text style={s.rowName}>{label}</Text>
                  <Text style={s.rowAmtGreen}>+{formatCurrency(amt)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Debt snowball */}
        {debts.length > 0 && (
          <>
            <View style={s.blockHeader}>
              <Text style={s.blockHeaderText}>// DEBT SNOWBALL</Text>
              <Text style={s.blockHeaderRight}>{formatCurrency(totalDebt)}</Text>
            </View>
            <View style={s.block}>
              {debts.slice().sort((a, b) => a.balance - b.balance).map((d, i) => (
                <View key={d.id} style={s.debtRow}>
                  <View style={[s.debtNum, i === 0 && { backgroundColor: colors.primary }]}>
                    <Text style={[s.debtNumText, i === 0 && { color: "#000" }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.debtName}>{d.name}</Text>
                    <Text style={s.debtMin}>min ${d.minimumPayment}/mo</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.debtBal}>{formatCurrency(d.balance)}</Text>
                    {i === 0 && <Text style={s.targetTag}>TARGET</Text>}
                  </View>
                </View>
              ))}
              <View style={s.row}>
                <Text style={s.rowName}>MIN PAYMENTS</Text>
                <Text style={s.rowAmtRed}>{formatCurrency(totalMin)}/mo</Text>
              </View>
              {snowballMonths > 0 && extra > 0 && (
                <View style={[s.row, { backgroundColor: "rgba(0,255,204,0.05)" }]}>
                  <Text style={s.rowName}>DEBT FREE IN</Text>
                  <Text style={s.rowAmtGreen}>~{snowballMonths} months</Text>
                </View>
              )}
            </View>
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
  logo: { color: colors.primary, fontSize: 24, fontWeight: "900", letterSpacing: 8 },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  monthLabel: { color: colors.white, fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  statsRow: { flexDirection: "row" },
  statBlock: { flex: 1, padding: spacing.md, alignItems: "center", gap: 4 },
  statNum: { color: "#000", fontSize: 20, fontWeight: "900" },
  statLabel: { color: "rgba(0,0,0,0.5)", fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  blockHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(0,255,204,0.15)",
    backgroundColor: "rgba(0,255,204,0.03)", marginTop: 2,
  },
  blockHeaderText: { color: colors.primary, fontSize: 11, fontWeight: "700", letterSpacing: 3 },
  blockHeaderRight: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  block: { borderBottomWidth: 1, borderBottomColor: "rgba(0,255,204,0.08)" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  rowEmoji: { fontSize: 16, width: 26 },
  rowName: { flex: 1, color: colors.white, fontSize: 14, fontWeight: "500" },
  dueTag: { color: colors.textSecondary, fontSize: 11 },
  rowAmtRed: { color: colors.red, fontSize: 15, fontWeight: "800" },
  rowAmtGreen: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  catRow: {
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 6,
  },
  catTop: { flexDirection: "row", alignItems: "center" },
  catName: { flex: 1, color: colors.white, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  catAmt: { color: colors.white, fontSize: 14, fontWeight: "800" },
  catOf: { color: colors.textSecondary, fontWeight: "400", fontSize: 12 },
  barTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.08)" },
  barFill: { height: 4 },
  debtRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  debtNum: {
    width: 28, height: 28, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  debtNumText: { color: colors.textSecondary, fontSize: 12, fontWeight: "900" },
  debtName: { color: colors.white, fontSize: 14, fontWeight: "700" },
  debtMin: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  debtBal: { color: colors.red, fontSize: 16, fontWeight: "900" },
  targetTag: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 2, marginTop: 2 },
});
