import { View } from "react-native";
import { colors } from "../../theme";
import type { Tone } from "../../theme";
import { s } from "./styles";

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: Tone }) {
  const fill = tone === "amber" ? colors.amber500 : tone === "rose" ? colors.rose500 : colors.brand600;
  return (
    <View style={s.track}>
      <View style={[s.trackFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: fill }]} />
    </View>
  );
}
