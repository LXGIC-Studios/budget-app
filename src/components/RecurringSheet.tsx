import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { X, Plus, Trash2, Pencil, RefreshCw } from "lucide-react-native";
import { impact, notification } from "../lib/haptics";
import { colors, spacing } from "../theme";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../types";
import type { ScheduledTransaction, RecurringFrequency } from "../types";
import { useApp } from "../context/AppContext";
import { generateId, formatCurrency } from "../utils";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function freqLabel(st: ScheduledTransaction): string {
  const freq = st.frequency || "monthly";
  if (freq === "monthly") {
    const suffix =
      st.dayOfMonth === 1 || st.dayOfMonth === 21 || st.dayOfMonth === 31 ? "st" :
      st.dayOfMonth === 2 || st.dayOfMonth === 22 ? "nd" :
      st.dayOfMonth === 3 || st.dayOfMonth === 23 ? "rd" : "th";
    return `Monthly · ${st.dayOfMonth}${suffix}`;
  }
  if (freq === "weekly") {
    return `Weekly · ${WEEK_DAYS[st.dayOfMonth] ?? "?"}`;
  }
  if (freq === "biweekly") {
    return `Biweekly · ${WEEK_DAYS[st.dayOfMonth] ?? "?"}`;
  }
  return freq;
}

function categoryEmoji(category: string, type: "expense" | "income"): string {
  const list = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return (list as ReadonlyArray<{ id: string; emoji: string }>).find(c => c.id === category)?.emoji ?? "📦";
}

interface EditFormState {
  type: "expense" | "income";
  amount: string;
  category: string;
  note: string;
  frequency: RecurringFrequency;
  dayOfMonth: string;
  accountTag: string | undefined;
}

