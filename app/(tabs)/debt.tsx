import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Trash2, Target, Check } from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency, generateId, getMonthlyAmount } from "../../src/utils";
import { calculateSnowball } from "../../src/lib/snowball";
import type { Debt, DebtType } from "../../src/types";

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: "Credit Card",
  student_loan: "Student Loan",
  car_loan: "Car Loan",
  mortgage: "Mortgage",
  medical: "Medical",
  personal: "Personal",
  other: "Other",
};

const DEBT_TYPE_EMOJIS: Record<DebtType, string> = {
  credit_card: "\uD83D\uDCB3",
  student_loan: "\uD83C\uDF93",
  car_loan: "\uD83D\uDE97",
  mortgage: "\uD83C\uDFE0",
  medical: "\uD83C\uDFE5",
  personal: "\uD83D\uDCB0",
  other: "\uD83D\uDCE6",
};

const BABY_STEPS = [
  { step: 1, title: "Starter Emergency Fund", desc: "Save $1,000" },
  { step: 2, title: "Debt Snowball", desc: "Pay off all debt" },
  { step: 3, title: "Full Emergency Fund", desc: "Save 3-6 months expenses" },
  { step: 4, title: "Invest 15%", desc: "Retirement savings" },
  { step: 5, title: "College Fund", desc: "Save for children" },
  { step: 6, title: "Pay Off Mortgage", desc: "Be mortgage-free" },
  { step: 7, title: "Build Wealth", desc: "Give generously" },
];

const DEBT_TYPES: DebtType[] = [
  "credit_card",
  "student_loan",
  "car_loan",
  "medical",
  "personal",
  "other",
];

