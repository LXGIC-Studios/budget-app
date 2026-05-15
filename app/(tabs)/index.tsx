import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Settings, RefreshCw } from "lucide-react-native";
import { useRouter } from "expo-router";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, fonts } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import {
  formatCurrency,
  getWeekKey,
  getWeekRange,
  formatWeekLabel,
  shiftWeek,
  formatShortDate,
} from "../../src/utils";
import type { Transaction } from "../../src/types";

export default function HomeScreen() {
  const { transactions, addTransaction, userAccounts } = useApp();
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);

  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);

  const weekTxns = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date);
      if (!(d >= weekRange.start && d <= weekRange.end)) return false;
      if (accountFilter && t.accountTag !== accountFilter) return false;
      return true;
    }), [transactions, weekRange, accountFilter]
  );

  // Calculate week totals
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const weekIncome = useMemo(() =>
    weekTxns
      .filter((t) => t.type === "income")
      .filter((t) => t.received === true || new Date(t.date) <= today)
      .reduce((s, t) => s + t.amount, 0),
    [weekTxns, today]
  );

  const weekExpenses = useMemo(() => 
    weekTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), 
    [weekTxns]
  );

  const weekNet = weekIncome - weekExpenses;

  // Rollover from prior weeks
  const weekRollover = useMemo(() => {
    let balance = 0;
    const EPOCH = new Date("2026-03-30T00:00:00");
    transactions.forEach((t) => {
      if (t.type === "transfer" || t.category === "transfer") {
        if (!accountFilter) return;
        if (t.accountTag !== accountFilter) return;
      }
      const d = new Date(t.date);
      if (d < EPOCH) return;
      if (d >= weekRange.start) return;
      if (accountFilter && t.accountTag !== accountFilter) return;
      
      if (t.type === "income") balance += t.amount;
      else if (t.type === "expense") balance -= t.amount;
    });
    return balance;
  }, [transactions, weekRange, accountFilter]);

  const billsDue = 0; // TODO: Calculate from budget categories
  const available = weekNet + weekRollover;

  const incomeTxns = useMemo(() => 
    weekTxns.filter((t) => t.type === "income").sort((a, b) => a.date.localeCompare(b.date)), 
    [weekTxns]
  );

  const expenseTxns = useMemo(() => 
    weekTxns.filter((t) => t.type === "expense").sort((a, b) => b.date.localeCompare(a.date)), 
    [weekTxns]
  );

  const isPaycheckWeek = incomeTxns.length > 0;

  const navigate = (delta: number) => { 
    impact("Light"); 
    setCurrentWeek(shiftWeek(currentWeek, delta)); 
  };

  const getTagInfo = (tag?: string) => {
    if (!tag) return null;
    const found = userAccounts.find((t) => t.id === tag);
    return found ? { label: found.label, emoji: found.emoji } : null;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── MASTHEAD ── */}
        <View style={styles.masthead}>
          <View>
            <Text style={styles.logo}>STACKD</Text>
            <Text style={styles.logoSub}>HOUSEHOLD BUDGET</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isPaycheckWeek && (
              <View style={styles.paydayChip}>
                <Text style={styles.paydayText}>$ PAYDAY</Text>
              </View>
            )}
            <Pressable style={styles.recurringBtn}>
              <RefreshCw size={16} color="#8B5CF6" strokeWidth={2.5} />
            </Pressable>
            <Pressable onPress={() => router.push("/(tabs)/settings")} style={styles.settingsBtn}>
              <Settings size={18} color={colors.primary} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* ── WEEK NAV ── */}
        <View style={styles.weekRow}>
          <Pressable onPress={() => navigate(-1)} hitSlop={16} style={styles.navArrow}>
            <ChevronLeft size={18} color={colors.primary} strokeWidth={3} />
          </Pressable>
          <Text style={styles.weekLabel}>{formatWeekLabel(currentWeek).toUpperCase()}</Text>
          <Pressable onPress={() => navigate(1)} hitSlop={16} style={styles.navArrow}>
            <ChevronRight size={18} color={colors.primary} strokeWidth={3} />
          </Pressable>
        </View>

        {/* ── ACCOUNT FILTER ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          <Pressable
            onPress={() => { impact("Light"); setAccountFilter(null); }}
            style={[styles.filterPill, !accountFilter && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, !accountFilter && styles.filterPillTextActive]}>ALL</Text>
          </Pressable>
          {userAccounts.map((acct) => (
            <Pressable
              key={acct.id}
              onPress={() => { impact("Light"); setAccountFilter(accountFilter === acct.id ? null : acct.id); }}
              style={[styles.filterPill, accountFilter === acct.id && styles.filterPillActive]}
            >
              <Text style={styles.filterPillEmoji}>{acct.emoji}</Text>
              <Text style={[styles.filterPillText, accountFilter === acct.id && styles.filterPillTextActive]}>{acct.label.toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── HERO - MASSIVE AVAILABLE AMOUNT ── */}
        <View style={[styles.hero, { backgroundColor: available >= 0 ? colors.primary : colors.red }]}>
          <Text style={styles.heroEyebrow}>AVAILABLE</Text>
          <Text style={styles.heroNum}>{available >= 0 ? "+" : ""}{formatCurrency(available)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(weekNet)}</Text>
              <Text style={styles.heroStatLabel}>WEEK NET</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(weekRollover)}</Text>
              <Text style={styles.heroStatLabel}>ROLLOVER</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(billsDue)}</Text>
              <Text style={styles.heroStatLabel}>BILLS DUE</Text>
            </View>
          </View>
        </View>

        {/* ── COMING IN ── */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionLabelAccent} />
          <Text style={styles.sectionLabelText}>COMING IN</Text>
        </View>
        {incomeTxns.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No income logged this week</Text>
          </View>
        ) : (
          incomeTxns.map((t) => {
            const isReceived = t.received === true || new Date(t.date) <= today;
            const isPending = !isReceived;
            return (
              <View key={t.id} style={[styles.incomeRow, isPending && styles.pendingRow]}>
                <View style={styles.incomeLeft}>
                  <View style={[styles.greenPip, isPending && { backgroundColor: colors.textSecondary }]} />
                  <View>
                    <Text style={[styles.incomeTitle, isPending && styles.pendingText]}>{t.note || t.category}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.rowSub}>{formatShortDate(t.date)}</Text>
                      {isPending && <Text style={styles.pendingLabel}>PENDING</Text>}
                      {getTagInfo(t.accountTag) && (
                        <View style={styles.acctChip}>
                          <Text style={styles.acctChipText}>{getTagInfo(t.accountTag)!.emoji} {getTagInfo(t.accountTag)!.label}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <Text style={styles.incomeAmt}>+{formatCurrency(t.amount)}</Text>
              </View>
            );
          })
        )}

        {/* ── LOGGED TRANSACTIONS ── */}
        {expenseTxns.length > 0 && (
          <>
            <View style={styles.sectionLabel}>
              <View style={[styles.sectionLabelAccent, { backgroundColor: colors.textSecondary }]} />
              <Text style={styles.sectionLabelText}>LOGGED</Text>
              <Text style={styles.sectionLabelAmt}>{expenseTxns.length} transactions</Text>
            </View>
            {expenseTxns.map((t) => (
              <View key={t.id} style={styles.expenseRow}>
                <View style={styles.redPip} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseCat}>{t.category.toUpperCase()}</Text>
                  {t.note ? <Text style={styles.expenseNote}>{t.note}</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.rowSub}>{formatShortDate(t.date)}</Text>
                    {getTagInfo(t.accountTag) && (
                      <View style={styles.acctChip}>
                        <Text style={styles.acctChipText}>{getTagInfo(t.accountTag)!.emoji} {getTagInfo(t.accountTag)!.label}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.expenseAmt}>-{formatCurrency(t.amount)}</Text>
              </View>
            ))}
          </>
        )}

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
  container: { flex: 1, backgroundColor: "#000" },

  // Masthead
  masthead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logo: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 8,
    fontFamily: fonts.heading as any,
  },
  logoSub: {
    color: "#666",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    marginTop: -2,
    fontFamily: fonts.mono as any,
  },
  paydayChip: {
    backgroundColor: "#BFFF00",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paydayText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontFamily: fonts.mono as any,
  },
  recurringBtn: { padding: 8 },
  settingsBtn: { padding: 8 },

  // Week nav
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  navArrow: { padding: 8 },
  weekLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 3,
    fontFamily: fonts.mono as any,
  },

  // Filter bar
  filterBar: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: spacing.lg,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#111",
  },
  filterPillActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0,255,204,0.1)",
  },
  filterPillEmoji: { fontSize: 14 },
  filterPillText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    fontFamily: fonts.mono as any,
  },
  filterPillTextActive: { color: colors.primary },

  // Hero
  hero: {
    paddingVertical: 32,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 12,
  },
  heroEyebrow: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 4,
    fontFamily: fonts.mono as any,
  },
  heroNum: {
    color: "#000",
    fontSize: 48,
    fontWeight: "900",
    fontFamily: fonts.mono as any,
  },
  heroBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  heroStat: { alignItems: "center", gap: 4 },
  heroStatNum: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: fonts.mono as any,
  },
  heroStatLabel: {
    color: "#000",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    opacity: 0.7,
    fontFamily: fonts.mono as any,
  },
  heroBarDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#000",
    opacity: 0.3,
  },

  // Section labels
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  sectionLabelAccent: {
    width: 3,
    height: 16,
    backgroundColor: colors.primary,
  },
  sectionLabelText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    flex: 1,
    fontFamily: fonts.mono as any,
  },
  sectionLabelAmt: {
    color: "#666",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: fonts.mono as any,
  },

  // Income rows
  incomeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  pendingRow: { opacity: 0.6 },
  incomeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  greenPip: {
    width: 3,
    height: 32,
    backgroundColor: colors.primary,
  },
  incomeTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fonts.body as any,
  },
  pendingText: { color: "#999" },
  incomeAmt: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
    fontFamily: fonts.mono as any,
  },

  // Expense rows
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  redPip: {
    width: 3,
    height: 32,
    backgroundColor: colors.red,
  },
  expenseCat: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fonts.body as any,
  },
  expenseNote: {
    color: "#999",
    fontSize: 13,
    marginTop: 2,
    fontFamily: fonts.body as any,
  },
  expenseAmt: {
    color: colors.red,
    fontSize: 18,
    fontWeight: "800",
    fontFamily: fonts.mono as any,
  },

  // Common
  rowSub: {
    color: "#666",
    fontSize: 11,
    fontFamily: fonts.mono as any,
  },
  pendingLabel: {
    color: "#666",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    fontFamily: fonts.mono as any,
  },
  acctChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(0,255,204,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,255,204,0.3)",
  },
  acctChipText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "600",
    fontFamily: fonts.mono as any,
  },
  emptyRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 24,
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
    fontFamily: fonts.body as any,
  },
});// Force update Thu May 14 17:20:07 CDT 2026
// FORCE REBUILD Thu May 14 20:19:07 CDT 2026
