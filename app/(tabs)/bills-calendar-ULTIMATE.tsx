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
import { ChevronLeft, ChevronRight, Plus, Edit3, Trash2, X } from "lucide-react-native";
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

type BillFrequency = "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "yearly";
type ItemType = "income" | "expense";

const FREQUENCY_OPTIONS: { value: BillFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Bimonthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export default function UltimateBillsScreen() {
  const { profile, updateProfile, currentBudget, currentMonth, setCurrentMonth, 
          createCategory, updateCategory, deleteCategory } = useApp();
  
  // Form states
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    type: "expense" as ItemType,
    name: "",
    emoji: "💰",
    allocated: "",
    frequency: "monthly" as BillFrequency,
    dueDay: "",
  });

  const monthlyIncome = profile?.monthlyIncome ?? 0;
  
  // Get all items (income + expenses)
  const allItems = useMemo(() => {
    const items = [];
    
    // Add monthly income as an item
    if (monthlyIncome > 0) {
      items.push({
        id: 'monthly-income',
        name: 'Monthly Income',
        emoji: '💵',
        allocated: monthlyIncome,
        frequency: 'monthly',
        type: 'income',
        dueDay: 1, // Income comes on 1st
      });
    }
    
    // Add all budget categories
    const cats = currentBudget?.categories ?? [];
    items.push(...cats.map(cat => ({
      ...cat,
      type: 'expense'
    })));
    
    return items;
  }, [currentBudget, monthlyIncome]);

  // Separate income and expenses
  const incomeItems = allItems.filter(item => item.type === 'income');
  const expenseItems = allItems.filter(item => item.type === 'expense');
  
  // Calculate totals
  const totalIncome = incomeItems.reduce((sum, item) => 
    sum + getMonthlyAmount(item.allocated, item.frequency || "monthly"), 0
  );
  
  const totalExpenses = expenseItems.reduce((sum, item) => 
    sum + getMonthlyAmount(item.allocated, item.frequency || "monthly"), 0
  );
  
  const netAmount = totalIncome - totalExpenses;

  // Bills by day for calendar
  const billsByDay = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    allItems.forEach(item => {
      if (item.dueDay) {
        const day = item.dueDay;
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(item);
      }
    });
    return grouped;
  }, [allItems]);

  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  const openItemForm = (type: ItemType, item?: any) => {
    if (item && item.id === 'monthly-income') {
      // Edit monthly income directly
      const newIncome = prompt("Enter monthly income:");
      if (newIncome) {
        updateProfile({ monthlyIncome: parseFloat(newIncome) || 0 });
      }
      return;
    }
    
    if (item) {
      setEditingItem(item);
      setItemForm({
        type: item.type,
        name: item.name,
        emoji: item.emoji,
        allocated: item.allocated.toString(),
        frequency: (item.frequency as BillFrequency) || "monthly",
        dueDay: item.dueDay?.toString() || "",
      });
    } else {
      setEditingItem(null);
      setItemForm({
        type,
        name: "",
        emoji: type === 'income' ? "💵" : "💰",
        allocated: "",
        frequency: "monthly",
        dueDay: "",
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

    if (itemForm.type === 'income') {
      // For now, just update monthly income (could expand later)
      await updateProfile({ monthlyIncome: amount });
    } else {
      const itemData = {
        name: itemForm.name.trim(),
        emoji: itemForm.emoji,
        allocated: amount,
        frequency: itemForm.frequency,
        type: "fixed" as const,
        dueDay: itemForm.dueDay ? parseInt(itemForm.dueDay) : undefined,
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
    }
    
    closeItemForm();
    impact("Light");
  };

  const handleDeleteItem = (item: any) => {
    if (item.id === 'monthly-income') {
      Alert.alert(
        "Reset Income",
        "Set monthly income to $0?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reset",
            style: "destructive",
            onPress: () => updateProfile({ monthlyIncome: 0 }),
          },
        ]
      );
      return;
    }
    
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(item.id);
              impact("Light");
            } catch (error) {
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  // Generate calendar days
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

        {/* Financial Overview Heroes */}
        <View style={styles.incomeHero}>
          <Text style={styles.heroEyebrow}>💵 TOTAL INCOME</Text>
          <Text style={styles.heroNum}>{formatCurrency(totalIncome)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalIncome)}</Text>
              <Text style={styles.heroStatLabel}>MONTHLY</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalIncome / 4.33)}</Text>
              <Text style={styles.heroStatLabel}>WEEKLY</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{incomeItems.length}</Text>
              <Text style={styles.heroStatLabel}>SOURCES</Text>
            </View>
          </View>
        </View>

        <View style={styles.expenseHero}>
          <Text style={styles.heroEyebrow}>🏠 TOTAL EXPENSES</Text>
          <Text style={styles.heroNum}>{formatCurrency(totalExpenses)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalExpenses)}</Text>
              <Text style={styles.heroStatLabel}>MONTHLY</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(totalExpenses / 4.33)}</Text>
              <Text style={styles.heroStatLabel}>WEEKLY</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{expenseItems.length}</Text>
              <Text style={styles.heroStatLabel}>BILLS</Text>
            </View>
          </View>
        </View>

        <View style={[styles.netHero, netAmount >= 0 ? styles.netPositive : styles.netNegative]}>
          <Text style={styles.heroEyebrow}>✨ NET AVAILABLE</Text>
          <Text style={styles.heroNum}>{netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}</Text>
          <View style={styles.heroBar}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(netAmount)}</Text>
              <Text style={styles.heroStatLabel}>MONTHLY</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatCurrency(netAmount / 4.33)}</Text>
              <Text style={styles.heroStatLabel}>WEEKLY</Text>
            </View>
            <View style={styles.heroBarDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{((totalExpenses / totalIncome) * 100).toFixed(0)}%</Text>
              <Text style={styles.heroStatLabel}>SPENT</Text>
            </View>
          </View>
        </View>

        {/* Clean Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>CALENDAR VIEW</Text>
          <Text style={styles.sectionSubtitle}>Income & bills by day of month</Text>
          
          <View style={styles.calendarGrid}>
            {dayNumbers.map(day => {
              const items = billsByDay[day] || [];
              const hasItems = items.length > 0;
              const totalForDay = items.reduce((sum, item) => {
                const amount = getMonthlyAmount(item.allocated, item.frequency || "monthly");
                return sum + (item.type === 'income' ? amount : -amount);
              }, 0);
              
              return (
                <Pressable 
                  key={day} 
                  style={[styles.dayCard, hasItems && styles.dayCardWithItems]}
                  onPress={() => hasItems && impact("Light")}
                >
                  <Text style={[styles.dayNumber, hasItems && styles.dayNumberActive]}>{day}</Text>
                  
                  {hasItems && (
                    <View style={styles.dayIndicator}>
                      <Text style={styles.dayCount}>{items.length}</Text>
                      <Text style={[styles.dayAmount, totalForDay >= 0 ? styles.dayAmountPositive : styles.dayAmountNegative]}>
                        {formatCurrency(Math.abs(totalForDay))}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Income Section */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>💵 INCOME SOURCES</Text>
            <Pressable style={styles.addBtn} onPress={() => openItemForm('income')}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD INCOME</Text>
            </Pressable>
          </View>
          
          {incomeItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No income sources</Text>
              <Text style={styles.emptySubtext}>Add your income sources</Text>
            </View>
          ) : (
            incomeItems.map((item) => {
              const monthlyAmount = getMonthlyAmount(item.allocated, item.frequency || "monthly");
              
              return (
                <View key={item.id} style={[styles.itemCard, styles.incomeCard]}>
                  <View style={styles.itemContent}>
                    {item.dueDay && (
                      <View style={[styles.dueDateBadge, styles.incomeBadge]}>
                        <Text style={styles.dueDateNumber}>{item.dueDay}</Text>
                      </View>
                    )}
                    
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemEmoji}>{item.emoji}</Text>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name.toUpperCase()}</Text>
                        <Text style={styles.itemFreq}>
                          {item.frequency?.toUpperCase() || "MONTHLY"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.itemAmount}>
                      <Text style={[styles.itemAmountNum, styles.incomeAmount]}>{formatCurrency(monthlyAmount)}</Text>
                      <Text style={styles.itemAmountLabel}>per month</Text>
                    </View>
                    
                    <View style={styles.itemActions}>
                      <Pressable style={styles.actionBtn} onPress={() => openItemForm('income', item)}>
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

        {/* Expenses Section */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>🏠 EXPENSES & BILLS</Text>
            <Pressable style={styles.addBtn} onPress={() => openItemForm('expense')}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD EXPENSE</Text>
            </Pressable>
          </View>
          
          {expenseItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No expenses</Text>
              <Text style={styles.emptySubtext}>Add your bills and expenses</Text>
            </View>
          ) : (
            expenseItems.map((item) => {
              const monthlyAmount = getMonthlyAmount(item.allocated, item.frequency || "monthly");
              
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemContent}>
                    {item.dueDay && (
                      <View style={styles.dueDateBadge}>
                        <Text style={styles.dueDateNumber}>{item.dueDay}</Text>
                      </View>
                    )}
                    
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemEmoji}>{item.emoji}</Text>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name.toUpperCase()}</Text>
                        <Text style={styles.itemFreq}>
                          {item.frequency?.toUpperCase() || "MONTHLY"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.itemAmount}>
                      <Text style={styles.itemAmountNum}>{formatCurrency(monthlyAmount)}</Text>
                      <Text style={styles.itemAmountLabel}>per month</Text>
                    </View>
                    
                    <View style={styles.itemActions}>
                      <Pressable style={styles.actionBtn} onPress={() => openItemForm('expense', item)}>
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
                {editingItem ? `EDIT ${itemForm.type.toUpperCase()}` : `ADD ${itemForm.type.toUpperCase()}`}
              </Text>
              <Pressable onPress={closeItemForm} style={styles.closeBtn}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={itemForm.name}
                onChangeText={(text) => setItemForm({...itemForm, name: text})}
                placeholder={itemForm.type === 'income' ? "e.g. Salary, Freelance" : "e.g. Rent, Utilities"}
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
                  placeholder={itemForm.type === 'income' ? "💵" : "💰"}
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

            {/* Frequency picker */}
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

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>
                {itemForm.type === 'income' ? 'PAY DAY (optional)' : 'DUE DAY (optional)'}
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={itemForm.dueDay}
                onChangeText={(text) => setItemForm({...itemForm, dueDay: text})}
                placeholder="15"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
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

  // Hero Sections
  incomeHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    backgroundColor: "#00ffcc",
    marginBottom: 0,
  },
  expenseHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    backgroundColor: "#ff0040",
    marginBottom: 0,
  },
  netHero: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    marginHorizontal: 0,
    alignItems: "center",
    gap: 16,
    marginBottom: spacing.xl,
  },
  netPositive: {
    backgroundColor: "#00ffcc",
  },
  netNegative: {
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
  dayCardWithItems: {
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
    fontSize: 8,
    fontWeight: "600",
  },
  dayAmountPositive: {
    color: colors.primary,
  },
  dayAmountNegative: {
    color: colors.red,
  },

  // Items Sections
  itemsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  itemsHeader: {
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
  itemCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  incomeCard: {
    backgroundColor: colors.greenBg,
    borderColor: colors.greenBorder,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dueDateBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: "center",
  },
  incomeBadge: {
    backgroundColor: colors.primary,
  },
  dueDateNumber: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
  },
  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
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
    color: colors.red,
    fontSize: 16,
    fontWeight: "800",
  },
  incomeAmount: {
    color: colors.primary,
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
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    color: colors.dimmed,
    fontSize: 14,
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