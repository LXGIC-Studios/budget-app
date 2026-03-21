import { Pressable, Text, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";
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
        {label.toUpperCase()}
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
    borderRadius: 2,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  selectedLabel: {
    color: colors.bg,
  },
});
