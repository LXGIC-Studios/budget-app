import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { notification, impact } from "../lib/haptics";
import { colors, spacing, radius } from "../theme";
import { CategoryPill } from "./CategoryPill";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../types";
import type { Transaction } from "../types";
import { useApp } from "../context/AppContext";
import { generateId, formatShortDate, formatCurrency } from "../utils";

interface SplitRow {
  category: string;
  amount: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (txn: Transaction) => void;
  editTransaction?: Transaction | null;
  onUpdate?: (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => void;
  onDelete?: (id: string) => void;
  onSplit?: (original: Transaction, splits: { category: string; amount: number }[]) => void;
  initialMode?: "expense" | "income";
}

export function QuickAddSheet({ visible, onClose, onSave, editTransaction, onUpdate, onDelete, onSplit, initialMode }: Props) {
  const { userAccounts, addTransaction: addTxn } = useApp();
  const [mode, setMode] = useState<"expense" | "income" | "transfer">(initialMode ?? "expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [accountTag, setAccountTag] = useState<string | undefined>(undefined);
  const [transferFrom, setTransferFrom] = useState<string | undefined>(undefined);
  const [transferTo, setTransferTo] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateInput, setDateInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  // selectedAccountId removed - using accountTag state above

  // Split mode state
  const [splitMode, setSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [editingSplitCategory, setEditingSplitCategory] = useState<number | null>(null);

  // Pre-fill fields when editing or when initialMode changes
  if (visible && !initialized) {
    if (editTransaction) {
      setMode(editTransaction.type);
      setAmount(String(editTransaction.amount));
      setCategory(editTransaction.category);
      setNote(editTransaction.note ?? "");
      setSelectedDate(new Date(editTransaction.date));
      setDateInput("");
      setAccountTag(editTransaction.accountTag ?? undefined);
      setTransferFrom(undefined);
      setTransferTo(undefined);
    } else if (initialMode) {
      setMode(initialMode);
      setCategory(initialMode === "expense" ? "food" : "salary");
      setAccountTag(undefined);
      setTransferFrom(undefined);
      setTransferTo(undefined);
    }
    setSplitMode(false);
    setSplitRows([]);
    setEditingSplitCategory(null);
    setInitialized(true);
  }
  if (!visible && initialized) {
    setInitialized(false);
  }

  // Expenses use fixed broad categories (Groceries, Eating Out, etc)
  // Budget categories are for fixed bills, not everyday spending
  const categories = mode === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const isEditing = !!editTransaction;

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    notification("Success");

    if (mode === "transfer" && !isEditing) {
      // Create two linked transactions (new transfer only)
      const amt = Math.round(parsed * 100) / 100;
      const fromName = userAccounts.find((a) => a.id === transferFrom)?.label ?? "Account";
      const toName = userAccounts.find((a) => a.id === transferTo)?.label ?? "Account";
      const transferNote = note.trim() || `${fromName} → ${toName}`;
      const now = selectedDate.toISOString();
      const createdAt = new Date().toISOString();

      // Expense from source account
      onSave({
        id: generateId(),
        type: "transfer",
        amount: amt,
        category: "transfer",
        note: transferNote,
        date: now,
        createdAt,
        accountTag: transferFrom,
      });

      // Income to destination account
      addTxn({
        id: generateId(),
        type: "transfer",
        amount: amt,
        category: "transfer",
        note: transferNote,
        date: now,
        createdAt,
        accountTag: transferTo,
      });

      setAmount("");
      setNote("");
      setTransferFrom(undefined);
      setTransferTo(undefined);
      setSelectedDate(new Date());
      setDateInput("");
      onClose();
      return;
    }

    if (isEditing && onUpdate) {
      onUpdate(editTransaction.id, {
        type: mode,
        amount: Math.round(parsed * 100) / 100,
        category,
        note: note.trim() || undefined,
        date: selectedDate.toISOString(),
        accountTag,
      });
    } else {
      const txn: Transaction = {
        id: generateId(),
        type: mode,
        amount: Math.round(parsed * 100) / 100,
        category,
        note: note.trim() || undefined,
        date: selectedDate.toISOString(),
        createdAt: new Date().toISOString(),
        accountTag,
      };
      onSave(txn);
    }

    setAmount("");
    setCategory(mode === "expense" ? "food" : "salary");
    setNote("");
    setAccountTag(undefined);
    setSelectedDate(new Date());
    setDateInput("");
    onClose();
  };

  const handleClose = () => {
    setAmount("");
    setNote("");
    setSelectedDate(new Date());
    setDateInput("");
    setSplitMode(false);
    setSplitRows([]);
    setEditingSplitCategory(null);
    onClose();
  };

  const setToday = () => {
    setSelectedDate(new Date());
    setDateInput("");
    impact("Light");
  };

  const setYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
    setDateInput("");
    impact("Light");
  };

  const handleDateInput = (text: string) => {
    const digits = text.replace(/\D/g, "");
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
    setDateInput(formatted);

    if (digits.length === 8) {
      const month = parseInt(digits.slice(0, 2), 10);
      const day = parseInt(digits.slice(2, 4), 10);
      const year = parseInt(digits.slice(4, 8), 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000) {
        const parsed = new Date(year, month - 1, day);
        if (!isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
        }
      }
    }
  };

  const isToday = (() => {
    const now = new Date();
    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate()
    );
  })();

