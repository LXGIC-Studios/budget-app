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
import { Plus, Edit3, Trash2, X } from "lucide-react-native";
import { impact } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import {
  formatCurrency,
  getMonthlyAmount,
} from "../../src/utils";

type BillFrequency = "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "yearly";

const FREQUENCY_OPTIONS: { value: BillFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Bimonthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export default function BudgetScreen() {
  const { profile, currentBudget, createCategory, updateCategory, deleteCategory } = useApp();
  
  // Form states
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    emoji: "🛒",
    allocated: "",
    frequency: "monthly" as BillFrequency,
  });

  const monthlyIncome = profile?.monthlyIncome ?? 0;
  
  // Get flexible (variable) budget categories only
  const flexibleItems = useMemo(() => {
    const cats = currentBudget?.categories ?? [];
    return cats.filter(cat => cat.type === "flexible");
  }, [currentBudget]);

  // Get fixed expenses for calculation
  const fixedExpenses = useMemo(() => {
    const cats = currentBudget?.categories ?? [];
    return cats
      .filter(cat => cat.type === "fixed")
      .reduce((total, cat) => total + getMonthlyAmount(cat.allocated, cat.frequency || "monthly"), 0);
  }, [currentBudget]);

  // Calculate totals
  const totalFlexibleBudget = flexibleItems.reduce((total, item) => 
    total + getMonthlyAmount(item.allocated, item.frequency || "monthly"), 0
  );
  
  const availableAfterFixed = monthlyIncome - fixedExpenses;
  const remainingToBudget = availableAfterFixed - totalFlexibleBudget;

  const openItemForm = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        emoji: item.emoji,
        allocated: item.allocated.toString(),
        frequency: (item.frequency as BillFrequency) || "monthly",
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: "",
        emoji: "🛒",
        allocated: "",
        frequency: "monthly",
      });
    }
    setShowItemForm(true);
  };

  const closeItemForm = () => {
    setShowItemForm(false);
    setEditingItem(null);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim() || !itemForm.allocated) {
      Alert.alert("Missing Info", "Please enter name and amount");
      return;
    }

    const amount = parseFloat(itemForm.allocated);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    const itemData = {
      name: itemForm.name.trim(),
      emoji: itemForm.emoji,
      allocated: amount,
      frequency: itemForm.frequency,
      type: "flexible" as const, // This is variable spending
    };

    try {
      if (editingItem) {
        await updateCategory(editingItem.id, itemData);
      } else {
        await createCategory(itemData);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save item");
      return;
    }
    
    closeItemForm();
    impact("Light");
  };

  const handleDeleteItem = (item: any) => {
    console.log('Attempting to delete item:', item.id, item.name);
    Alert.alert(
      "Delete Budget Item",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('Calling deleteCategory with ID:', item.id);
              await deleteCategory(item.id);
              console.log('Delete successful');
              impact("Light");
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert("Error", `Failed to delete item: ${error.message || error}`);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Available Amount Hero */}
        <View style={[styles.availableHero, remainingToBudget >= 0 ? styles.availablePositive : styles.availableNegative]}>
          <Text style={styles.heroEyebrow}>💰 AVAILABLE TO BUDGET</Text>
          <Text style={styles.heroNum}>{formatCurrency(remainingToBudget)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(availableAfterFixed)}</Text>
              <Text style={styles.heroStatLabel}>AFTER BILLS</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalFlexibleBudget)}</Text>
              <Text style={styles.heroStatLabel}>BUDGETED</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(remainingToBudget)}</Text>
              <Text style={styles.heroStatLabel}>REMAINING</Text>
            </View>
          </View>
        </View>

        {/* Variable Spending Categories */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <View>
              <Text style={styles.sectionTitle}>🛒 VARIABLE SPENDING</Text>
              <Text style={styles.sectionSubtitle}>Groceries, dining out, entertainment, etc.</Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => openItemForm()}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          </View>
          
          {flexibleItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyText}>No budget categories yet</Text>
              <Text style={styles.emptySubtext}>Add spending categories like groceries, dining, entertainment</Text>
            </View>
          ) : (
            flexibleItems.map((item) => {
              // Debug: Log item data
              console.log('🔍 Rendering budget item:', {
                name: item.name,
                allocated: item.allocated,
                frequency: item.frequency,
                type: typeof item.allocated,
                isValid: !isNaN(item.allocated),
                rawValue: JSON.stringify(item.allocated)
              });
              
              // Ensure allocated is a number
              const allocatedNum = typeof item.allocated === 'string' ? parseFloat(item.allocated) : (item.allocated || 0);
              const monthlyAmount = getMonthlyAmount(allocatedNum, item.frequency || "monthly");
              
              console.log('💰 Amount calculation:', {
                original: item.allocated,
                converted: allocatedNum,
                frequency: item.frequency,
                monthlyResult: monthlyAmount,
                formatted: formatCurrency(monthlyAmount)
              });
              
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemContent}>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemEmoji}>{item.emoji}</Text>
                      <View style={styles.itemInfo}>
                        <Text 
                          style={styles.itemName}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.name.toUpperCase()}
                        </Text>
                        <Text style={styles.itemFreq}>
                          {item.frequency?.toUpperCase() || "MONTHLY"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.itemAmount}>
                      <Text style={styles.itemAmountNum}>
                        {monthlyAmount > 0 
                          ? formatCurrency(monthlyAmount)
                          : allocatedNum > 0 
                            ? formatCurrency(allocatedNum) + " (raw)"
                            : "$0.00"
                        }
                      </Text>
                      <Text style={styles.itemAmountLabel}>per month</Text>
                    </View>
                    
                    <View style={styles.itemActions}>
                      <Pressable style={styles.actionBtn} onPress={() => openItemForm(item)}>
                        <Edit3 size={16} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable style={styles.actionBtn} onPress={() => handleDeleteItem(item)}>
                        <Trash2 size={16} color={colors.red} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Budget Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>📊 BUDGET SUMMARY</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Monthly Income</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(monthlyIncome)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fixed Bills</Text>
              <Text style={[styles.summaryAmount, styles.expense]}>-{formatCurrency(fixedExpenses)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Available for Budget</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(availableAfterFixed)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Variable Spending</Text>
              <Text style={[styles.summaryAmount, styles.expense]}>-{formatCurrency(totalFlexibleBudget)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.totalLabel]}>Remaining</Text>
              <Text style={[styles.summaryAmount, styles.totalAmount, remainingToBudget >= 0 ? styles.positive : styles.negative]}>
                {formatCurrency(remainingToBudget)}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Item Form Modal */}
      <Modal
        visible={showItemForm}
        transparent
        animationType="slide"
        onRequestClose={closeItemForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? "EDIT BUDGET ITEM" : "ADD BUDGET ITEM"}
              </Text>
              <Pressable onPress={closeItemForm} style={styles.closeBtn}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>CATEGORY NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={itemForm.name}
                onChangeText={(text) => setItemForm({...itemForm, name: text})}
                placeholder="e.g. Groceries, Dining Out, Entertainment"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, {flex: 1}]}>
                <Text style={styles.fieldLabel}>EMOJI</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={itemForm.emoji}
                  onChangeText={(text) => setItemForm({...itemForm, emoji: text})}
                  placeholder="🛒"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={[styles.formField, {flex: 2}]}>
                <Text style={styles.fieldLabel}>AMOUNT</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={itemForm.allocated}
                  onChangeText={(text) => setItemForm({...itemForm, allocated: text})}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>FREQUENCY</Text>
              <View style={styles.freqRow}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setItemForm({...itemForm, frequency: opt.value})}
                    style={[
                      styles.freqPill,
                      itemForm.frequency === opt.value && styles.freqPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.freqPillText,
                        itemForm.frequency === opt.value && styles.freqPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={closeItemForm} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={saveItem} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveText}>
                  {editingItem ? "UPDATE" : "ADD"}
                </Text>
              </Pressable>
            </View>
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

  // Available Amount Hero
  availableHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    marginBottom: spacing.xl,
  },
  availablePositive: {
    backgroundColor: "#00ffcc",
  },
  availableNegative: {
    backgroundColor: "#ff0040",
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

  // Items Section
  itemsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  itemsHeader: {
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
  itemCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  itemFreq: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  itemAmount: {
    alignItems: "flex-end",
    marginRight: spacing.sm,
  },
  itemAmountNum: {
    color: colors.orange,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  itemAmountLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  itemActions: {
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
  expense: {
    color: colors.red,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  positive: {
    color: colors.primary,
  },
  negative: {
    color: colors.red,
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
  freqRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  freqPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.inputBg,
  },
  freqPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  freqPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  freqPillTextActive: {
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
});