import { Platform } from "react-native";

export async function impact(style: "Light" | "Medium" | "Heavy" = "Medium") {
  if (Platform.OS === "web") return;
  const Haptics = await import("expo-haptics");
  Haptics.impactAsync(
    style === "Light"
      ? Haptics.ImpactFeedbackStyle.Light
      : style === "Heavy"
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium
  );
}

export async function notification(type: "Success" | "Warning" | "Error" = "Success") {
  if (Platform.OS === "web") return;
  const Haptics = await import("expo-haptics");
  Haptics.notificationAsync(
    type === "Warning"
      ? Haptics.NotificationFeedbackType.Warning
      : type === "Error"
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Success
  );
}
