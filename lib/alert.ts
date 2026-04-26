import { Alert, Platform } from "react-native";

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons as any);
    return;
  }

  if (typeof window === "undefined") return;

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  const confirmBtn =
    buttons.find((b) => b.style === "destructive") ??
    buttons.find((b) => b.style !== "cancel") ??
    buttons[buttons.length - 1];
  const cancelBtn =
    buttons.find((b) => b.style === "cancel") ??
    buttons.find((b) => b !== confirmBtn);

  const ok = window.confirm(`${text}\n\n[OK = ${confirmBtn.text}]`);
  if (ok) confirmBtn.onPress?.();
  else cancelBtn?.onPress?.();
}
