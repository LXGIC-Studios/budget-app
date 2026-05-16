import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import {
  formatCurrency,
  getMonthlyAmount,
  getMonthKey,
  formatMonthLabel,
  shiftMonth,
} from "../../src/utils";

export default function BillsCalendarScreen() {
  const { currentBudget, currentMonth, setCurrentMonth } = useApp();
  
  const fixedBills = useMemo(() => {
    const cats = currentBudget?.categories ?? [];
    return cats
      .filter((c) => c.type === "fixed" && c.dueDay)
      .sort((a, b) => a.dueDay! - b.dueDay!);
  }, [currentBudget]);

  const billsByDay = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    fixedBills.forEach(bill => {
      const day = bill.dueDay!;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(bill);
    });
    return grouped;
  }, [fixedBills]);

  // Calculate total bills amount
  const totalBillsAmount = useMemo(() => {
    return fixedBills.reduce((total, bill) => {
      return total + getMonthlyAmount(bill.allocated, bill.frequency || "monthly");
    }, 0);
  }, [fixedBills]);

  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  // Generate calendar days (simplified - just 1-31)
  const dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
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

        {/* Bills Summary Hero */}
        <View style={styles.summaryHero}>
          <Text style={styles.heroEyebrow}>📅 BILLS SCHEDULED</Text>
          <Text style={styles.heroNum}>{fixedBills.length} BILLS</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalBillsAmount)}</Text>
              <Text style={styles.heroStatLabel}>TOTAL</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{fixedBills.length}</Text>
              <Text style={styles.heroStatLabel}>BILLS</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalBillsAmount / 12)}</Text>
              <Text style={styles.heroStatLabel}>AVG/MONTH</Text>
            </View>
          </View>
        </View>

        {/* Clean Calendar Grid */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>CALENDAR VIEW</Text>
          <Text style={styles.sectionSubtitle}>Bills scheduled by day of month</Text>
          
          <View style={styles.calendarGrid}>
            {dayNumbers.map(day => {
              const bills = billsByDay[day] || [];
              const hasBills = bills.length > 0;
              const billCount = bills.length;
              const totalForDay = bills.reduce((sum, bill) => sum + bill.allocated, 0);
              
              return (
                <Pressable 
                  key={day} 
                  style={[styles.dayCard, hasBills && styles.dayCardWithBills]}
                  onPress={() => hasBills && impact("Light")}
                >
                  <Text style={[styles.dayNumber, hasBills && styles.dayNumberActive]}>{day}</Text>
                  
                  {hasBills && (
                    <View style={styles.dayIndicator}>
                      <Text style={styles.dayCount}>{billCount}</Text>
                      <Text style={styles.dayAmount}>{formatCurrency(totalForDay)}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Bills List by Due Date */}
        <View style={styles.billsSection}>
          <View style={styles.billsHeader}>
            <Text style={styles.sectionTitle}>BILLS BY DUE DATE</Text>
            <Pressable style={styles.addBtn}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          </View>
          
          {fixedBills.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyText}>No bills scheduled</Text>
              <Text style={styles.emptySubtext}>Add your bills to track due dates</Text>
            </View>
          ) : (
            fixedBills.map((bill) => {
              const monthlyAmount = getMonthlyAmount(bill.allocated, bill.frequency || "monthly");
              
              return (
                <View key={bill.id} style={styles.billCard}>
                  <View style={styles.billContent}>
                    <View style={styles.dueDateBadge}>
                      <Text style={styles.dueDateNumber}>{bill.dueDay}</Text>
                    </View>
                    
                    <View style={styles.billDetails}>
                      <Text style={styles.billEmoji}>{bill.emoji}</Text>
                      <View style={styles.billInfo}>
                        <Text style={styles.billName}>{bill.name.toUpperCase()}</Text>
                        <Text style={styles.billFreq}>
                          {bill.frequency?.toUpperCase() || "MONTHLY"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.billAmount}>
                      <Text style={styles.billAmountNum}>{formatCurrency(monthlyAmount)}</Text>
                      <Text style={styles.billAmountLabel}>per month</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  monthLabel: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    minWidth: 200,
    textAlign: "center",
  },

  // Hero Summary
  summaryHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    backgroundColor: "#00ffcc", // Primary teal
    marginBottom: spacing.xl,
  },
  heroEyebrow: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  heroNum: {
    color: "#000000",
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 48,
    textAlign: "center",
  },
  heroBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  heroStat: { 
    alignItems: "center", 
    gap: 4,
    minWidth: 80,
  },
  heroStatNum: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  heroStatLabel: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    opacity: 0.7,
    textTransform: "uppercase",
    textAlign: "center",
  },
  heroBarDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#000000",
    opacity: 0.3,
  },

  // Calendar Section
  calendarSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: spacing.lg,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  dayCard: {
    width: "12.5%",
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCardWithBills: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  dayNumber: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  dayNumberActive: {
    color: colors.primary,
  },
  dayIndicator: {
    alignItems: "center",
  },
  dayCount: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  dayAmount: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: "600",
  },

  // Bills List
  billsSection: {
    paddingHorizontal: spacing.lg,
  },
  billsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
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
    gap: spacing.md,
  },
  dueDateBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: "center",
  },
  dueDateNumber: {
    color: "#000",
    fontSize: 18,
    fontWeight: "800",
  },
  billDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  billEmoji: {
    fontSize: 24,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  billFreq: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  billAmount: {
    alignItems: "flex-end",
  },
  billAmountNum: {
    color: colors.red,
    fontSize: 18,
    fontWeight: "800",
  },
  billAmountLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
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