function EditModal({
  st,
  onClose,
  onSave,
  accounts,
}: {
  st: ScheduledTransaction | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Omit<ScheduledTransaction, "id" | "createdAt">>) => void;
  accounts: { id: string; label: string; emoji: string }[];
}) {
  const isNew = st === null;
  const [form, setForm] = useState<EditFormState>(() => ({
    type: st?.type ?? "expense",
    amount: st ? String(st.amount) : "",
    category: st?.category ?? "Misc",
    note: st?.note ?? "",
    frequency: st?.frequency ?? "monthly",
    dayOfMonth: String(st?.dayOfMonth ?? 1),
    accountTag: st?.accountTag,
  }));

  const categories = form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSave = () => {
    const parsed = parseFloat(form.amount);
    if (!parsed || parsed <= 0) return;
    const day = parseInt(form.dayOfMonth, 10);
    let safeDay = 1;
    if (form.frequency === "monthly") {
      safeDay = day >= 1 && day <= 31 ? day : 1;
    } else {
      safeDay = day >= 0 && day <= 6 ? day : 0;
    }
    onSave(st?.id ?? "", {
      type: form.type,
      amount: Math.round(parsed * 100) / 100,
      category: form.category,
      note: form.note.trim() || undefined,
      frequency: form.frequency,
      dayOfMonth: safeDay,
      accountTag: form.accountTag,
      active: true,
    });
    onClose();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={es.overlay} onPress={onClose}>
        <Pressable style={es.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={es.header}>
              <Text style={es.title}>{isNew ? "NEW RECURRING" : "EDIT RECURRING"}</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Type toggle */}
            <View style={es.typeRow}>
              {(["expense", "income"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => { setForm((f) => ({ ...f, type: t, category: t === "expense" ? "Misc" : "salary" })); impact("Light"); }}
                  style={[es.typeBtn, form.type === t && (t === "expense" ? es.typeBtnExpense : es.typeBtnIncome)]}
                >
                  <Text style={[es.typeBtnText, form.type === t && es.typeBtnTextActive]}>
                    {t.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Amount */}
            <View style={es.amountRow}>
              <Text style={es.dollar}>$</Text>
              <TextInput
                style={es.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.dimmed}
                keyboardType="decimal-pad"
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                autoFocus
              />
            </View>

            {/* Category */}
            <Text style={es.label}>CATEGORY</Text>
            <View style={es.catGrid}>
              {(categories as ReadonlyArray<{ id: string; name: string; emoji: string }>).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => { setForm((f) => ({ ...f, category: c.id })); impact("Light"); }}
                  style={[es.catPill, form.category === c.id && es.catPillActive]}
                >
                  <Text style={es.catEmoji}>{c.emoji}</Text>
                  <Text style={[es.catText, form.category === c.id && es.catTextActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>

            {/* Note */}
            <TextInput
              style={es.noteInput}
              placeholder="Label (e.g. Netflix, Rent...)"
              placeholderTextColor={colors.dimmed}
              value={form.note}
              onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
              returnKeyType="done"
            />

            {/* Frequency */}
            <Text style={es.label}>FREQUENCY</Text>
            <View style={es.freqRow}>
              {(["monthly", "biweekly", "weekly"] as RecurringFrequency[]).map((freq) => (
                <Pressable
                  key={freq}
                  onPress={() => { setForm((f) => ({ ...f, frequency: freq, dayOfMonth: "1" })); impact("Light"); }}
                  style={[es.freqBtn, form.frequency === freq && es.freqBtnActive]}
                >
                  <Text style={[es.freqBtnText, form.frequency === freq && es.freqBtnTextActive]}>
                    {freq === "monthly" ? "MONTHLY" : freq === "biweekly" ? "BIWEEKLY" : "WEEKLY"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Schedule input */}
            {form.frequency === "monthly" ? (
              <View style={es.schedRow}>
                <Text style={es.label}>DAY OF MONTH</Text>
                <TextInput
                  style={es.dayInput}
                  value={form.dayOfMonth}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 2);
                    const num = parseInt(digits, 10);
                    if (digits === "" || (num >= 1 && num <= 31)) setForm((f) => ({ ...f, dayOfMonth: digits }));
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="1"
                  placeholderTextColor={colors.dimmed}
                />
              </View>
            ) : (
              <>
                <Text style={es.label}>DAY OF WEEK</Text>
                <View style={es.weekdayRow}>
                  {WEEK_DAYS.map((d, i) => (
                    <Pressable
                      key={i}
                      onPress={() => { setForm((f) => ({ ...f, dayOfMonth: String(i) })); impact("Light"); }}
                      style={[es.weekdayBtn, parseInt(form.dayOfMonth) === i && es.weekdayBtnActive]}
                    >
                      <Text style={[es.weekdayText, parseInt(form.dayOfMonth) === i && es.weekdayTextActive]}>
                        {d.slice(0, 1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {form.frequency === "biweekly" && (
                  <Text style={es.hint}>Set anchor date by picking the transaction date when saving.</Text>
                )}
              </>
            )}

            {/* Account tag */}
            {accounts.length > 0 && (
              <>
                <Text style={es.label}>ACCOUNT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={es.acctRow}>
                  <Pressable
                    onPress={() => { setForm((f) => ({ ...f, accountTag: undefined })); impact("Light"); }}
                    style={[es.acctPill, !form.accountTag && es.acctPillActive]}
                  >
                    <Text style={[es.acctText, !form.accountTag && es.acctTextActive]}>NONE</Text>
                  </Pressable>
                  {accounts.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => { setForm((f) => ({ ...f, accountTag: a.id })); impact("Light"); }}
                      style={[es.acctPill, form.accountTag === a.id && es.acctPillActive]}
                    >
                      <Text style={es.acctEmoji}>{a.emoji}</Text>
                      <Text style={[es.acctText, form.accountTag === a.id && es.acctTextActive]}>{a.label.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Save */}
            <Pressable
              onPress={handleSave}
              style={[es.saveBtn, !form.amount && es.saveBtnDisabled]}
            >
              <Text style={es.saveBtnText}>SAVE</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const es = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#050505",
    borderTopWidth: 2,
    borderTopColor: "#8B5CF6",
    padding: spacing.lg,
    paddingBottom: Platform.OS === "web" ? spacing.xl : 52,
    maxHeight: "85%",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { color: colors.white, fontSize: 16, fontWeight: "900", letterSpacing: 3 },
  typeRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  typeBtn: {
    flex: 1, paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#1c1c1c", borderRadius: 2, backgroundColor: "#0a0a0a",
  },
  typeBtnExpense: { backgroundColor: colors.red, borderColor: colors.red },
  typeBtnIncome: { backgroundColor: colors.primarySolid, borderColor: colors.primarySolid },
  typeBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: 2 },
  typeBtnTextActive: { color: colors.white },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  dollar: { color: colors.primary, fontSize: 36, fontWeight: "900" },
  amountInput: { flex: 1, color: colors.white, fontSize: 36, fontWeight: "900" },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 3, marginBottom: 8, marginTop: 12 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: "#1c1c1c", backgroundColor: "#0a0a0a", borderRadius: 2,
  },
  catPillActive: { borderColor: "#8B5CF6", backgroundColor: "rgba(139,92,246,0.15)" },
  catEmoji: { fontSize: 14 },
  catText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  catTextActive: { color: "#8B5CF6" },
  noteInput: {
    backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1c1c1c",
    padding: spacing.md, color: colors.white, fontSize: 15, borderRadius: 2, marginTop: 8,
  },
  freqRow: { flexDirection: "row", gap: 6 },
  freqBtn: {
    flex: 1, paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#1c1c1c", borderRadius: 2, backgroundColor: "#0a0a0a",
  },
  freqBtnActive: { borderColor: "#8B5CF6", backgroundColor: "rgba(139,92,246,0.15)" },
  freqBtnText: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  freqBtnTextActive: { color: "#8B5CF6" },
  schedRow: { gap: 8 },
  dayInput: {
    width: 60, backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#8B5CF6",
    padding: spacing.sm, color: colors.white, fontSize: 20, fontWeight: "700",
    textAlign: "center", borderRadius: 2,
  },
  weekdayRow: { flexDirection: "row", gap: 4 },
  weekdayBtn: {
    flex: 1, paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#1c1c1c", borderRadius: 2, backgroundColor: "#0a0a0a",
  },
  weekdayBtnActive: { borderColor: "#8B5CF6", backgroundColor: "rgba(139,92,246,0.2)" },
  weekdayText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  weekdayTextActive: { color: "#8B5CF6" },
  hint: { color: colors.dimmed, fontSize: 10, marginTop: 6, letterSpacing: 1 },
  acctRow: { gap: 6, paddingVertical: 2 },
  acctPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: "#1c1c1c", backgroundColor: "#0a0a0a", borderRadius: 0,
  },
  acctPillActive: { borderColor: "#8B5CF6", backgroundColor: "rgba(139,92,246,0.1)" },
  acctEmoji: { fontSize: 12 },
  acctText: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  acctTextActive: { color: "#8B5CF6" },
  saveBtn: {
    backgroundColor: "#8B5CF6", paddingVertical: 16,
    alignItems: "center", borderRadius: 2, marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.white, fontSize: 17, fontWeight: "700", letterSpacing: 2 },
});

// ── Main RecurringSheet ──────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function RecurringSheet({ visible, onClose }: Props) {
  const { scheduledTransactions, addScheduledTransaction, updateScheduledTransaction, deleteScheduledTransaction, userAccounts } = useApp();
  const [editTarget, setEditTarget] = useState<ScheduledTransaction | null | "new">(null);

  if (!visible) return null;

  const handleEdit = (st: ScheduledTransaction) => {
    setEditTarget(st);
    impact("Light");
  };

  const handleNew = () => {
    setEditTarget("new");
    impact("Light");
  };

  const handleSaveEdit = (id: string, updates: Partial<Omit<ScheduledTransaction, "id" | "createdAt">>) => {
    if (editTarget === "new") {
      const now = new Date().toISOString();
      addScheduledTransaction({
        id: generateId(),
        type: updates.type ?? "expense",
        amount: updates.amount ?? 0,
        category: updates.category ?? "Misc",
        note: updates.note,
        frequency: updates.frequency ?? "monthly",
        dayOfMonth: updates.dayOfMonth ?? 1,
        startDate: updates.startDate,
        accountTag: updates.accountTag,
        active: true,
        createdAt: now,
      });
      notification("Success");
    } else if (id) {
      updateScheduledTransaction(id, updates);
      notification("Success");
    }
    setEditTarget(null);
  };

  const handleDelete = (id: string) => {
    deleteScheduledTransaction(id);
    notification("Warning");
  };

  const handleToggleActive = (st: ScheduledTransaction) => {
    updateScheduledTransaction(st.id, { active: !st.active });
    impact("Medium");
  };

  const expenses = scheduledTransactions.filter((s) => s.type === "expense");
  const income = scheduledTransactions.filter((s) => s.type === "income");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={rs.backdrop} onPress={onClose} />
      <View style={rs.sheet}>
        {/* Header */}
        <View style={rs.header}>
          <View style={rs.headerLeft}>
            <RefreshCw size={18} color="#8B5CF6" strokeWidth={2.5} />
            <Text style={rs.title}>RECURRING</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable onPress={handleNew} style={rs.addBtn}>
              <Plus size={16} color="#8B5CF6" strokeWidth={2.5} />
              <Text style={rs.addBtnText}>ADD</Text>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {scheduledTransactions.length === 0 && (
            <View style={rs.emptyState}>
              <Text style={rs.emptyEmoji}>🔁</Text>
              <Text style={rs.emptyTitle}>NO RECURRING SET UP</Text>
              <Text style={rs.emptyBody}>Add recurring expenses like rent, subscriptions, and utilities to track them automatically.</Text>
              <Pressable onPress={handleNew} style={rs.emptyBtn}>
                <Text style={rs.emptyBtnText}>ADD FIRST RECURRING</Text>
              </Pressable>
            </View>
          )}

          {expenses.length > 0 && (
            <>
              <View style={rs.sectionHeader}>
                <View style={[rs.sectionAccent, { backgroundColor: colors.red }]} />
                <Text style={rs.sectionTitle}>EXPENSES</Text>
              </View>
              {expenses.map((st) => (
                <RecurringRow
                  key={st.id}
                  st={st}
                  onEdit={() => handleEdit(st)}
                  onDelete={() => handleDelete(st.id)}
                  onToggle={() => handleToggleActive(st)}
                  accounts={userAccounts}
                />
              ))}
            </>
          )}

          {income.length > 0 && (
            <>
              <View style={rs.sectionHeader}>
                <View style={[rs.sectionAccent, { backgroundColor: colors.primary }]} />
                <Text style={rs.sectionTitle}>INCOME</Text>
              </View>
              {income.map((st) => (
                <RecurringRow
                  key={st.id}
                  st={st}
                  onEdit={() => handleEdit(st)}
                  onDelete={() => handleDelete(st.id)}
                  onToggle={() => handleToggleActive(st)}
                  accounts={userAccounts}
                />
              ))}
            </>
          )}
        </ScrollView>

        {/* Edit / New modal */}
        {editTarget !== null && (
          <EditModal
            st={editTarget === "new" ? null : editTarget}
            onClose={() => setEditTarget(null)}
            onSave={handleSaveEdit}
            accounts={userAccounts}
          />
        )}
      </View>
    </Modal>
  );
}

function RecurringRow({
  st,
  onEdit,
  onDelete,
  onToggle,
  accounts,
}: {
  st: ScheduledTransaction;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  accounts: { id: string; label: string; emoji: string }[];
}) {
  const acct = accounts.find((a) => a.id === st.accountTag);
  const isExpense = st.type === "expense";
  const amtColor = isExpense ? colors.red : colors.primary;

  return (
    <View style={[rs.row, !st.active && rs.rowInactive]}>
      <View style={rs.rowLeft}>
        <Text style={rs.rowEmoji}>{categoryEmoji(st.category, st.type)}</Text>
        <View style={rs.rowMid}>
          <Text style={rs.rowName}>{st.note || st.category}</Text>
          <Text style={rs.rowSub}>{freqLabel(st)}{acct ? ` · ${acct.emoji} ${acct.label}` : ""}</Text>
        </View>
      </View>
      <View style={rs.rowRight}>
        <Text style={[rs.rowAmt, { color: amtColor }]}>
          {isExpense ? "-" : "+"}{formatCurrency(st.amount)}
        </Text>
        <View style={rs.rowActions}>
          <Pressable onPress={onToggle} style={rs.actionBtn} hitSlop={8}>
            <View style={[rs.activeDot, { backgroundColor: st.active ? colors.primary : "#333" }]} />
          </Pressable>
          <Pressable onPress={onEdit} style={rs.actionBtn} hitSlop={8}>
            <Pencil size={14} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={onDelete} style={rs.actionBtn} hitSlop={8}>
            <Trash2 size={14} color={colors.red} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const rs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#050505",
    borderTopWidth: 2,
    borderTopColor: "#8B5CF6",
    maxHeight: "88%",
    paddingTop: 0,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#111",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.white, fontSize: 16, fontWeight: "900", letterSpacing: 3 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.4)",
    backgroundColor: "rgba(139,92,246,0.08)",
  },
  addBtnText: { color: "#8B5CF6", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.lg, paddingVertical: 8,
    backgroundColor: "#040404",
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#0f0f0f",
  },
  sectionAccent: { width: 3, height: 12 },
  sectionTitle: { color: "#ccc", fontSize: 11, fontWeight: "700", letterSpacing: 3 },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#0a0a0a",
  },
  rowInactive: { opacity: 0.35 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowEmoji: { fontSize: 20, width: 26, textAlign: "center" },
  rowMid: { flex: 1 },
  rowName: { color: colors.white, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  rowAmt: { fontSize: 17, fontWeight: "900" },
  rowActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  actionBtn: { padding: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: {
    alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: 48, gap: 12,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { color: colors.white, fontSize: 14, fontWeight: "900", letterSpacing: 3 },
  emptyBody: { color: colors.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    backgroundColor: "#8B5CF6", paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 2, marginTop: 8,
  },
  emptyBtnText: { color: colors.white, fontSize: 13, fontWeight: "700", letterSpacing: 2 },
});
