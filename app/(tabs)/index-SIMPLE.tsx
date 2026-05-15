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
  const { transactions, addTransaction, userAccounts, currentBudget } = useApp();
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [sheetVisible, setSheetVisible] = useState(false);

  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);

  // Calculate week totals
  const weekIncome = useMemo(() => {
    // Get total weekly income expected: $3,231/week
    return 3231;
  }, []);

  const weekFixedExpenses = useMemo(() => {
    // Get total weekly fixed expenses: $1,410/week 
    return 1410;
  }, []);

  const available = weekIncome - weekFixedExpenses;
  const isPaycheckWeek = true; // Show payday for now

  const navigate = (delta: number) => { 
    impact("Light"); 
    setCurrentWeek(shiftWeek(currentWeek, delta)); 
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
          <Pressable style={[styles.filterPill, styles.filterPillActive]}>
            <Text style={[styles.filterPillText, styles.filterPillTextActive]}>ALL</Text>
          </Pressable>
          <Pressable style={styles.filterPill}>
            <Text style={styles.filterPillEmoji}>🏦</Text>
            <Text style={styles.filterPillText}>MAIN CHASE</Text>
          </Pressable>
          <Pressable style={styles.filterPill}>
            <Text style={styles.filterPillEmoji}>👤</Text>
            <Text style={styles.filterPillText}>DARTH VADER</Text>
          </Pressable>
          <Pressable style={styles.filterPill}>
            <Text style={styles.filterPillEmoji}>🇺🇸</Text>
            <Text style={styles.filterPillText}>USAA</Text>
          </Pressable>
        </ScrollView>

        {/* ── HERO - MASSIVE AVAILABLE AMOUNT ── */}
        <View style={[styles.hero, { backgroundColor: available >= 0 ? colors.primary : colors.red }]}>
          <Text style={styles.heroEyebrow}>AVAILABLE</Text>
          <Text style={styles.heroNum}>{available >= 0 ? "+" : ""}{formatCurrency(available)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(available)}</Text>
              <Text style={styles.heroStatLabel}>WEEK NET</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>$0.00</Text>
              <Text style={styles.heroStatLabel}>ROLLOVER</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>$0.00</Text>
              <Text style={styles.heroStatLabel}>BILLS DUE</Text>
            </View>
          </View>
        </View>

        {/* ── BIG INCOME NUMBER ── */}
        <View style={styles.bigSection}>
          <Text style={styles.bigLabel}>WEEKLY INCOME</Text>
          <Text style={styles.bigIncomeAmount}>+{formatCurrency(weekIncome)}</Text>
        </View>

        {/* ── BIG EXPENSES NUMBER ── */}
        <View style={styles.bigSection}>
          <Text style={styles.bigLabel}>WEEKLY FIXED EXPENSES</Text>
          <Text style={styles.bigExpenseAmount}>-{formatCurrency(weekFixedExpenses)}</Text>
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
    marginBottom: spacing.lg,
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

  // Big sections
  bigSection: {
    paddingVertical: 32,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  bigLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: spacing.sm,
    fontFamily: fonts.mono as any,
  },
  bigIncomeAmount: {
    color: colors.primary,
    fontSize: 48,
    fontWeight: "900",
    fontFamily: fonts.mono as any,
  },
  bigExpenseAmount: {
    color: colors.red,
    fontSize: 48,
    fontWeight: "900",
    fontFamily: fonts.mono as any,
  },
});