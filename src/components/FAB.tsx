import { Pressable, StyleSheet } from "react-native";
import { Plus } from "lucide-react-native";
import { impact } from "../lib/haptics";
import { colors, radius, spacing } from "../theme";

interface Props {
  onPress: () => void;
}

export function FAB({ onPress }: Props) {
  const handlePress = () => {
    impact("Medium");
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.fab}>
      <Plus size={28} color={colors.bg} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
});
