import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DollarSign,
  Globe,
  RotateCcw,
  Info,
  LogOut,
  Upload,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { impact, notification } from "../../src/lib/haptics";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { formatCurrency } from "../../src/utils";
import { parseCSV } from "../../src/lib/csv-parser";
import { parseOFX } from "../../src/lib/ofx-parser";
import { ImportPreview } from "../../src/components/ImportPreview";
import type { Transaction } from "../../src/types";

function SettingRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        {icon}
        <Text style={[styles.rowLabel, destructive && { color: colors.red }]}>{label}</Text>
      </View>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </Pressable>
  );
}

async function readFileContent(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    return response.text();
  }
  return FileSystem.readAsStringAsync(uri);
}

function filterDuplicates(
  newTxns: Transaction[],
  existing: Transaction[]
): Transaction[] {
  return newTxns.filter(
    (t) =>
      !existing.some(
        (e) =>
          e.date === t.date &&
          e.amount === t.amount &&
          e.category === t.category
      )
  );
}

export default function SettingsScreen() {
  const { profile, saveProfile, resetAll, addTransactions, transactions } =
    useApp();
  const { user, signOut } = useAuth();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeText, setIncomeText] = useState(
    profile?.monthlyIncome?.toString() ?? ""
  );
  const [previewTxns, setPreviewTxns] = useState<Transaction[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleSaveIncome = () => {
    const parsed = parseFloat(incomeText);
    if (!parsed || !profile) return;
    impact("Medium");
    saveProfile({ ...profile, monthlyIncome: parsed });
    setEditingIncome(false);
  };

  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/csv",
          "text/comma-separated-values",
          "application/x-ofx",
          "application/ofx",
          "text/plain",
          "application/octet-stream",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const content = await readFileContent(file.uri);

      const isOFX =
        file.name?.toLowerCase().endsWith(".ofx") ||
        file.name?.toLowerCase().endsWith(".qfx") ||
        content.trimStart().startsWith("OFXHEADER") ||
        content.includes("<OFX>");

      const parsed = isOFX ? parseOFX(content) : parseCSV(content);

      if (parsed.length === 0) {
        const msg = "No transactions found in this file. Make sure it's a valid bank statement export.";
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert("No Transactions", msg);
        }
        return;
      }

      const unique = filterDuplicates(parsed, transactions);

      if (unique.length === 0) {
        const msg = "All transactions in this file have already been imported.";
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert("Already Imported", msg);
        }
        return;
      }

      setPreviewTxns(unique);
      setShowPreview(true);
    } catch {
      const msg = "Failed to read the file. Please try again.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Import Error", msg);
      }
    }
  };

  const handleConfirmImport = async (txns: Transaction[]) => {
    setShowPreview(false);
    await addTransactions(txns);
    notification("Success");
    const msg = `Successfully imported ${txns.length} transaction${txns.length !== 1 ? "s" : ""}.`;
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Import Complete", msg);
    }
  };

  const handleReset = () => {
    const doReset = () => {
      notification("Warning");
      resetAll();
    };

    if (Platform.OS === "web") {
      if (window.confirm("This will delete all your data including transactions, budgets, and settings. This cannot be undone.")) {
        doReset();
      }
    } else {
      Alert.alert(
        "Reset Everything",
        "This will delete all your data including transactions, budgets, and settings. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reset",
            style: "destructive",
            onPress: doReset,
          },
        ]
      );
    }
  };

  const handleSignOut = () => {
    const doSignOut = () => signOut();

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        doSignOut();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doSignOut },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Settings</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROFILE</Text>

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
              icon={<DollarSign size={20} color={colors.primary} />}
              label="Monthly Income"
              value={formatCurrency(profile?.monthlyIncome ?? 0)}
              onPress={() => setEditingIncome(true)}
            />
          )}

          <SettingRow
            icon={<Globe size={20} color={colors.primary} />}
            label="Currency"
            value={profile?.currency ?? "USD"}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <SettingRow
            icon={<Info size={20} color={colors.textSecondary} />}
            label="Email"
            value={user?.email ?? ""}
          />
          <SettingRow
            icon={<LogOut size={20} color={colors.red} />}
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA</Text>
          <SettingRow
            icon={<Upload size={20} color={colors.textSecondary} />}
            label="Import Transactions"
            onPress={handleImportFile}
          />
          <SettingRow
            icon={<RotateCcw size={20} color={colors.red} />}
            label="Reset All Data"
            onPress={handleReset}
            destructive
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <SettingRow
            icon={<Info size={20} color={colors.textSecondary} />}
            label="Stackd"
            value="v1.0.0"
          />
        </View>

        <Text style={styles.footer}>
          Built with focus. No bloat.{"\n"}Your budget, synced everywhere.
        </Text>
      </ScrollView>

      <ImportPreview
        visible={showPreview}
        transactions={previewTxns}
        onImport={handleConfirmImport}
        onClose={() => setShowPreview(false)}
      />
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
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 2,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    color: colors.white,
    fontSize: 15,
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  editRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  editInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  editDollar: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "700",
  },
  editInput: {
    flex: 1,
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
  },
  editBtns: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  saveBtnText: {
    color: colors.bg,
    fontWeight: "700",
  },
  footer: {
    color: colors.dimmed,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.lg,
  },
});
