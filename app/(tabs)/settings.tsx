import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DollarSign,
  Globe,
  RotateCcw,
  Info,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { formatCurrency } from "../../src/utils";

function SettingRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { profile, saveProfile, resetAll } = useApp();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeText, setIncomeText] = useState(
    profile?.monthlyIncome?.toString() ?? ""
  );

  const handleSaveIncome = () => {
    const parsed = parseFloat(incomeText);
    if (!parsed || !profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveProfile({ ...profile, monthlyIncome: parsed });
    setEditingIncome(false);
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Everything",
      "This will delete all your data including transactions, budgets, and settings. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            );
            resetAll();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Settings</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          {editingIncome ? (
            <View style={styles.editRow}>
              <View style={styles.editInputRow}>
                <Text style={styles.editDollar}>$</Text>
                <TextInput
                  style={styles.editInput}
                  keyboardType="decimal-pad"
                  value={incomeText}
                  onChangeText={setIncomeText}
                  autoFocus
                />
              </View>
              <View style={styles.editBtns}>
                <Pressable
                  onPress={() => setEditingIncome(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSaveIncome} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <SettingRow
              icon={
                <DollarSign size={20} color={colors.textSecondary} />
              }
              label="Monthly Income"
              value={formatCurrency(profile?.monthlyIncome ?? 0)}
              onPress={() => setEditingIncome(true)}
            />
          )}

          <SettingRow
            icon={<Globe size={20} color={colors.textSecondary} />}
            label="Currency"
            value={profile?.currency ?? "USD"}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <SettingRow
            icon={<RotateCcw size={20} color={colors.red} />}
            label="Reset All Data"
            onPress={handleReset}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <SettingRow
            icon={<Info size={20} color={colors.textSecondary} />}
            label="Stackd"
            value="v1.0.0"
          />
        </View>

        <Text style={styles.footer}>
          Built with focus. No bloat.{"\n"}Your data stays on your device.
        </Text>
      </ScrollView>
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
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
  },
  rowLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "500",
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  editRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.md,
  },
  editInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  editDollar: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: "600",
  },
  editInput: {
    flex: 1,
    color: colors.white,
    fontSize: 20,
    fontWeight: "600",
  },
  editBtns: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: colors.bg,
    fontWeight: "600",
  },
  footer: {
    color: colors.dimmed,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.lg,
  },
});
