import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Edit3, Trash2, X, TrendingDown, DollarSign } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency, generateId } from "../../src/utils";

type DebtType = 'credit_card' | 'student_loan' | 'car_loan' | 'mortgage' | 'medical' | 'personal' | 'other';

const DEBT_TYPES: { value: DebtType; label: string; emoji: string }[] = [
  { value: "credit_card", label: "Credit Card", emoji: "💳" },
  { value: "student_loan", label: "Student Loan", emoji: "🎓" },
  { value: "car_loan", label: "Car Loan", emoji: "🚗" },
  { value: "mortgage", label: "Mortgage", emoji: "🏠" },
  { value: "medical", label: "Medical", emoji: "🏥" },
  { value: "personal", label: "Personal", emoji: "👤" },
  { value: "other", label: "Other", emoji: "📄" },
];

export default function DebtScreen() {
  const { debts, addDebt, updateDebt, deleteDebt } = useApp();
  
  // Form states
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [debtForm, setDebtForm] = useState({
    name: "",
    balance: "",
    minimumPayment: "",
    interestRate: "",
    type: "credit_card" as DebtType,
  });
  const [paymentAmount, setPaymentAmount] = useState("");

  // Calculate totals
  const totalBalance = useMemo(() => {
    return debts.reduce((total, debt) => total + debt.balance, 0);
  }, [debts]);

  const totalMinimumPayments = useMemo(() => {
    return debts.reduce((total, debt) => total + debt.minimumPayment, 0);
  }, [debts]);

  const averageInterestRate = useMemo(() => {
    if (debts.length === 0) return 0;
    const totalRate = debts.reduce((total, debt) => total + debt.interestRate, 0);
    return totalRate / debts.length;
  }, [debts]);

  const openDebtForm = (debt?: any) => {
    if (debt) {
      setEditingDebt(debt);
      setDebtForm({
        name: debt.name,
        balance: debt.balance.toString(),
        minimumPayment: debt.minimumPayment.toString(),
        interestRate: debt.interestRate.toString(),
        type: debt.type,
      });
    } else {
      setEditingDebt(null);
      setDebtForm({
        name: "",
        balance: "",
        minimumPayment: "",
        interestRate: "",
        type: "credit_card",
      });
    }
    setShowDebtForm(true);
  };

  const closeDebtForm = () => {
    setShowDebtForm(false);
    setEditingDebt(null);
  };

  const saveDebt = async () => {
    if (!debtForm.name.trim() || !debtForm.balance || !debtForm.minimumPayment) {
      Alert.alert("Missing Info", "Please fill in name, balance, and minimum payment");
      return;
    }

    const balance = parseFloat(debtForm.balance);
    const minimumPayment = parseFloat(debtForm.minimumPayment);
    const interestRate = parseFloat(debtForm.interestRate) || 0;

    if (isNaN(balance) || balance <= 0) {
      Alert.alert("Invalid Balance", "Please enter a valid balance");
      return;
    }

    if (isNaN(minimumPayment) || minimumPayment <= 0) {
      Alert.alert("Invalid Payment", "Please enter a valid minimum payment");
      return;
    }

    const debtData = {
      name: debtForm.name.trim(),
      balance,
      minimumPayment,
      interestRate,
      type: debtForm.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingDebt) {
        await updateDebt(editingDebt.id, debtData);
      } else {
        const newDebt = {
          id: generateId(),
          ...debtData,
        };
        await addDebt(newDebt);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save debt");
      return;
    }
    
    closeDebtForm();
    impact("Light");
  };

  const handleDeleteDebt = (debt: any) => {
    Alert.alert(
      "Delete Debt",
      `Are you sure you want to delete "${debt.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDebt(debt.id);
              impact("Light");
            } catch (error) {
              Alert.alert("Error", "Failed to delete debt");
            }
          },
        },
      ]
    );
  };

  const openPaymentForm = (debt: any) => {
    setSelectedDebt(debt);
    setPaymentAmount("");
    setShowPaymentForm(true);
  };

  const closePaymentForm = () => {
    setShowPaymentForm(false);
    setSelectedDebt(null);
    setPaymentAmount("");
  };

  const makePayment = async () => {
    if (!selectedDebt || !paymentAmount) {
      Alert.alert("Missing Info", "Please enter a payment amount");
      return;
    }

    const payment = parseFloat(paymentAmount);
    if (isNaN(payment) || payment <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount");
      return;
    }

    if (payment > selectedDebt.balance) {
      Alert.alert("Payment Too Large", "Payment cannot exceed the remaining balance");
      return;
    }

    const newBalance = selectedDebt.balance - payment;
    
    try {
      await updateDebt(selectedDebt.id, { 
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      });
      
      // Show success message
      Alert.alert(
        "Payment Applied", 
        `$${payment.toFixed(2)} payment applied to ${selectedDebt.name}.\n\nNew balance: ${formatCurrency(newBalance)}`,
        [{ text: "OK", style: "default" }]
      );
      
      closePaymentForm();
      impact("Success");
    } catch (error) {
      Alert.alert("Error", "Failed to apply payment");
    }
  };

  const getDebtTypeInfo = (type: DebtType) => {
    return DEBT_TYPES.find(t => t.value === type) || DEBT_TYPES[0];
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Total Debt Hero */}
        <View style={styles.debtHero}>
          <Text style={styles.heroEyebrow}>💳 TOTAL DEBT</Text>
          <Text style={styles.heroNum}>{formatCurrency(totalBalance)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalBalance)}</Text>
              <Text style={styles.heroStatLabel}>TOTAL OWED</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalMinimumPayments)}</Text>
              <Text style={styles.heroStatLabel}>MIN PAYMENTS</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{averageInterestRate.toFixed(1)}%</Text>
              <Text style={styles.heroStatLabel}>AVG RATE</Text>
            </View>
          </View>
        </View>

        {/* Debt List */}
        <View style={styles.debtsSection}>
          <View style={styles.debtsHeader}>
            <View>
              <Text style={styles.sectionTitle}>💸 YOUR DEBTS</Text>
              <Text style={styles.sectionSubtitle}>Tap to make payments • {debts.length} debts total</Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => openDebtForm()}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD DEBT</Text>
            </Pressable>
          </View>
          
          {debts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyText}>No debts recorded</Text>
              <Text style={styles.emptySubtext}>Add your debts to track payoff progress</Text>
            </View>
          ) : (
            debts
              .sort((a, b) => b.balance - a.balance) // Sort by balance descending
              .map((debt) => {
                const debtTypeInfo = getDebtTypeInfo(debt.type);
                
                return (
                  <Pressable
                    key={debt.id} 
                    style={styles.debtCard}
                    onPress={() => openPaymentForm(debt)}
                  >
                    <View style={styles.debtContent}>
                      <View style={styles.debtLeft}>
                        <Text style={styles.debtEmoji}>{debtTypeInfo.emoji}</Text>
                        <View style={styles.debtInfo}>
                          <Text 
                            style={styles.debtName}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {debt.name.toUpperCase()}
                          </Text>
                          <Text style={styles.debtType}>{debtTypeInfo.label}</Text>
                          <Text style={styles.debtRate}>{debt.interestRate.toFixed(1)}% APR</Text>
                        </View>
                      </View>
                      
                      <View style={styles.debtRight}>
                        <Text style={styles.debtBalance}>{formatCurrency(debt.balance)}</Text>
                        <Text style={styles.debtMinPayment}>Min: {formatCurrency(debt.minimumPayment)}</Text>
                        <Text style={styles.tapToPay}>TAP TO PAY</Text>
                      </View>
                      
                      <View style={styles.debtActions}>
                        <Pressable 
                          style={styles.actionBtn} 
                          onPress={(e) => {
                            e.stopPropagation();
                            openDebtForm(debt);
                          }}
                        >
                          <Edit3 size={16} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable 
                          style={styles.actionBtn} 
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteDebt(debt);
                          }}
                        >
                          <Trash2 size={16} color={colors.red} />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })
          )}
        </View>

        {/* Debt Summary Stats */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>📊 DEBT ANALYSIS</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Debt</Text>
              <Text style={[styles.summaryAmount, styles.debt]}>{formatCurrency(totalBalance)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Monthly Minimums</Text>
              <Text style={[styles.summaryAmount, styles.debt]}>{formatCurrency(totalMinimumPayments)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Number of Debts</Text>
              <Text style={styles.summaryAmount}>{debts.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average Interest Rate</Text>
              <Text style={styles.summaryAmount}>{averageInterestRate.toFixed(1)}%</Text>
            </View>
            {debts.length > 0 && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.highlightLabel]}>Highest Balance</Text>
                  <Text style={[styles.summaryAmount, styles.debt]}>
                    {formatCurrency(Math.max(...debts.map(d => d.balance)))}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.highlightLabel]}>Highest Rate</Text>
                  <Text style={[styles.summaryAmount, styles.debt]}>
                    {Math.max(...debts.map(d => d.interestRate)).toFixed(1)}%
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Add/Edit Debt Form Modal */}
      <Modal
        visible={showDebtForm}
        transparent
        animationType="slide"
        onRequestClose={closeDebtForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDebt ? "EDIT DEBT" : "ADD DEBT"}
              </Text>
              <Pressable onPress={closeDebtForm} style={styles.closeBtn}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>DEBT NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={debtForm.name}
                onChangeText={(text) => setDebtForm({...debtForm, name: text})}
                placeholder="e.g. Chase Freedom, Car Loan, Student Loan"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>DEBT TYPE</Text>
              <View style={styles.debtTypeRow}>
                {DEBT_TYPES.map((type) => (
                  <Pressable
                    key={type.value}
                    onPress={() => setDebtForm({...debtForm, type: type.value})}
                    style={[
                      styles.typePill,
                      debtForm.type === type.value && styles.typePillActive,
                    ]}
                  >
                    <Text style={styles.typeEmoji}>{type.emoji}</Text>
                    <Text
                      style={[
                        styles.typePillText,
                        debtForm.type === type.value && styles.typePillTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, {flex: 2}]}>
                <Text style={styles.fieldLabel}>CURRENT BALANCE</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={debtForm.balance}
                  onChangeText={(text) => setDebtForm({...debtForm, balance: text})}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formField, {flex: 1}]}>
                <Text style={styles.fieldLabel}>RATE %</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={debtForm.interestRate}
                  onChangeText={(text) => setDebtForm({...debtForm, interestRate: text})}
                  placeholder="0.0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>MINIMUM PAYMENT</Text>
              <TextInput
                style={styles.fieldInput}
                value={debtForm.minimumPayment}
                onChangeText={(text) => setDebtForm({...debtForm, minimumPayment: text})}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={closeDebtForm} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={saveDebt} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveText}>
                  {editingDebt ? "UPDATE" : "ADD DEBT"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Form Modal */}
      <Modal
        visible={showPaymentForm}
        transparent
        animationType="slide"
        onRequestClose={closePaymentForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                MAKE PAYMENT
              </Text>
              <Pressable onPress={closePaymentForm} style={styles.closeBtn}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {selectedDebt && (
              <>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentDebtName}>{selectedDebt.name}</Text>
                  <Text style={styles.paymentBalance}>Current Balance: {formatCurrency(selectedDebt.balance)}</Text>
                  <Text style={styles.paymentMinimum}>Minimum Payment: {formatCurrency(selectedDebt.minimumPayment)}</Text>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>PAYMENT AMOUNT</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.modalActions}>
                  <Pressable onPress={closePaymentForm} style={styles.modalCancelBtn}>
                    <Text style={styles.modalCancelText}>CANCEL</Text>
                  </Pressable>
                  <Pressable onPress={makePayment} style={styles.modalSaveBtn}>
                    <Text style={styles.modalSaveText}>APPLY PAYMENT</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Debt Hero
  debtHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    backgroundColor: "#ff0040", // Red for debt
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

  // Debts Section
  debtsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  debtsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
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
  debtCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  debtContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  debtLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  debtEmoji: {
    fontSize: 24,
  },
  debtInfo: {
    flex: 1,
    minWidth: 0,
  },
  debtName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  debtType: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  debtRate: {
    color: colors.red,
    fontSize: 11,
    fontWeight: "700",
  },
  debtRight: {
    alignItems: "flex-end",
    marginRight: spacing.sm,
  },
  debtBalance: {
    color: colors.red,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  debtMinPayment: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  tapToPay: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  debtActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionBtn: {
    padding: spacing.xs,
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
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 14,
    textAlign: "center",
    maxWidth: 250,
  },

  // Summary Section
  summarySection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  summaryAmount: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  debt: {
    color: colors.red,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  highlightLabel: {
    color: colors.white,
    fontWeight: "700",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  formField: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  debtTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.inputBg,
    gap: 4,
  },
  typePillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  typeEmoji: {
    fontSize: 12,
  },
  typePillText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  typePillTextActive: {
    color: '#000000',
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  modalSaveText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Payment Modal
  paymentInfo: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  paymentDebtName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  paymentBalance: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  paymentMinimum: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
});