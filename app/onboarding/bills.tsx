import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { impact } from "../../src/lib/haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../../src/theme";
import { BILL_PRESETS } from "../../src/types";
import type { Bill } from "../../src/types";

export default function OnboardingBills() {
  const router = useRouter();
  const { income } = useLocalSearchParams<{ income: string }>();
  const [bills, setBills] = useState<Bill[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const addPreset = (preset: Bill) => {
    if (bills.find((b) => b.name === preset.name)) return;
    impact("Light");
    const newBills = [...bills, { ...preset, amount: 0 }];
    setBills(newBills);
    setEditingIdx(newBills.length - 1);
  };

  const updateAmount = (idx: number, val: string) => {
    const updated = [...bills];
    updated[idx] = { ...updated[idx], amount: parseFloat(val) || 0 };
    setBills(updated);
  };

  const removeBill = (idx: number) => {
    impact("Light");
    setBills(bills.filter((_, i) => i !== idx));
    setEditingIdx(null);
  };

  const handleNext = () => {
    impact("Medium");
    const validBills = bills.filter((b) => b.amount > 0);
    router.push({
      pathname: "/onboarding/summary",
      params: {
        income,
        bills: JSON.stringify(validBills),
      },
    });
  };

  const unusedPresets = BILL_PRESETS.filter(
    (p) => !bills.find((b) => b.name === p.name)
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>What are your{"\n"}monthly bills?</Text>
        <Text style={styles.subtitle}>
          Tap to add, then enter the amount.
        </Text>

        {/* Presets */}
        {unusedPresets.length > 0 && (
          <View style={styles.presets}>
            {unusedPresets.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => addPreset(preset)}
                style={styles.presetChip}
              >
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <Text style={styles.presetText}>{preset.name}</Text>
                <Text style={styles.presetPlus}>+</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Added bills */}
        {bills.map((bill, idx) => (
          <View key={bill.name} style={styles.billRow}>
            <View style={styles.billInfo}>
              <Text style={styles.billEmoji}>{bill.emoji}</Text>
              <Text style={styles.billName}>{bill.name}</Text>
            </View>
            <View style={styles.billAmountRow}>
              <Text style={styles.billDollar}>$</Text>
              <TextInput
                style={styles.billInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.dimmed}
                value={bill.amount ? bill.amount.toString() : ""}
                onChangeText={(v) => updateAmount(idx, v)}
                autoFocus={editingIdx === idx}
              />
              <Pressable onPress={() => removeBill(idx)} style={styles.removeBtn}>
                <Text style={styles.removeText}>{"\u00D7"}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable onPress={handleNext} style={styles.btn}>
          <Text style={styles.btnText}>
            {bills.length === 0 ? "Skip" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  step: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  presetEmoji: {
    fontSize: 16,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  presetPlus: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  billInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  billEmoji: {
    fontSize: 20,
  },
  billName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  billAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  billDollar: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "600",
  },
  billInput: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    minWidth: 60,
    textAlign: "right",
  },
  removeBtn: {
    marginLeft: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.red + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: colors.red,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  bottom: {
    padding: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  btnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "700",
  },
});
