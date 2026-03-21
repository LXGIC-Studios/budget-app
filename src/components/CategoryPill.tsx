import { Pressable, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme";
import * as Haptics from "expo-haptics";

interface Props {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function CategoryPill({ emoji, label, selected, onPress }: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.pill, selected && styles.selected]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
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
  selected: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  selectedLabel: {
    color: colors.primary,
  },
});