  const isYesterday = (() => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return (
      selectedDate.getFullYear() === yest.getFullYear() &&
      selectedDate.getMonth() === yest.getMonth() &&
      selectedDate.getDate() === yest.getDate()
    );
  })();

  const switchMode = (m: "expense" | "income" | "transfer") => {
    setMode(m);
    if (m === "transfer") {
      setCategory("transfer");
    } else {
      setCategory(m === "expense" ? "food" : "salary");
    }
    impact("Light");
  };

  // --- Split logic ---
  const originalAmount = editTransaction ? editTransaction.amount : parseFloat(amount) || 0;

  const handleEnterSplit = () => {
    impact("Medium");
    const half = Math.round((originalAmount / 2) * 100) / 100;
    const other = Math.round((originalAmount - half) * 100) / 100;
    setSplitRows([
      { category: editTransaction?.category ?? "food", amount: String(half) },
      { category: "other", amount: String(other) },
    ]);
    setEditingSplitCategory(null);
    setSplitMode(true);
  };

  const handleAddSplitRow = () => {
    impact("Light");
    setSplitRows((prev) => [...prev, { category: "other", amount: "" }]);
  };

  const handleRemoveSplitRow = (index: number) => {
    impact("Light");
    setSplitRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSplitAmountChange = (index: number, value: string) => {
    setSplitRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: value };
      return updated;
    });
  };

  const handleSplitCategoryChange = (index: number, cat: string) => {
    setSplitRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], category: cat };
      return updated;
    });
    setEditingSplitCategory(null);
    impact("Light");
  };

  const splitTotal = splitRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const splitTotalRounded = Math.round(splitTotal * 100) / 100;
  const splitBalanced = splitTotalRounded === originalAmount;
  const splitRemaining = Math.round((originalAmount - splitTotal) * 100) / 100;

  const handleSaveSplit = () => {
    if (!splitBalanced || !editTransaction || !onSplit) return;

    const splits = splitRows
      .filter((r) => parseFloat(r.amount) > 0)
      .map((r) => ({
        category: r.category,
        amount: Math.round(parseFloat(r.amount) * 100) / 100,
      }));

    if (splits.length < 2) return;

    notification("Success");
    onSplit(editTransaction, splits);
    handleClose();
  };

  // --- Render ---
  if (splitMode && isEditing) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.splitHeader}>
              <Text style={styles.splitTitle}>SPLIT TRANSACTION</Text>
              <Text style={styles.splitOriginal}>
                Original: {formatCurrency(originalAmount)}
              </Text>
            </View>

            {/* Split rows */}
            <ScrollView style={styles.splitList} keyboardShouldPersistTaps="handled">
              {splitRows.map((row, index) => (
                <View key={index}>
                  <View style={styles.splitRow}>
                    <View style={styles.splitRowLeft}>
                      <Pressable
                        onPress={() =>
                          setEditingSplitCategory(
                            editingSplitCategory === index ? null : index
                          )
                        }
                        style={[
                          styles.splitCatBtn,
                          editingSplitCategory === index && styles.splitCatBtnActive,
                        ]}
                      >
                        <Text style={styles.splitCatEmoji}>
                          {categories.find((c) => c.id === row.category)?.emoji ?? "📦"}
                        </Text>
                        <Text style={styles.splitCatText}>
                          {categories.find((c) => c.id === row.category)?.name ?? row.category}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.splitRowRight}>
                      <Text style={styles.splitDollar}>$</Text>
                      <TextInput
                        style={styles.splitAmountInput}
                        value={row.amount}
                        onChangeText={(v) => handleSplitAmountChange(index, v)}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.dimmed}
                      />
                      {splitRows.length > 2 && (
                        <Pressable
                          onPress={() => handleRemoveSplitRow(index)}
                          style={styles.splitRemoveBtn}
                        >
                          <Text style={styles.splitRemoveText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Category picker for this row */}
                  {editingSplitCategory === index && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.splitCatPicker}
                    >
                      {categories.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => handleSplitCategoryChange(index, c.id)}
                          style={[
                            styles.splitCatPickerPill,
                            row.category === c.id && styles.splitCatPickerPillActive,
                          ]}
                        >
                          <Text style={styles.splitCatPickerEmoji}>{c.emoji}</Text>
                          <Text
                            style={[
                              styles.splitCatPickerLabel,
                              row.category === c.id && styles.splitCatPickerLabelActive,
                            ]}
                          >
                            {c.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))}
            </ScrollView>

            {/* Add split row */}
            <Pressable onPress={handleAddSplitRow} style={styles.addSplitBtn}>
              <Text style={styles.addSplitText}>+ ADD SPLIT</Text>
            </Pressable>

            {/* Balance indicator */}
            <View style={styles.splitBalance}>
              <Text
                style={[
                  styles.splitBalanceText,
                  splitBalanced
                    ? { color: colors.primary }
                    : { color: colors.red },
                ]}
              >
                {splitBalanced
                  ? "BALANCED ✓"
                  : splitRemaining > 0
                    ? `${formatCurrency(splitRemaining)} REMAINING`
                    : `${formatCurrency(Math.abs(splitRemaining))} OVER`}
              </Text>
            </View>

            {/* Save split */}
            <Pressable
              onPress={handleSaveSplit}
              style={[
                styles.saveBtn,
                !splitBalanced && styles.saveBtnDisabled,
              ]}
            >
              <Text style={styles.saveBtnText}>SAVE SPLIT</Text>
            </Pressable>

            {/* Back to edit */}
            <Pressable
              onPress={() => {
                setSplitMode(false);
                setEditingSplitCategory(null);
              }}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>BACK TO EDIT</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <Pressable
              onPress={() => switchMode("expense")}
              style={[
                styles.modeBtn,
                mode === "expense" && styles.modeBtnActiveExpense,
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "expense" && styles.modeBtnTextActiveExpense,
                ]}
              >
                EXPENSE
              </Text>
            </Pressable>
            <Pressable
              onPress={() => switchMode("income")}
              style={[
                styles.modeBtn,
                mode === "income" && styles.modeBtnActiveIncome,
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "income" && styles.modeBtnTextActiveIncome,
                ]}
              >
                INCOME
              </Text>
            </Pressable>
            {userAccounts.length >= 2 && (
              <Pressable
                onPress={() => switchMode("transfer")}
                style={[
                  styles.modeBtn,
                  mode === "transfer" && styles.modeBtnActiveTransfer,
                ]}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    mode === "transfer" && styles.modeBtnTextActiveTransfer,
                  ]}
                >
                  TRANSFER
                </Text>
              </Pressable>
            )}
          </View>

          {/* Amount */}
          <View style={styles.amountRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={colors.dimmed}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          {mode === "transfer" ? (
            <>
              {/* FROM account */}
              <View>
                <Text style={styles.transferLabel}>FROM</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                  {userAccounts.map((acct) => (
                    <Pressable
                      key={acct.id}
                      onPress={() => { setTransferFrom(acct.id); impact("Light"); }}
                      style={[styles.accountPill, transferFrom === acct.id && styles.accountPillActiveFrom]}
                    >
                      <Text style={styles.accountPillIcon}>{acct.emoji}</Text>
                      <Text style={[styles.accountPillText, transferFrom === acct.id && styles.accountPillTextActiveFrom]}>{acct.label.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* TO account */}
              <View>
                <Text style={styles.transferLabel}>TO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                  {userAccounts.filter((a) => a.id !== transferFrom).map((acct) => (
                    <Pressable
                      key={acct.id}
                      onPress={() => { setTransferTo(acct.id); impact("Light"); }}
                      style={[styles.accountPill, transferTo === acct.id && styles.accountPillActive]}
                    >
                      <Text style={styles.accountPillIcon}>{acct.emoji}</Text>
                      <Text style={[styles.accountPillText, transferTo === acct.id && styles.accountPillTextActive]}>{acct.label.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Note */}
              <TextInput
                style={styles.noteInput}
                placeholder="What's the transfer for? (optional)"
                placeholderTextColor={colors.dimmed}
                value={note}
                onChangeText={setNote}
                returnKeyType="done"
              />
            </>
          ) : (
            <>
              {/* Categories - Grid */}
              <View style={styles.catGrid}>
                {categories.map((c) => (
                  <CategoryPill
                    key={c.id}
                    emoji={c.emoji}
                    label={c.name}
                    selected={category === c.id}
                    onPress={() => setCategory(c.id)}
                  />
                ))}
              </View>

              {/* Note */}
              <TextInput
                style={styles.noteInput}
                placeholder="What was it for? (optional)"
                placeholderTextColor={colors.dimmed}
                value={note}
                onChangeText={setNote}
                returnKeyType="done"
              />

              {/* Account tag picker */}
              {userAccounts.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                  <Pressable
                    onPress={() => { setAccountTag(undefined); impact("Light"); }}
                    style={[styles.accountPill, !accountTag && styles.accountPillActive]}
                  >
                    <Text style={[styles.accountPillText, !accountTag && styles.accountPillTextActive]}>NONE</Text>
                  </Pressable>
                  {userAccounts.map((acct) => (
                    <Pressable
                      key={acct.id}
                      onPress={() => { setAccountTag(acct.id); impact("Light"); }}
                      style={[styles.accountPill, accountTag === acct.id && styles.accountPillActive]}
                    >
                      <Text style={styles.accountPillIcon}>{acct.emoji}</Text>
                      <Text style={[styles.accountPillText, accountTag === acct.id && styles.accountPillTextActive]}>{acct.label.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          )}

          {/* Date */}
          <View style={styles.dateRow}>
            <Pressable
              onPress={setToday}
              style={[styles.dateQuickBtn, isToday && styles.dateQuickBtnActive]}
            >
              <Text style={[styles.dateQuickBtnText, isToday && styles.dateQuickBtnTextActive]}>
                TODAY
              </Text>
            </Pressable>
            <Pressable
              onPress={setYesterday}
              style={[styles.dateQuickBtn, isYesterday && styles.dateQuickBtnActive]}
            >
              <Text style={[styles.dateQuickBtnText, isYesterday && styles.dateQuickBtnTextActive]}>
                YESTERDAY
              </Text>
            </Pressable>
            <TextInput
              style={styles.dateInput}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={colors.dimmed}
              value={dateInput}
              onChangeText={handleDateInput}
              keyboardType="number-pad"
              maxLength={10}
            />
            {!isToday && !isYesterday && !dateInput && (
              <Text style={styles.dateLabel}>
                {formatShortDate(selectedDate.toISOString())}
              </Text>
            )}
          </View>
          </ScrollView>

          {/* Action buttons */}
          {isEditing && onSplit ? (
            <View style={styles.editActions}>
              <Pressable
                onPress={handleSave}
                style={[
                  styles.saveBtn,
                  { flex: 1 },
                  !amount && styles.saveBtnDisabled,
                ]}
              >
                <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
              </Pressable>
              <Pressable
                onPress={handleEnterSplit}
                style={styles.splitBtn}
              >
                <Text style={styles.splitBtnText}>SPLIT</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleSave}
              style={[
                styles.saveBtn,
                (!amount || (mode === "transfer" && (!transferFrom || !transferTo))) && styles.saveBtnDisabled,
              ]}
            >
              <Text style={styles.saveBtnText}>
                {mode === "transfer" ? "TRANSFER" : isEditing ? "SAVE CHANGES" : "SAVE"}
              </Text>
            </Pressable>
          )}

          {/* Delete (edit mode only) */}
          {isEditing && onDelete && (
            <Pressable
              onPress={() => {
                notification("Warning");
                onDelete(editTransaction!.id);
                handleClose();
              }}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>DELETE TRANSACTION</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderTopWidth: 1,
    borderTopColor: colors.primarySolid,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 16,
    gap: spacing.lg,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dimmed,
    alignSelf: "center",
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 2,
  },
  modeBtnActiveExpense: {
    backgroundColor: colors.red,
  },
  modeBtnActiveIncome: {
    backgroundColor: colors.primarySolid,
  },
  modeBtnText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 2,
  },
  modeBtnTextActiveExpense: {
    color: colors.white,
  },
  modeBtnTextActiveIncome: {
    color: colors.primaryText,
  },
  modeBtnActiveTransfer: {
    backgroundColor: "#6366f1",
  },
  modeBtnTextActiveTransfer: {
    color: colors.white,
  },
  transferLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 6,
  },
  accountPillActiveFrom: {
    borderColor: colors.red,
    backgroundColor: "rgba(255,0,60,0.1)",
  },
  accountPillTextActiveFrom: {
    color: colors.red,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dollar: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.primary,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.5,
  },
  catRow: {
    gap: spacing.sm,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  noteInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.3)',
    borderRadius: 2,
    padding: spacing.md,
    color: colors.white,
    fontSize: 15,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateQuickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 2,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateQuickBtnActive: {
    backgroundColor: colors.primarySolid,
    borderColor: colors.primarySolid,
  },
  dateQuickBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  dateQuickBtnTextActive: {
    color: colors.primaryText,
  },
  dateInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.3)',
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    color: colors.white,
    fontSize: 14,
    textAlign: "center",
  },
  dateLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  accountRow: {
    gap: 6,
    paddingVertical: 2,
  },
  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.bg,
    borderRadius: 0,
  },
  accountPillActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0,255,204,0.1)",
  },
  accountPillIcon: {
    fontSize: 12,
  },
  accountPillText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  accountPillTextActive: {
    color: colors.primary,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primarySolid,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 2,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: colors.primaryText,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  splitBtn: {
    backgroundColor: colors.purple,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    borderRadius: 2,
  },
  splitBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
  },
  deleteBtn: {
    backgroundColor: colors.red,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 2,
  },
  deleteBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  backBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  backBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Split mode styles
  splitHeader: {
    alignItems: "center",
    gap: spacing.xs,
  },
  splitTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  splitOriginal: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  splitList: {
    maxHeight: 280,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  splitRowLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  splitCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  splitCatBtnActive: {
    borderColor: colors.primary,
  },
  splitCatEmoji: {
    fontSize: 14,
  },
  splitCatText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  splitRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  splitDollar: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  splitAmountInput: {
    width: 80,
    fontSize: 18,
    fontWeight: "700",
    color: colors.white,
    textAlign: "right",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  splitRemoveBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: colors.redBorder,
    marginLeft: 4,
  },
  splitRemoveText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: "700",
  },
  splitCatPicker: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  splitCatPickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  splitCatPickerPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  splitCatPickerEmoji: {
    fontSize: 13,
  },
  splitCatPickerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  splitCatPickerLabelActive: {
    color: colors.primary,
  },
  addSplitBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryLight,
  },
  addSplitText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
  splitBalance: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  splitBalanceText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
