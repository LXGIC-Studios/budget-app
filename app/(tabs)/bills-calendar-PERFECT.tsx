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
  formatMonthLabel,
  shiftMonth,
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

export default function BillsCalendarScreen() {
  const { profile, updateProfile, currentBudget, currentMonth, setCurrentMonth, 
          createCategory, updateCategory, deleteCategory } = useApp();
  
  // Form states
  const [showItemForm, setShowItemForm] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    emoji: "💰",
    allocated: "",
    frequency: "monthly" as BillFrequency,
    dueDay: "",
  });

  const monthlyIncome = profile?.monthlyIncome ?? 0;
  
  // Get all items (income from profile + expenses from budget)
  const allItems = useMemo(() => {
    const items = [];
    
    // Add monthly income as an item (if set)
    if (monthlyIncome > 0) {
      items.push({
        id: 'monthly-income',
        name: 'Monthly Income',
        emoji: '💵',
        allocated: monthlyIncome,
        frequency: 'monthly',
        type: 'income',
        dueDay: 1,
      });
    }
    
    // Add all budget categories as expenses
    const cats = currentBudget?.categories ?? [];
    items.push(...cats.map(cat => ({
      ...cat,
      type: 'expense'
    })));
    
    return items;
  }, [currentBudget, monthlyIncome]);

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

  const openItemForm = (item?: any) => {
    if (item && item.id === 'monthly-income') {
      // Edit monthly income directly with prompt
      Alert.prompt(
        "Monthly Income",
        "Enter your monthly income:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (value) => {
              if (value) {
                updateProfile({ monthlyIncome: parseFloat(value) || 0 });
              }
            }
          }
        ],
        "plain-text",
        monthlyIncome.toString()
      );
      return;
    }
    
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        emoji: item.emoji,
        allocated: item.allocated.toString(),
        frequency: (item.frequency as BillFrequency) || "monthly",
        dueDay: item.dueDay?.toString() || "",
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: "",
        emoji: "💰",
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

  const openDayModal = (day: number) => {
    setSelectedDay(day);
    setShowDayModal(true);
    impact("Light");
  };

  // Generate calendar days
  const dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);
  const selectedDayItems = selectedDay ? billsByDay[selectedDay] || [] : [];

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

        {/* Clean Calendar - NO GRAND TOTALS */}
        <View style={styles.calendarSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CALENDAR</Text>
            <Text style={styles.sectionSubtitle}>Tap days to see bills due</Text>
          </View>
          
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
                  onPress={() => hasItems ? openDayModal(day) : null}
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
            <Pressable style={styles.addBtn} onPress={() => openItemForm()}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          </View>
          
          {/* Monthly Income */}
          {monthlyIncome > 0 && (
            <View style={[styles.itemCard, styles.incomeCard]}>
              <View style={styles.itemContent}>
                <View style={[styles.dueDateBadge, styles.incomeBadge]}>
                  <Text style={styles.dueDateNumber}>1</Text>
                </View>
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemEmoji}>💵</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>MONTHLY INCOME</Text>
                    <Text style={styles.itemFreq}>MONTHLY</Text>
                  </View>
                </View>
                
                <View style={styles.itemAmount}>
                  <Text style={[styles.itemAmountNum, styles.incomeAmount]}>{formatCurrency(monthlyIncome)}</Text>
                  <Text style={styles.itemAmountLabel}>per month</Text>
                </View>
                
                <View style={styles.itemActions}>
                  <Pressable style={styles.actionBtn} onPress={() => openItemForm({id: 'monthly-income', name: 'Monthly Income', allocated: monthlyIncome})}>
                    <Edit3 size={16} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleDeleteItem({id: 'monthly-income', name: 'Monthly Income'})}>
                    <Trash2 size={16} color={colors.red} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bills/Expenses Section */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>🏠 BILLS & EXPENSES</Text>
            <Pressable style={styles.addBtn} onPress={() => openItemForm()}>
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          </View>
          
          {(currentBudget?.categories ?? []).length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No bills yet</Text>
              <Text style={styles.emptySubtext}>Add your bills and expenses</Text>
            </View>
          ) : (
            (currentBudget?.categories ?? []).map((item) => {
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
                      <Text style={styles.itemAmountNum}>{formatCurrency(monthlyAmount)}</Text>
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

      </ScrollView>

      {/* Day Modal - Shows bills due on selected day */}
      <Modal
        visible={showDayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDay ? `${formatMonthLabel(currentMonth).toUpperCase()} ${selectedDay}` : "DAY"}
              </Text>
              <Pressable onPress={() => setShowDayModal(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {selectedDayItems.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No bills due this day</Text>
              </View>
            ) : (
              <ScrollView style={styles.dayItemsList}>
                {selectedDayItems.map(item => {
                  const monthlyAmount = getMonthlyAmount(item.allocated, item.frequency || "monthly");
                  
                  return (
                    <View key={item.id} style={[styles.itemCard, item.type === 'income' && styles.incomeCard]}>
                      <View style={styles.itemContent}>
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
                          <Text style={[styles.itemAmountNum, item.type === 'income' && styles.incomeAmount]}>
                            {formatCurrency(monthlyAmount)}
                          </Text>
                          <Text style={styles.itemAmountLabel}>per month</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Item Form Modal - Fixed save functionality */}
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
                {editingItem ? "EDIT ITEM" : "ADD ITEM"}
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
                placeholder="e.g. Rent, Utilities, Netflix"
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
                  placeholder="💰"
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

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>DUE DAY (optional)</Text>
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

  // Calendar Section - NO HEROES
  calendarSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
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
  dayItemsList: {
    maxHeight: 300,
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