export default function DebtScreen() {
  const {
    profile,
    debts,
    transactions,
    currentMonth,
    currentBudget,
    addDebt,
    updateDebt,
    deleteDebt,
    updateEmergencyFund,
    saveProfile,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEFModal, setShowEFModal] = useState(false);
  const [efAmount, setEfAmount] = useState("");

  // Add debt form state
  const [debtName, setDebtName] = useState("");
  const [debtBalance, setDebtBalance] = useState("");
  const [debtMinPayment, setDebtMinPayment] = useState("");
  const [debtRate, setDebtRate] = useState("");
  const [debtType, setDebtType] = useState<DebtType>("credit_card");

  const babyStep = profile?.babyStep ?? 1;
  const profileIncome = profile?.monthlyIncome ?? 0;
  const emergencyFundCurrent = profile?.emergencyFundCurrent ?? 0;

  // Auto-calculate actual income (exclude transfers)
  const actualIncome = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.date.startsWith(currentMonth) &&
            t.type === "income" &&
            t.category !== "transfer"
        )
        .reduce((s, t) => s + t.amount, 0),
    [transactions, currentMonth]
  );
  const monthlyIncome = actualIncome > 0 ? actualIncome : profileIncome;

  // Monthly expenses = real spending (exclude transfers).
  // Use budget fixed categories if set, otherwise actual spending.
  // Exclude budget categories that are debt payments - the snowball calculator
  // already accounts for minimum payments separately, so including them here
  // would double-count.
  const monthlyExpenses = useMemo(() => {
    if (currentBudget?.categories?.length) {
      const debtNames = debts.map(d => d.name.toLowerCase());
      return currentBudget.categories
        .filter((c) => c.type === "fixed")
        .filter((c) => {
          // Exclude budget items that match debt names (case-insensitive, partial match)
          const lower = c.name.toLowerCase();
          return !debtNames.some(dn => {
            // Check if any word (3+ chars) from the debt name appears in the budget name, or vice versa
            const dnWords = dn.split(/\s+/).filter(w => w.length >= 3);
            const lowerWords = lower.split(/\s+/).filter(w => w.length >= 3);
            return lower.includes(dn) || dn.includes(lower) ||
              dnWords.some(w => lower.includes(w)) ||
              lowerWords.some(w => dn.includes(w));
          });
        })
        .reduce((s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"), 0);
    }
    return transactions
      .filter(
        (t) =>
          t.date.startsWith(currentMonth) &&
          t.type === "expense" &&
          t.category !== "transfer"
      )
      .reduce((s, t) => s + t.amount, 0);
  }, [currentBudget, transactions, currentMonth, debts]);

  const snowball = useMemo(
    () => calculateSnowball(debts, monthlyIncome, monthlyExpenses),
    [debts, monthlyIncome, monthlyExpenses]
  );

  const resetForm = () => {
    setDebtName("");
    setDebtBalance("");
    setDebtMinPayment("");
    setDebtRate("");
    setDebtType("credit_card");
  };

  const handleAddDebt = () => {
    const balance = parseFloat(debtBalance);
    const minPayment = parseFloat(debtMinPayment);
    const rate = parseFloat(debtRate);
    if (!debtName || !balance || !minPayment) return;

    impact("Medium");
    const now = new Date().toISOString();
    addDebt({
      id: generateId(),
      name: debtName,
      balance,
      minimumPayment: minPayment,
      interestRate: rate || 0,
      type: debtType,
      createdAt: now,
      updatedAt: now,
    });
    resetForm();
    setShowAddModal(false);
  };

  const handleDeleteDebt = (id: string) => {
    notification("Warning");
    deleteDebt(id);
  };

  const handleUpdateEF = () => {
    const amount = parseFloat(efAmount);
    if (isNaN(amount)) return;
    impact("Medium");
    updateEmergencyFund(amount);
    setShowEFModal(false);
    setEfAmount("");
  };

  const handleAdvanceStep = () => {
    if (!profile) return;
    impact("Medium");
    saveProfile({ ...profile, babyStep: Math.min(babyStep + 1, 7) });
  };

  const efProgress = Math.min(emergencyFundCurrent / 1000, 1);
  const fullEFGoal = monthlyExpenses * 3;
  const fullEFProgress = fullEFGoal > 0 ? Math.min(emergencyFundCurrent / fullEFGoal, 1) : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Debt Free Plan</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Baby Steps Progress */}
        <View style={styles.stepsRow}>
          {BABY_STEPS.map((bs) => (
            <View
              key={bs.step}
              style={[
                styles.stepDot,
                bs.step < babyStep && styles.stepDotDone,
                bs.step === babyStep && styles.stepDotCurrent,
                bs.step > babyStep && styles.stepDotFuture,
              ]}
            >
              {bs.step < babyStep ? (
                <Check size={10} color={colors.bg} strokeWidth={3} />
              ) : (
                <Text
                  style={[
                    styles.stepDotText,
                    bs.step === babyStep && { color: colors.primary },
                  ]}
                >
                  {bs.step}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.currentStepCard}>
          <Text style={styles.currentStepLabel}>BABY STEP {babyStep}</Text>
          <Text style={styles.currentStepTitle}>
            {BABY_STEPS[babyStep - 1]?.title}
          </Text>
          <Text style={styles.currentStepDesc}>
            {BABY_STEPS[babyStep - 1]?.desc}
          </Text>
        </View>

        {/* Baby Step 1: Emergency Fund */}
        {babyStep === 1 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Starter Emergency Fund</Text>
              <Target size={20} color={colors.primary} />
            </View>
            <Text style={styles.efAmount}>
              {formatCurrency(emergencyFundCurrent)}{" "}
              <Text style={styles.efGoal}>/ $1,000</Text>
            </Text>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${efProgress * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.efPct}>
              {Math.round(efProgress * 100)}% complete
            </Text>
            <Pressable
              onPress={() => {
                setEfAmount(emergencyFundCurrent.toString());
                setShowEFModal(true);
              }}
              style={styles.efBtn}
            >
              <Text style={styles.efBtnText}>Update Balance</Text>
            </Pressable>
          </View>
        )}

        {/* Baby Step 2: Debt Snowball */}
        {babyStep === 2 && (
          <>
            {/* Snowball Summary */}
            {debts.length > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>TOTAL DEBT</Text>
                  <Text style={[styles.summaryValue, { color: colors.red }]}>
                    {formatCurrency(
                      debts.reduce((s, d) => s + d.balance, 0)
                    )}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>SNOWBALL</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>
                    {formatCurrency(snowball.snowballPayment)}
                    <Text style={styles.summaryUnit}>/mo</Text>
                  </Text>
                </View>
              </View>
            )}

            {debts.length > 0 && (
              <View style={styles.debtFreeCard}>
                <Text style={styles.debtFreeLabel}>DEBT-FREE DATE</Text>
                <Text style={styles.debtFreeDate}>
                  {snowball.debtFreeDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                {snowball.totalInterestPaid > 0 && (
                  <Text style={styles.debtFreeInterest}>
                    {formatCurrency(snowball.totalInterestPaid)} total interest
                  </Text>
                )}
              </View>
            )}

            {/* Debt List */}
            {debts.map((debt, idx) => {
              const isFocus = idx === 0;
              const result = snowball.results.find(
                (r) => r.debtId === debt.id
              );
              return (
                <View
                  key={debt.id}
                  style={[styles.debtCard, isFocus && styles.debtCardFocus]}
                >
                  {isFocus && (
                    <View style={styles.focusBadge}>
                      <Text style={styles.focusText}>FOCUS</Text>
                    </View>
                  )}
                  <View style={styles.debtHeader}>
                    <View style={styles.debtInfo}>
                      <Text style={styles.debtEmoji}>
                        {DEBT_TYPE_EMOJIS[debt.type]}
                      </Text>
                      <View>
                        <Text style={styles.debtName}>{debt.name}</Text>
                        <Text style={styles.debtType}>
                          {DEBT_TYPE_LABELS[debt.type]} &middot;{" "}
                          {debt.interestRate}% APR
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteDebt(debt.id)}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                  <View style={styles.debtDetails}>
                    <View style={styles.debtDetail}>
                      <Text style={styles.debtDetailLabel}>BALANCE</Text>
                      <Text style={[styles.debtDetailValue, { color: colors.red }]}>
                        {formatCurrency(debt.balance)}
                      </Text>
                    </View>
                    <View style={styles.debtDetail}>
                      <Text style={styles.debtDetailLabel}>MIN PAYMENT</Text>
                      <Text style={styles.debtDetailValue}>
                        {formatCurrency(debt.minimumPayment)}
                      </Text>
                    </View>
                    {result && (
                      <View style={styles.debtDetail}>
                        <Text style={styles.debtDetailLabel}>PAYOFF</Text>
                        <Text
                          style={[
                            styles.debtDetailValue,
                            { color: colors.primary },
                          ]}
                        >
                          {result.estimatedPayoffDate.toLocaleDateString(
                            "en-US",
                            { month: "short", year: "2-digit" }
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {debts.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No debts added yet</Text>
                <Text style={styles.emptySubtext}>
                  Add your debts to start the snowball
                </Text>
              </View>
            )}

            {/* Add Debt Button */}
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={styles.addBtn}
            >
              <Plus size={20} color={colors.bg} />
              <Text style={styles.addBtnText}>Add Debt</Text>
            </Pressable>

            {debts.length === 0 && (
              <Pressable onPress={handleAdvanceStep} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>
                  No debts? Skip to Step 3
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* Baby Step 3: Full Emergency Fund */}
        {babyStep === 3 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Full Emergency Fund</Text>
              <Target size={20} color={colors.primary} />
            </View>
            <Text style={styles.efSubtitle}>
              Save 3-6 months of expenses
            </Text>
            <Text style={styles.efAmount}>
              {formatCurrency(emergencyFundCurrent)}{" "}
              <Text style={styles.efGoal}>
                / {formatCurrency(fullEFGoal)}
              </Text>
            </Text>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(fullEFProgress * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.efPct}>
              {Math.round(fullEFProgress * 100)}% of 3-month goal
            </Text>
            <Pressable
              onPress={() => {
                setEfAmount(emergencyFundCurrent.toString());
                setShowEFModal(true);
              }}
              style={styles.efBtn}
            >
              <Text style={styles.efBtnText}>Update Balance</Text>
            </Pressable>
          </View>
        )}

        {/* Baby Steps 4-7 */}
        {babyStep >= 4 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {BABY_STEPS[babyStep - 1]?.title}
            </Text>
            <Text style={styles.congrats}>
              You're debt-free with a full emergency fund! Keep building wealth.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Debt Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setShowAddModal(false);
            resetForm();
          }}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Add Debt</Text>

            <TextInput
              style={styles.modalTextInput}
              placeholder="Debt name"
              placeholderTextColor={colors.dimmed}
              value={debtName}
              onChangeText={setDebtName}
              autoFocus
            />

            <View style={styles.modalInputRow}>
              <Text style={styles.modalDollar}>$</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Balance"
                placeholderTextColor={colors.dimmed}
                keyboardType="decimal-pad"
                value={debtBalance}
                onChangeText={setDebtBalance}
              />
            </View>

            <View style={styles.modalInputRow}>
              <Text style={styles.modalDollar}>$</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Min. payment"
                placeholderTextColor={colors.dimmed}
                keyboardType="decimal-pad"
                value={debtMinPayment}
                onChangeText={setDebtMinPayment}
              />
            </View>

            <View style={styles.modalInputRow}>
              <TextInput
                style={styles.modalInput}
                placeholder="Interest rate"
                placeholderTextColor={colors.dimmed}
                keyboardType="decimal-pad"
                value={debtRate}
                onChangeText={setDebtRate}
              />
              <Text style={styles.modalPct}>%</Text>
            </View>

            {/* Debt type picker */}
            <View style={styles.typeGrid}>
              {DEBT_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setDebtType(type)}
                  style={[
                    styles.typeChip,
                    debtType === type && styles.typeChipActive,
                  ]}
                >
                  <Text style={styles.typeEmoji}>
                    {DEBT_TYPE_EMOJIS[type]}
                  </Text>
                  <Text
                    style={[
                      styles.typeText,
                      debtType === type && styles.typeTextActive,
                    ]}
                  >
                    {DEBT_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleAddDebt}
              style={[
                styles.modalBtn,
                (!debtName || !debtBalance || !debtMinPayment) &&
                  styles.modalBtnDisabled,
              ]}
            >
              <Text style={styles.modalBtnText}>Add Debt</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Emergency Fund Update Modal */}
      <Modal visible={showEFModal} transparent animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowEFModal(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Emergency Fund Balance</Text>
            <View style={styles.modalInputRow}>
              <Text style={styles.modalDollar}>$</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                value={efAmount}
                onChangeText={setEfAmount}
                autoFocus
              />
            </View>
            <Pressable onPress={handleUpdateEF} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: spacing.md,
    gap: 12,
    paddingBottom: 100,
  },
  // Baby Steps Progress
  stepsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: {
    backgroundColor: colors.primary,
  },
  stepDotCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  stepDotFuture: {
    backgroundColor: colors.dimmed,
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  // Current Step Card
  currentStepCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  currentStepLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  currentStepTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  currentStepDesc: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  // Section Card
  sectionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  efSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  efAmount: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
  },
  efGoal: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  progressBg: {
    height: 8,
    backgroundColor: colors.dimmed,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  efPct: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  efBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  efBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  // Summary Row
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  summaryValue: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  summaryUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  // Debt Free Card
  debtFreeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  debtFreeLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  debtFreeDate: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  debtFreeInterest: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  // Debt Cards
  debtCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  debtCardFocus: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  focusBadge: {
    backgroundColor: colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  focusText: {
    color: colors.bg,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  debtInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  debtEmoji: {
    fontSize: 24,
  },
  debtName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  debtType: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  debtDetails: {
    flexDirection: "row",
    gap: spacing.md,
  },
  debtDetail: {
    flex: 1,
    gap: 2,
  },
  debtDetailLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  debtDetailValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 14,
  },
  // Add Button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  addBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  congrats: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 380,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  modalTextInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  modalDollar: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  modalInput: {
    flex: 1,
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  modalPct: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeEmoji: {
    fontSize: 14,
  },
  typeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  typeTextActive: {
    color: colors.primary,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: radius.md,
  },
  modalBtnDisabled: {
    opacity: 0.4,
  },
  modalBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
});
