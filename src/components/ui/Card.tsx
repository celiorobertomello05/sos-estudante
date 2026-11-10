import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { tones } from "../../theme";
import type { Tone } from "../../theme";
import { s } from "./styles";

export function Card({
  children,
  tone,
  onPress,
  style,
  padded = true,
}: {
  children: ReactNode;
  tone?: Tone;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const toneStyle = tone ? { backgroundColor: tones[tone].bg, borderColor: tones[tone].border } : null;
  const content = [s.card, padded && s.cardPadded, toneStyle, style];
  if (!onPress) return <View style={content}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [...content, pressed && s.pressed]}>
      {children}
    </Pressable>
  );
}
