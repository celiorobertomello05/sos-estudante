import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tones } from "../../theme";
import type { Tone } from "../../theme";
import type { IconName } from "./types";
import { s } from "./styles";

export function IconBadge({ name, tone = "brand", size = 40 }: { name: IconName; tone?: Tone; size?: number }) {
  const t = tones[tone];
  return (
    <View style={[s.iconBadge, { width: size, height: size, backgroundColor: t.bg }]}>
      <Ionicons color={t.fg} name={name} size={size * 0.48} />
    </View>
  );
}
