import { Platform, Alert as RNAlert } from "react-native";

type AlertButtonStyle = "default" | "cancel" | "destructive";

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
  isPreferred?: boolean;
}

interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

// react-native-web's Alert.alert is a hard no-op (`static alert() {}`) — no
// dialog, no callback, ever. Every confirmation and success/error message
// in this app silently did nothing on web because of this. Same call
// signature as RN's real Alert.alert, so every existing call site works
// unchanged — only the import needs to point here instead of "react-native".
function alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons as any, options);
    return;
  }

  const fullMessage = [title, message].filter(Boolean).join("\n\n");

  if (!buttons || buttons.length === 0) {
    window.alert(fullMessage);
    return;
  }

  if (buttons.length === 1) {
    window.alert(fullMessage);
    buttons[0].onPress?.();
    return;
  }

  // Every call site in this app is a Cancel + one action button (delete,
  // confirm, etc.) — window.confirm's OK/Cancel maps onto that directly.
  // With more than two buttons we still pick the best-guess pair rather
  // than silently doing nothing.
  const cancelBtn = buttons.find((b) => b.style === "cancel");
  const actionBtn = buttons.find((b) => b.style !== "cancel") || buttons[buttons.length - 1];

  if (window.confirm(fullMessage)) {
    actionBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
    options?.onDismiss?.();
  }
}

export default { alert };
