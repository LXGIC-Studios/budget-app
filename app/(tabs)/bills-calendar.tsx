import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, Edit3, Trash2, Plus } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import {
  formatCurrency,
  getMonthlyAmount,
} from "../../src/utils";

export default function BillsCalendarScreen() {
  const { currentBudget } = useApp();

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

  const dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>BILLS CALENDAR</Text>
          <Text style={styles.headerSubtitle}>Manage bill due dates</Text>
        </View>

        {/* Add Bill Button */}
        <View style={styles.addSection}>
          <Pressable style={styles.addBtn}>
            <Plus size={16} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>ADD NEW BILL</Text>
          </Pressable>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>BILL DUE DATES</Text>
          <Text style={styles.sectionSubtitle}>{fixedBills.length} bills scheduled</Text>
          
          <View style={styles.calendarGrid}>
            {dayNumbers.map(day => {
              const bills = billsByDay[day] || [];
              const hasBills = bills.length > 0;
              
              return (
                <View key={day} style={[styles.dayCard, hasBills && styles.dayCardWithBills]}>
                  <Text style={[styles.dayNumber, hasBills && styles.dayNumberActive]}>{day}</Text>
                  
                  {hasBills && (
                    <View style={styles.billsList}>
                      {bills.map((bill, index) => (
                        <View key={bill.id} style={styles.billItem}>
                          <Text style={styles.billEmoji}>{bill.emoji}</Text>
                          <Text style={styles.billName}>{bill.name}</Text>
                          <Text style={styles.billAmount}>{formatCurrency(bill.allocated)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Bills List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>ALL BILLS</Text>
          
          {fixedBills.length === 0 ? (
            <View style={styles.empty}>
              <Calendar size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No bills scheduled</Text>
              <Text style={styles.emptySubtext}>Add your bills to track due dates</Text>
            </View>
          ) : (
            fixedBills.map((bill) => {
              const monthlyAmount = getMonthlyAmount(bill.allocated, bill.frequency || "monthly");
              
              return (
                <View key={bill.id} style={styles.billCard}>
                  <View style={styles.billContent}>
                    <View style={styles.billLeft}>
                      <View style={styles.dueDateBadge}>
                        <Text style={styles.dueDateText}>{bill.dueDay}</Text>
                      </View>
                      <Text style={styles.billEmojiLarge}>{bill.emoji}</Text>
                      <View style={styles.billInfo}>
                        <Text style={styles.billNameLarge}>{bill.name.toUpperCase()}</Text>
                        <Text style={styles.billFreq}>
                          {bill.frequency?.toUpperCase() || "MONTHLY"} • DUE {bill.dueDay}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.billRight}>
                      <Text style={styles.billAmountLarge}>{formatCurrency(monthlyAmount)}</Text>
                      <Text style={styles.billMonthly}>per month</Text>
                    </View>
                    
                    <View style={styles.billActions}>
                      <Pressable style={styles.actionBtn}>
                        <Edit3 size={16} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable style={styles.actionBtn}>
                        <Trash2 size={16} color={colors.red} />
                      </Pressable>
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
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: "center",
  },
  headerTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 1,
  },
  addSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  calendarSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  listSection: {
    paddingHorizontal: spacing.lg,
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
    gap: 8,
  },
  dayCard: {
    width: "13%",
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
    fontSize: 12,
    fontWeight: "700",
  },
  dayNumberActive: {
    color: colors.primary,
  },
  billsList: {
    marginTop: 4,
    alignItems: "center",
  },
  billItem: {
    alignItems: "center",
    marginBottom: 2,
  },
  billEmoji: {
    fontSize: 8,
  },
  billName: {
    color: colors.primary,
    fontSize: 6,
    fontWeight: "600",
    textAlign: "center",
  },
  billAmount: {
    color: colors.primary,
    fontSize: 5,
    fontWeight: "800",
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
    gap: spacing.sm,
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
    fontSize: 14,
    fontWeight: "800",
  },
  billEmojiLarge: {
    fontSize: 24,
  },
  billInfo: {
    flex: 1,
  },
  billNameLarge: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  billFreq: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  billRight: {
    alignItems: "flex-end",
    marginRight: spacing.sm,
  },
  billAmountLarge: {
    color: colors.red,
    fontSize: 18,
    fontWeight: "800",
  },
  billMonthly: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  billActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 14,
  },
});