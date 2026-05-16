import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Check } from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import {
  formatCurrency,
  getWeekKey,
  getWeekRange,
  formatWeekLabel,
  shiftWeek,
  getMonthlyAmount,
  generateId,
} from "../../src/utils";

export default function Dashboard() {
  const { profile, addTransaction, currentBudget } = useApp();
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [paidBills, setPaidBills] = useState<Set<string>>(new Set());

  // Load paid bills from storage on mount
  useEffect(() => {
    loadPaidBills();
  }, []);

  const loadPaidBills = async () => {
    try {
      const saved = await AsyncStorage.getItem('paidBills');
      if (saved) {
        const paidArray = JSON.parse(saved);
        setPaidBills(new Set(paidArray));
      }
    } catch (error) {
      console.log('Error loading paid bills:', error);
    }
  };

  const savePaidBills = async (newPaidBills: Set<string>) => {
    try {
      const paidArray = Array.from(newPaidBills);
      await AsyncStorage.setItem('paidBills', JSON.stringify(paidArray));
    } catch (error) {
      console.log('Error saving paid bills:', error);
    }
  };

  const monthlyIncome = profile?.monthlyIncome ?? 12926;

  // Fixed outgoing = sum of all fixed budget categories
  const fixedOutgoing = useMemo(() => {
    const cats = currentBudget?.categories ?? [];
    return cats
      .filter((c) => c.type === "fixed")
      .reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);
  }, [currentBudget]);

  // Calculate available (income - fixed expenses)
  const availableAmount = monthlyIncome - fixedOutgoing;

  const weekRange = useMemo(() => getWeekRange(currentWeek), [currentWeek]);

  // Bills due this week
  const billsDueThisWeek = useMemo(() => {
    if (!currentBudget?.categories) return [];
    
    const weekStart = weekRange.start;
    const weekEnd = weekRange.end;
    
    return currentBudget.categories
      .filter(cat => cat.type === 'fixed' && cat.frequency === 'monthly' && cat.dueDay)
      .filter(cat => {
        const dueDay = cat.dueDay!;
        
        // Check if due day falls in current week
        const currentMonthDue = new Date(weekStart.getFullYear(), weekStart.getMonth(), dueDay);
        if (currentMonthDue >= weekStart && currentMonthDue <= weekEnd) return true;
        
        // Check next month if week spans boundary
        if (weekStart.getMonth() !== weekEnd.getMonth()) {
          const nextMonthDue = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), dueDay);
          if (nextMonthDue >= weekStart && nextMonthDue <= weekEnd) return true;
        }
        
        return false;
      })
      .sort((a, b) => a.dueDay! - b.dueDay!);
  }, [currentBudget, weekRange]);

  // Calculate total bills due this week
  const totalBillsDueThisWeek = useMemo(() => {
    return billsDueThisWeek.reduce((total, bill) => total + bill.allocated, 0);
  }, [billsDueThisWeek]);

  // Calculate weekly available amount
  const weeklyIncome = monthlyIncome / 4.33;
  const weeklyFixedOutgoing = fixedOutgoing / 4.33;
  const weeklyAvailable = weeklyIncome - totalBillsDueThisWeek;

  const navigateWeek = (delta: number) => {
    impact("Light");
    setCurrentWeek(shiftWeek(currentWeek, delta));
  };

  const toggleBillPaid = async (bill: any) => {
    const isPaid = paidBills.has(bill.id);
    
    if (isPaid) {
      // Unmark as paid
      notification("Light");
      const newPaidBills = new Set(paidBills);
      newPaidBills.delete(bill.id);
      setPaidBills(newPaidBills);
      await savePaidBills(newPaidBills);
    } else {
      // Mark as paid
      notification("Success");
      const newPaidBills = new Set([...paidBills, bill.id]);
      setPaidBills(newPaidBills);
      await savePaidBills(newPaidBills);
      
      // Add transaction record
      await addTransaction({
        id: generateId(),
        type: "expense",
        amount: bill.allocated,
        category: bill.name,
        note: `Paid: ${bill.name}`,
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Week Navigation */}
        <View style={styles.monthRow}>
          <Pressable onPress={() => navigateWeek(-1)} hitSlop={12}>
            <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatWeekLabel(currentWeek).toUpperCase()}</Text>
          <Pressable onPress={() => navigateWeek(1)} hitSlop={12}>
            <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* MASSIVE INCOME HERO - STACKD Style */}
        <View style={styles.incomeHero}>
          <Text style={styles.heroEyebrow}>💵 MONTHLY INCOME</Text>
          <Text style={styles.heroNum}>{formatCurrency(monthlyIncome)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(monthlyIncome)}</Text>
              <Text style={styles.heroStatLabel}>TOTAL</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>$0.00</Text>
              <Text style={styles.heroStatLabel}>BONUS</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>$0.00</Text>
              <Text style={styles.heroStatLabel}>OTHER</Text>
            </View>
          </View>
        </View>

        {/* MASSIVE EXPENSES HERO - STACKD Style */}
        <View style={styles.expenseHero}>
          <Text style={styles.heroEyebrow}>🏠 FIXED EXPENSES</Text>
          <Text style={styles.heroNum}>{formatCurrency(fixedOutgoing)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(fixedOutgoing)}</Text>
              <Text style={styles.heroStatLabel}>TOTAL</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>$0.00</Text>
              <Text style={styles.heroStatLabel}>VARIABLE</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>$0.00</Text>
              <Text style={styles.heroStatLabel}>EXTRA</Text>
            </View>
          </View>
        </View>

        {/* MASSIVE AVAILABLE HERO - STACKD Style */}
        <View style={[styles.availableHero, availableAmount >= 0 ? styles.availablePositive : styles.availableNegative]}>
          <Text style={styles.heroEyebrow}>✨ AVAILABLE</Text>
          <Text style={styles.heroNum}>{availableAmount >= 0 ? '+' : ''}{formatCurrency(availableAmount)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(weeklyAvailable)}</Text>
              <Text style={styles.heroStatLabel}>WEEK NET</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>$0.00</Text>
              <Text style={styles.heroStatLabel}>ROLLOVER</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalBillsDueThisWeek)}</Text>
              <Text style={styles.heroStatLabel}>BILLS DUE</Text>
            </View>
          </View>
        </View>

        {/* Bills Due This Week Section */}
        {billsDueThisWeek.length > 0 && (
          <View style={styles.billsSection}>
            <View style={styles.billsHeader}>
              <View>
                <Text style={styles.billsTitle}>BILLS DUE THIS WEEK</Text>
                <Text style={styles.billsSubtitle}>
                  {billsDueThisWeek.length} bills • {formatCurrency(totalBillsDueThisWeek)} total
                </Text>
              </View>
              {paidBills.size > 0 && (
                <Pressable 
                  style={styles.clearBtn}
                  onPress={async () => {
                    setPaidBills(new Set());
                    await AsyncStorage.removeItem('paidBills');
                    impact('Light');
                  }}
                >
                  <Text style={styles.clearBtnText}>CLEAR PAID</Text>
                </Pressable>
              )}
            </View>
            
            {billsDueThisWeek.map((bill) => {
              const isPaid = paidBills.has(bill.id);
              
              return (
                <Pressable
                  key={bill.id}
                  style={[styles.billCard, isPaid && styles.billCardPaid]}
                  onPress={() => toggleBillPaid(bill)}
                >
                  <View style={styles.billContent}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billEmoji}>{bill.emoji}</Text>
                      <View>
                        <Text style={[styles.billName, isPaid && styles.billNamePaid]}>
                          {bill.name.toUpperCase()}
                        </Text>
                        <Text style={styles.billDue}>DUE {bill.dueDay}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.billRight}>
                      {isPaid ? (
                        <Pressable 
                          style={styles.paidBadge}
                          onPress={() => toggleBillPaid(bill)}
                        >
                          <Check size={16} color="#000" strokeWidth={3} />
                          <Text style={styles.paidBadgeText}>PAID</Text>
                        </Pressable>
                      ) : (
                        <View>
                          <Text style={styles.billAmount}>{formatCurrency(bill.allocated)}</Text>
                          <Text style={styles.tapToPay}>TAP TO PAY</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* No Bills Due Message */}
        {billsDueThisWeek.length === 0 && (
          <View style={styles.noBillsSection}>
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyText}>No bills due this week</Text>
              <Text style={styles.emptySubtext}>Enjoy the break!</Text>
            </View>
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
  
  // MASSIVE HERO SECTIONS - EXACT STACKD STYLE
  incomeHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    backgroundColor: "#00ffcc", // Primary teal
    marginBottom: 0,
  },
  expenseHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    backgroundColor: "#ff0040", // Primary red
    marginBottom: 0,
  },
  availableHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    marginBottom: spacing.xl,
  },
  availablePositive: {
    backgroundColor: "#00ffcc", // Green for positive
  },
  availableNegative: {
    backgroundColor: "#ff0040", // Red for negative
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

  // Bills Section
  billsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  billsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  billsTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  billsSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  clearBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  clearBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
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
  billCardPaid: {
    backgroundColor: colors.greenBg,
    borderColor: colors.greenBorder,
  },
  billContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  billEmoji: {
    fontSize: 24,
  },
  billName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  billNamePaid: {
    color: colors.textSecondary,
  },
  billDue: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  billRight: {
    alignItems: "flex-end",
  },
  billAmount: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  tapToPay: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 2,
  },
  paidBadgeText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  
  // No Bills Section
  noBillsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
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
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 14,
  },
});