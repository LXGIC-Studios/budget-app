import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import {
  formatCurrency,
  formatMonthLabel,
  shiftMonth,
  getMonthlyAmount,
} from "../../src/utils";

export default function MonthlyViewScreen() {
  const { currentBudget } = useApp();
  const [currentMonth, setCurrentMonth] = useState("2026-05");

  const fixedBills = useMemo(() => {
    const cats = currentBudget?.categories ?? [];
    return cats
      .filter((c) => c.type === "fixed" && c.dueDay)
      .sort((a, b) => a.dueDay! - b.dueDay!);
  }, [currentBudget]);

  const monthTotal = useMemo(() => {
    return fixedBills.reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);
  }, [fixedBills]);

  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  // Group bills by week
  const billsByWeek = useMemo(() => {
    const weeks: { weekLabel: string; bills: any[] }[] = [];
    const year = parseInt(currentMonth.split('-')[0]);
    const month = parseInt(currentMonth.split('-')[1]) - 1;
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let currentWeekStart = new Date(firstDay);
    currentWeekStart.setDate(firstDay.getDate() - firstDay.getDay()); // Start of week
    
    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      
      const weekBills = fixedBills.filter(bill => {
        const dueDate = new Date(year, month, bill.dueDay!);
        return dueDate >= currentWeekStart && dueDate <= weekEnd;
      });
      
      if (weekBills.length > 0 || (currentWeekStart.getMonth() === month || weekEnd.getMonth() === month)) {
        const startDay = Math.max(currentWeekStart.getDate(), currentWeekStart.getMonth() === month ? currentWeekStart.getDate() : 1);
        const endDay = Math.min(weekEnd.getDate(), weekEnd.getMonth() === month ? weekEnd.getDate() : lastDay.getDate());
        
        weeks.push({
          weekLabel: `${currentMonth.split('-')[1]}/${startDay} - ${currentMonth.split('-')[1]}/${endDay}`,
          bills: weekBills
        });
      }
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  }, [currentMonth, fixedBills]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>MONTHLY VIEW</Text>
          <Text style={styles.headerSubtitle}>Bills by month and week</Text>
        </View>

        {/* Month Navigation */}
        <View style={styles.monthRow}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
            <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
            <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Month Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Calendar size={32} color={colors.primary} />
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>TOTAL BILLS THIS MONTH</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(monthTotal)}</Text>
              <Text style={styles.summaryCount}>{fixedBills.length} bills scheduled</Text>
            </View>
          </View>
        </View>

        {/* Bills by Week */}
        {billsByWeek.length === 0 ? (
          <View style={styles.empty}>
            <Calendar size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No bills this month</Text>
            <Text style={styles.emptySubtext}>Your bills will appear here</Text>
          </View>
        ) : (
          billsByWeek.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekSection}>
              <View style={styles.weekHeader}>
                <Text style={styles.weekTitle}>WEEK {weekIndex + 1}</Text>
                <Text style={styles.weekDates}>{week.weekLabel}</Text>
                <Text style={styles.weekTotal}>
                  {formatCurrency(week.bills.reduce((s, b) => s + getMonthlyAmount(b.allocated, b.frequency || "monthly"), 0))}
                </Text>
              </View>
              
              {week.bills.length === 0 ? (
                <View style={styles.weekEmpty}>
                  <Text style={styles.weekEmptyText}>No bills due this week</Text>
                </View>
              ) : (
                week.bills.map((bill) => {
                  const monthlyAmount = getMonthlyAmount(bill.allocated, bill.frequency || "monthly");
                  
                  return (
                    <View key={bill.id} style={styles.billCard}>
                      <View style={styles.billContent}>
                        <View style={styles.billLeft}>
                          <View style={styles.dueDateBadge}>
                            <Text style={styles.dueDateText}>{bill.dueDay}</Text>
                          </View>
                          <Text style={styles.billEmoji}>{bill.emoji}</Text>
                          <View style={styles.billInfo}>
                            <Text style={styles.billName}>{bill.name.toUpperCase()}</Text>
                            <Text style={styles.billFreq}>
                              DUE {bill.dueDay} • {bill.frequency?.toUpperCase() || "MONTHLY"}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.billRight}>
                          <Text style={styles.billAmount}>{formatCurrency(monthlyAmount)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ))
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
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  monthLabel: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 2,
    minWidth: 200,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    color: colors.red,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  summaryCount: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  weekSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  weekTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  weekDates: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  weekTotal: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "800",
  },
  weekEmpty: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  weekEmptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    fontStyle: "italic",
  },
  billCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  billContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  billLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  dueDateBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center",
  },
  dueDateText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  billEmoji: {
    fontSize: 20,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  billFreq: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  billRight: {
    alignItems: "flex-end",
  },
  billAmount: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "800",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 14,
  },
});