import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { impact, notification } from "../../src/lib/haptics";
import type { Transaction } from "../../src/types";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { FAB } from "../../src/components/FAB";
import { QuickAddSheet } from "../../src/components/QuickAddSheet";
import {
  formatCurrency,
  getMonthlyAmount,
  formatDueDay,
  formatMonthLabel,
  shiftMonth,
  generateId,
} from "../../src/utils";
import type { BudgetCategory } from "../../src/types";

function CategoryRow({
  cat,
  spent,
  displayAllocated,
  onPress,
  onMarkPaid,
}: {
  cat: BudgetCategory;
  spent: number;
  displayAllocated: number;
  onPress: () => void;
  onMarkPaid?: () => void;
}) {
  const pct = displayAllocated > 0 ? Math.min(spent / displayAllocated, 1.5) : 0;
  const isOver = spent > displayAllocated;
  const barColor = isOver ? colors.red : colors.primary;

  // Left accent border color by type: fixed = primary (#00ffcc), flexible = yellow (#ccff00)
  const accentColor = cat.type === "fixed" ? colors.primary : colors.yellow;

  // Tinted background based on over/under status
  const cardBg = isOver ? colors.redBg : colors.greenBg;
  const cardBorderColor = isOver ? colors.redBorder : colors.greenBorder;

  // For fixed bills: check if already paid (spent >= allocated)
  const isPaid = cat.type === "fixed" && spent >= displayAllocated && displayAllocated > 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.catCard,
        {
          borderLeftWidth: 3,
          borderLeftColor: accentColor,
          backgroundColor: cardBg,
          borderColor: cardBorderColor,
        },
      ]}
    >
      <View style={styles.catHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.catInfo}>
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={styles.catName}>{cat.name}</Text>
            {cat.type === "fixed" && (
              <View style={styles.fixedBadge}>
                <Text style={styles.fixedText}>FIXED</Text>
              </View>
            )}
          </View>
          {cat.dueDay != null && (
            <Text style={styles.dueDayText}>{formatDueDay(cat.dueDay)}</Text>
          )}
        </View>
        <Text
          style={[
            styles.catSpent,
            isOver && { color: colors.red, textShadowColor: 'rgba(255, 0, 60, 0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
            !isOver && { textShadowColor: 'rgba(0, 255, 204, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 },
          ]}
        >
          {formatCurrency(spent)}{" "}
          <Text style={styles.catOf}>/ {formatCurrency(displayAllocated)}</Text>
        </Text>
      </View>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(pct * 100, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      {/* Mark Paid button for fixed bills */}
      {cat.type === "fixed" && displayAllocated > 0 && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (!isPaid && onMarkPaid) {
              onMarkPaid();
            }
          }}
          style={[
            styles.markPaidBtn,
            isPaid && styles.markPaidBtnDone,
          ]}
        >
          <Text style={[styles.markPaidText, isPaid && styles.markPaidTextDone]}>
            {isPaid ? "PAID ✓" : "MARK PAID"}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export default function BudgetScreen() {
  const { profile, currentBudget, transactions, currentMonth, setCurrentMonth, saveBudget, addTransaction, userAccounts } =
    useApp();

  const profileIncome = profile?.monthlyIncome ?? 0;

  // Auto-calculate actual income from transactions (exclude transfers)
  const actualMonthlyIncome = useMemo(
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

  // Use actual if we have transaction data, fall back to profile setting
  const monthlyIncome = actualMonthlyIncome > 0 ? actualMonthlyIncome : profileIncome;
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editCat, setEditCat] = useState<BudgetCategory | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDueDay, setEditDueDay] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editType, setEditType] = useState<"fixed" | "flexible">("fixed");
  const [editDefaultAccount, setEditDefaultAccount] = useState<string | undefined>(undefined);

  // Add category modal state
  // Pay modal state
  const [payAmount, setPayAmount] = useState("");

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addType, setAddType] = useState<"fixed" | "flexible">("fixed");
  const [addName, setAddName] = useState("");
  const [addEmoji, setAddEmoji] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addDueDay, setAddDueDay] = useState("");

  const categories = currentBudget?.categories ?? [];

  // Split categories into fixed and flexible
  const fixedCategories = useMemo(
    () => categories.filter((c) => c.type === "fixed"),
    [categories]
  );
  const flexibleCategories = useMemo(
    () => categories.filter((c) => c.type === "flexible"),
    [categories]
  );

  // Monthly expense transactions
  const monthTxns = useMemo(
    () =>
      transactions.filter(
        (t) => t.date.startsWith(currentMonth) && t.type === "expense"
      ),
    [transactions, currentMonth]
  );

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.forEach((t) => {
      const key = t.category.toLowerCase();
      map[key] = (map[key] || 0) + t.amount;
    });
    return map;
  }, [monthTxns]);

  // Totals - everything treated as monthly
  const totalFixed = useMemo(
    () =>
      fixedCategories.reduce(
        (s, c) => s + getMonthlyAmount(c.allocated, c.frequency || "monthly"),
        0
      ),
    [fixedCategories]
  );

  const leftToBudget = monthlyIncome - totalFixed;

  // Navigation
  const navigateMonth = (delta: number) => {
    impact("Light");
    setCurrentMonth(shiftMonth(currentMonth, delta));
  };

  const handleEditSave = () => {
    if (!editCat || !currentBudget) return;
    const newAmount = parseFloat(editAmount) || 0;
    const newDueDay = editType === "fixed" ? (parseInt(editDueDay) || undefined) : undefined;
    const trimmedName = editName.trim();
    const trimmedEmoji = editEmoji.trim();
    if (!trimmedName) return;
    impact("Medium");
    const updated = {
      ...currentBudget,
      categories: currentBudget.categories.map((c) =>
        c.id === editCat.id
          ? { ...c, name: trimmedName, emoji: trimmedEmoji, allocated: newAmount, type: editType, dueDay: newDueDay, defaultAccountTag: editDefaultAccount }
          : c
      ),
    };
    saveBudget(updated);
    setEditCat(null);
  };

  const handleDeleteCategory = () => {
    if (!editCat || !currentBudget) return;
    const doDelete = () => {
      notification("Success");
      const updated = {
        ...currentBudget,
        categories: currentBudget.categories.filter((c) => c.id !== editCat.id),
      };
      saveBudget(updated);
      setEditCat(null);
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${editCat.name}"? This cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert("Delete Category", `Delete "${editCat.name}"? This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleMarkPaid = (cat: BudgetCategory) => {
    const displayAllocated = getMonthlyAmount(cat.allocated, cat.frequency || "monthly");
    const catKey = cat.name.toLowerCase();
    const alreadySpent = spentByCategory[catKey] || 0;
    const remaining = Math.round((displayAllocated - alreadySpent) * 100) / 100;
    if (remaining <= 0) return; // already paid

    const doMark = () => {
      notification("Success");
      const txn: Transaction = {
        id: generateId(),
        type: "expense",
        amount: remaining,
        category: cat.name,
        note: `${cat.name} - marked paid`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      addTransaction(txn);
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Mark ${cat.name} as paid? (${formatCurrency(remaining)})`)) {
        doMark();
      }
    } else {
      Alert.alert(
        "Mark as Paid",
        `Mark ${cat.name} as paid?\n${formatCurrency(remaining)}`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark Paid", onPress: doMark },
        ]
      );
    }
  };

  const openEdit = (cat: BudgetCategory) => {
    setEditCat(cat);
    setEditAmount(cat.allocated.toString());
    setEditDueDay(cat.dueDay?.toString() || "");
    setEditName(cat.name);
    setEditEmoji(cat.emoji);
    setEditType(cat.type);
    setEditDefaultAccount(cat.defaultAccountTag);
    // Pre-fill pay amount with remaining balance
    const displayAllocated = getMonthlyAmount(cat.allocated, cat.frequency || "monthly");
    const catKey = cat.name.toLowerCase();
    const alreadySpent = spentByCategory[catKey] || 0;
    const remaining = Math.max(0, Math.round((displayAllocated - alreadySpent) * 100) / 100);
    setPayAmount(remaining > 0 ? remaining.toString() : displayAllocated.toString());
  };

  const handlePayBill = () => {
    if (!editCat) return;
    const parsed = parseFloat(payAmount);
    if (!parsed || parsed <= 0) return;
    notification("Success");
    const txn: Transaction = {
      id: generateId(),
      type: "expense",
      amount: Math.round(parsed * 100) / 100,
      category: editCat.name,
      note: `${editCat.name} - paid`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    addTransaction(txn);
    setEditCat(null);
  };

  const openAddModal = (type: "fixed" | "flexible") => {
    impact("Medium");
    setAddType(type);
    setAddName("");
    setAddEmoji("");
    setAddAmount("");
    setAddDueDay("");
    setAddModalVisible(true);
  };

  const handleAddSave = () => {
    if (!currentBudget) return;
    const trimmedName = addName.trim();
    const trimmedEmoji = addEmoji.trim();
    const amount = parseFloat(addAmount) || 0;
    if (!trimmedName) return;
    impact("Medium");
    const newCat: BudgetCategory = {
      id: generateId(),
      name: trimmedName,
      emoji: trimmedEmoji || "📦",
      allocated: amount,
      type: addType,
      dueDay: addType === "fixed" ? (parseInt(addDueDay) || undefined) : undefined,
    };
    const updated = {
      ...currentBudget,
      categories: [...currentBudget.categories, newCat],
    };
    saveBudget(updated);
    notification("Success");
    setAddModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>BUDGET</Text>

      {/* Month navigation */}
      <View style={styles.periodRow}>
        <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
          <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.periodLabel}>{formatMonthLabel(currentMonth).toUpperCase()}</Text>
        <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
          <ChevronRight size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Summary: Income | Fixed Bills | Left to Budget */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
          <Text style={styles.summaryLabel}>INCOME</Text>
          <Text style={[styles.summaryValue, { textShadowColor: 'rgba(0, 255, 204, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>
            {formatCurrency(monthlyIncome)}
          </Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.redBg, borderColor: colors.redBorder }]}>
          <Text style={styles.summaryLabel}>FIXED BILLS</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: colors.red, textShadowColor: 'rgba(255, 0, 60, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
            ]}
          >
            {formatCurrency(totalFixed)}
          </Text>
        </View>
        <View
          style={[
            styles.summaryItem,
            leftToBudget >= 0
              ? { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }
              : { backgroundColor: colors.redBg, borderColor: colors.redBorder },
          ]}
        >
          <Text style={styles.summaryLabel}>LEFT TO BUDGET</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color: leftToBudget >= 0 ? colors.primary : colors.red,
                textShadowColor: leftToBudget >= 0
                  ? 'rgba(0, 255, 204, 0.6)'
                  : 'rgba(255, 0, 60, 0.6)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              },
            ]}
          >
            {formatCurrency(leftToBudget)}
          </Text>
        </View>
      </View>

      {/* FIXED BILLS section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>FIXED BILLS</Text>
        <Text style={styles.sectionCount}>{fixedCategories.length} bills</Text>
      </View>
      <View style={styles.catList}>
        {fixedCategories.map((cat) => {
          const catKey = cat.name.toLowerCase();
          const displayAllocated = getMonthlyAmount(cat.allocated, cat.frequency || "monthly");
          return (
            <CategoryRow
              key={cat.id}
              cat={cat}
              spent={spentByCategory[catKey] || 0}
              displayAllocated={displayAllocated}
              onPress={() => openEdit(cat)}
              onMarkPaid={() => handleMarkPaid(cat)}
            />
          );
        })}
        {fixedCategories.length === 0 && (
          <Text style={styles.emptySection}>No fixed bills set up yet</Text>
        )}
        <Pressable style={styles.addCategoryBtn} onPress={() => openAddModal("fixed")}>
          <Text style={styles.addCategoryBtnText}>+ ADD CATEGORY</Text>
        </Pressable>
      </View>

      {/* SPENDING BUDGET section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>SPENDING BUDGET</Text>
        <Text style={styles.sectionCount}>{formatCurrency(leftToBudget)} available</Text>
      </View>
      <View style={styles.catList}>
        {flexibleCategories.map((cat) => {
          const catKey = cat.name.toLowerCase();
          const displayAllocated = getMonthlyAmount(cat.allocated, cat.frequency || "monthly");
          return (
            <CategoryRow
              key={cat.id}
              cat={cat}
              spent={spentByCategory[catKey] || 0}
              displayAllocated={displayAllocated}
              onPress={() => openEdit(cat)}
            />
          );
        })}
        {flexibleCategories.length === 0 && (
          <Text style={styles.emptySection}>No spending categories set up yet</Text>
        )}
        <Pressable style={styles.addCategoryBtn} onPress={() => openAddModal("flexible")}>
          <Text style={styles.addCategoryBtnText}>+ ADD CATEGORY</Text>
        </Pressable>
      </View>
      </ScrollView>

      <FAB onPress={() => setSheetVisible(true)} />
      <QuickAddSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSave={addTransaction}
      />

      {/* Edit modal - full CRUD */}
      <Modal visible={!!editCat} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setEditCat(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>EDIT CATEGORY</Text>

            {/* Name */}
            <View>
              <Text style={styles.modalFieldLabel}>NAME</Text>
              <View style={styles.modalInputRow}>
                <TextInput
                  style={[styles.modalInput, { fontSize: 16 }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Category name"
                  placeholderTextColor={colors.dimmed}
                  autoFocus
                />
              </View>
            </View>

            {/* Emoji */}
            <View>
              <Text style={styles.modalFieldLabel}>EMOJI</Text>
              <View style={styles.modalInputRow}>
                <TextInput
                  style={[styles.modalInput, { fontSize: 22 }]}
                  value={editEmoji}
                  onChangeText={(t) => setEditEmoji(t.slice(-2))}
                  placeholder="📦"
                  placeholderTextColor={colors.dimmed}
                  maxLength={2}
                />
              </View>
            </View>

            {/* Type toggle */}
            <View>
              <Text style={styles.modalFieldLabel}>TYPE</Text>
              <View style={styles.typeToggleRow}>
                <Pressable
                  style={[styles.typeToggleBtn, editType === "fixed" && styles.typeToggleBtnActive]}
                  onPress={() => setEditType("fixed")}
                >
                  <Text style={[styles.typeToggleBtnText, editType === "fixed" && styles.typeToggleBtnTextActive]}>FIXED</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeToggleBtn, editType === "flexible" && styles.typeToggleBtnActive]}
                  onPress={() => setEditType("flexible")}
                >
                  <Text style={[styles.typeToggleBtnText, editType === "flexible" && styles.typeToggleBtnTextActive]}>FLEXIBLE</Text>
                </Pressable>
              </View>
            </View>

            {/* Amount */}
            <View>
              <Text style={styles.modalFieldLabel}>MONTHLY AMOUNT</Text>
              <View style={styles.modalInputRow}>
                <Text style={styles.modalDollar}>$</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="decimal-pad"
                  value={editAmount}
                  onChangeText={setEditAmount}
                />
              </View>
            </View>

            {/* Due day - only for fixed */}
            {editType === "fixed" && (
              <View>
                <Text style={styles.modalFieldLabel}>DUE DAY (OPTIONAL)</Text>
                <View style={styles.modalInputRow}>
                  <TextInput
                    style={[styles.modalInput, { fontSize: 18 }]}
                    keyboardType="number-pad"
                    value={editDueDay}
                    onChangeText={setEditDueDay}
                    placeholder="e.g. 15"
                    placeholderTextColor={colors.dimmed}
                    maxLength={2}
                  />
                </View>
              </View>
            )}

            {/* Default account for payments */}
            {editType === "fixed" && (
              <View>
                <Text style={styles.modalFieldLabel}>DEFAULT ACCOUNT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <Pressable
                    style={[styles.acctPill, !editDefaultAccount && styles.acctPillActive]}
                    onPress={() => setEditDefaultAccount(undefined)}
                  >
                    <Text style={[styles.acctPillText, !editDefaultAccount && styles.acctPillTextActive]}>NONE</Text>
                  </Pressable>
                  {userAccounts.map((acct) => (
                    <Pressable
                      key={acct.id}
                      style={[styles.acctPill, editDefaultAccount === acct.id && styles.acctPillActive]}
                      onPress={() => setEditDefaultAccount(editDefaultAccount === acct.id ? undefined : acct.id)}
                    >
                      <Text style={styles.acctPillEmoji}>{acct.emoji}</Text>
                      <Text style={[styles.acctPillText, editDefaultAccount === acct.id && styles.acctPillTextActive]}>{acct.label.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setEditCat(null)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleEditSave} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Save</Text>
              </Pressable>
            </View>

            {/* Pay this bill section - only for fixed bills */}
            {editCat && editCat.type === "fixed" && (
              <View style={styles.paySection}>
                <View style={styles.paySectionDivider} />
                <Text style={styles.paySectionTitle}>LOG PAYMENT</Text>
                <View style={styles.modalInputRow}>
                  <Text style={styles.modalDollar}>$</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="decimal-pad"
                    value={payAmount}
                    onChangeText={setPayAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.dimmed}
                  />
                </View>
                <Pressable onPress={handlePayBill} style={styles.payBtn}>
                  <Text style={styles.payBtnText}>I PAID THIS</Text>
                </Pressable>
              </View>
            )}

            {/* Delete button */}
            <Pressable onPress={handleDeleteCategory} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>DELETE CATEGORY</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add category modal */}
      <Modal visible={addModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setAddModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>ADD CATEGORY</Text>

            {/* Name */}
            <View>
              <Text style={styles.modalFieldLabel}>NAME</Text>
              <View style={styles.modalInputRow}>
                <TextInput
                  style={[styles.modalInput, { fontSize: 16 }]}
                  value={addName}
                  onChangeText={setAddName}
                  placeholder="Category name"
                  placeholderTextColor={colors.dimmed}
                  autoFocus
                />
              </View>
            </View>

            {/* Emoji */}
            <View>
              <Text style={styles.modalFieldLabel}>EMOJI</Text>
              <View style={styles.modalInputRow}>
                <TextInput
                  style={[styles.modalInput, { fontSize: 22 }]}
                  value={addEmoji}
                  onChangeText={(t) => setAddEmoji(t.slice(-2))}
                  placeholder="📦"
                  placeholderTextColor={colors.dimmed}
                  maxLength={2}
                />
              </View>
            </View>

            {/* Type toggle */}
            <View>
              <Text style={styles.modalFieldLabel}>TYPE</Text>
              <View style={styles.typeToggleRow}>
                <Pressable
                  style={[styles.typeToggleBtn, addType === "fixed" && styles.typeToggleBtnActive]}
                  onPress={() => setAddType("fixed")}
                >
                  <Text style={[styles.typeToggleBtnText, addType === "fixed" && styles.typeToggleBtnTextActive]}>FIXED</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeToggleBtn, addType === "flexible" && styles.typeToggleBtnActive]}
                  onPress={() => setAddType("flexible")}
                >
                  <Text style={[styles.typeToggleBtnText, addType === "flexible" && styles.typeToggleBtnTextActive]}>FLEXIBLE</Text>
                </Pressable>
              </View>
            </View>

            {/* Amount */}
            <View>
              <Text style={styles.modalFieldLabel}>MONTHLY AMOUNT</Text>
              <View style={styles.modalInputRow}>
                <Text style={styles.modalDollar}>$</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="decimal-pad"
                  value={addAmount}
                  onChangeText={setAddAmount}
                />
              </View>
            </View>

            {/* Due day - only for fixed */}
            {addType === "fixed" && (
              <View>
                <Text style={styles.modalFieldLabel}>DUE DAY (OPTIONAL)</Text>
                <View style={styles.modalInputRow}>
                  <TextInput
                    style={[styles.modalInput, { fontSize: 18 }]}
                    keyboardType="number-pad"
                    value={addDueDay}
                    onChangeText={setAddDueDay}
                    placeholder="e.g. 15"
                    placeholderTextColor={colors.dimmed}
                    maxLength={2}
                  />
                </View>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddSave} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Add</Text>
              </Pressable>
            </View>
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
    fontWeight: "900",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: 3,
    textTransform: "uppercase",
    textShadowColor: 'rgba(0, 255, 204, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // Period navigation
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  periodLabel: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    minWidth: 200,
    textAlign: "center",
    letterSpacing: 2,
  },
  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 2,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  // Section headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  sectionCount: {
    color: colors.dimmed,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  emptySection: {
    color: colors.dimmed,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  // Category list
  catList: {
    paddingHorizontal: spacing.md,
    gap: 10,
    marginBottom: spacing.lg,
  },
  catCard: {
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  catEmoji: {
    fontSize: 18,
  },
  catName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  fixedBadge: {
    backgroundColor: '#00ffcc',
    borderWidth: 1,
    borderColor: '#00ffcc',
    borderRadius: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fixedText: {
    color: '#050505',
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dueDayText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    marginLeft: 26,
  },
  catSpent: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  catOf: {
    color: colors.textSecondary,
    fontWeight: "400",
  },
  barBg: {
    height: 6,
    backgroundColor: colors.dimmed,
    borderRadius: 1,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 1,
  },
  // Edit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#0c0c0c',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 2,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 360,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  modalFieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalDollar: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "700",
  },
  modalInput: {
    flex: 1,
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
  },
  modalCancelBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  modalBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 2,
  },
  modalBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
  // Type toggle
  typeToggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 2,
    backgroundColor: '#0a0a0a',
  },
  typeToggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
  },
  typeToggleBtnText: {
    color: colors.dimmed,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  typeToggleBtnTextActive: {
    color: colors.primary,
  },
  // Delete button
  deleteBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 60, 0.3)',
    borderRadius: 2,
    backgroundColor: 'rgba(255, 0, 60, 0.06)',
  },
  deleteBtnText: {
    color: '#ff003c',
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
  // Add category button
  addCategoryBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.15)',
    borderRadius: 2,
    borderStyle: "dashed",
    backgroundColor: 'rgba(0, 255, 204, 0.03)',
  },
  addCategoryBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  // Pay section in edit modal
  paySection: {
    gap: spacing.sm,
  },
  paySectionDivider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: spacing.xs,
  },
  paySectionTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },
  payBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 2,
  },
  payBtnText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
  },
  // Account pills
  acctPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  acctPillActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
  },
  acctPillEmoji: { fontSize: 12 },
  acctPillText: {
    color: colors.dimmed,
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
  },
  acctPillTextActive: {
    color: colors.primary,
  },
  // Mark Paid button
  markPaidBtn: {
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.25)',
    borderRadius: 2,
    backgroundColor: 'rgba(0, 255, 204, 0.06)',
    marginTop: 4,
  },
  markPaidBtnDone: {
    borderColor: 'rgba(0, 255, 204, 0.15)',
    backgroundColor: 'rgba(0, 255, 204, 0.03)',
  },
  markPaidText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  markPaidTextDone: {
    color: colors.textSecondary,
  },
});
