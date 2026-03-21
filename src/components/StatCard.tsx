import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme";

interface Props {
  label: string;
  value: string;
  emoji: string;
  color?: string;
}

export function StatCard({ label, value, emoji, color = colors.white }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 20,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
