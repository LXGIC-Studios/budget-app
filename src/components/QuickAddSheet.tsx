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
import { colors, radius, spacing } from "../theme";
import { CategoryPill } from "./CategoryPill";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../types";
import type { Transaction } from "../types";
import { generateId } from "../utils";

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
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    onSave(txn);
    setAmount("");
    setCategory(mode === "expense" ? "food" : "salary");
    setNote("");
    onClose();
  };

  const handleClose = () => {
    setAmount("");
    setNote("");
    onClose();
  };

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
                mode === "expense" && styles.modeBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "expense" && styles.modeBtnTextActive,
                ]}
              >
                Expense
              </Text>
            </Pressable>
            <Pressable
              onPress={() => switchMode("income")}
              style={[
                styles.modeBtn,
                mode === "income" && styles.modeBtnActiveGreen,
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "income" && styles.modeBtnTextActiveGreen,
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
    borderRadius: radius.sm,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm - 2,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: colors.red + "30",
  },
  modeBtnActiveGreen: {
    backgroundColor: colors.primary + "30",
  },
  modeBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  modeBtnTextActive: {
    color: colors.red,
  },
  modeBtnTextActiveGreen: {
    color: colors.primary,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dollar: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "700",
    color: colors.white,
  },
  catRow: {
    gap: spacing.sm,
  },
  noteInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.white,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
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
