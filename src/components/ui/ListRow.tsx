import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import type { Tone } from "../../theme";
import type { IconName } from "./types";
import { Txt } from "./Txt";
import { IconBadge } from "./IconBadge";
import { s } from "./styles";

export function ListRow({
  icon,
  title,
  detail,
  onPress,
  tone = "neutral",
  trailing,
  flat,
}: {
  icon?: IconName;
  title: string;
  detail?: string;
  onPress?: () => void;
  tone?: Tone;
  trailing?: ReactNode;
  /** Sem borda, para listas dentro de um Card. */
  flat?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [s.listRow, flat && s.listRowFlat, pressed && s.pressed]}
    >
      {icon ? <IconBadge name={icon} size={36} tone={tone} /> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="title">{title}</Txt>
        {detail ? <Txt variant="small">{detail}</Txt> : null}
      </View>
      {trailing !== undefined ? trailing : onPress ? <Ionicons color={colors.ink400} name="chevron-forward" size={18} /> : null}
    </Pressable>
  );
}
