import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme";

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
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 20,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
