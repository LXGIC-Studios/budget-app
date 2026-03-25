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
import { generateId, formatShortDate } from "../utils";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (txn: Transaction) => void;
}

export function QuickAddSheet({ visible, onClose, onSave }: Props) {
  const [mode, setMode] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateInput, setDateInput] = useState("");

  const categories =
    mode === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    notification("Success");

    const txn: Transaction = {
      id: generateId(),
      type: mode,
      amount: Math.round(parsed * 100) / 100,
      category,
      note: note.trim() || undefined,
      date: selectedDate.toISOString(),
      createdAt: new Date().toISOString(),
    };

    onSave(txn);
    setAmount("");
    setCategory(mode === "expense" ? "food" : "salary");
    setNote("");
    setSelectedDate(new Date());
    setDateInput("");
    onClose();
  };

  const handleClose = () => {
    setAmount("");
    setNote("");
    setSelectedDate(new Date());
    setDateInput("");
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
    // Auto-format: add slashes as user types
    const digits = text.replace(/\D/g, "");
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
    setDateInput(formatted);

    // Parse when complete: MM/DD/YYYY
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

  const switchMode = (m: "expense" | "income") => {
    setMode(m);
    setCategory(m === "expense" ? "food" : "salary");
    impact("Light");
  };

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
                Expense
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
                Income
              </Text>
            </Pressable>
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

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            {categories.map((c) => (
              <CategoryPill
                key={c.id}
                emoji={c.emoji}
                label={c.name}
                selected={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </ScrollView>

          {/* Note */}
          <TextInput
            style={styles.noteInput}
            placeholder="What was it for? (optional)"
            placeholderTextColor={colors.dimmed}
            value={note}
            onChangeText={setNote}
            returnKeyType="done"
          />

          {/* Date */}
          <View style={styles.dateRow}>
            <Pressable
              onPress={setToday}
              style={[styles.dateQuickBtn, isToday && styles.dateQuickBtnActive]}
            >
              <Text style={[styles.dateQuickBtnText, isToday && styles.dateQuickBtnTextActive]}>
                Today
              </Text>
            </Pressable>
            <Pressable
              onPress={setYesterday}
              style={[styles.dateQuickBtn, isYesterday && styles.dateQuickBtnActive]}
            >
              <Text style={[styles.dateQuickBtnText, isYesterday && styles.dateQuickBtnTextActive]}>
                Yesterday
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

          {/* Save */}
          <Pressable
            onPress={handleSave}
            style={[
              styles.saveBtn,
              !amount && styles.saveBtnDisabled,
            ]}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 16,
    gap: spacing.lg,
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
    borderRadius: radius.full,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.full,
  },
  modeBtnActiveExpense: {
    backgroundColor: colors.red,
  },
  modeBtnActiveIncome: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  modeBtnTextActiveExpense: {
    color: colors.white,
  },
  modeBtnTextActiveIncome: {
    color: colors.bg,
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
  noteInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
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
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateQuickBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateQuickBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  dateQuickBtnTextActive: {
    color: colors.bg,
  },
  dateInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
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
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: radius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "700",
  },
});
