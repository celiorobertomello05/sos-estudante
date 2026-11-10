import { ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import type { Tone } from "../../theme";
import type { IconName } from "./types";
import { Txt } from "./Txt";
import { s } from "./styles";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  tone,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  tone?: Tone;
}) {
  const fill = tone === "trust" ? colors.trust600 : colors.brand600;
  const fg = variant === "primary" ? colors.white : fill;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        variant === "primary" && { backgroundColor: fill },
        variant === "secondary" && { backgroundColor: colors.white, borderWidth: 1.5, borderColor: fill },
        variant === "ghost" && { backgroundColor: colors.ink100 },
        (disabled || loading) && { opacity: 0.5 },
        pressed && s.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons color={fg} name={icon} size={18} /> : null}
      <Txt variant="title" color={variant === "ghost" ? colors.ink700 : fg}>
        {label}
      </Txt>
    </Pressable>
  );
}
