import { View } from "react-native";
import { fonts, tones } from "../../theme";
import type { Tone } from "../../theme";
import { Txt } from "./Txt";
import { s } from "./styles";

export function Pill({ label, tone = "brand", dot }: { label: string; tone?: Tone; dot?: boolean }) {
  const t = tones[tone];
  return (
    <View style={[s.pill, { backgroundColor: t.bg, borderColor: t.border }]}>
      {dot ? <View style={[s.pillDot, { backgroundColor: t.fg }]} /> : null}
      <Txt variant="small" color={t.fg} style={{ fontFamily: fonts.semibold }}>
        {label}
      </Txt>
    </View>
  );
}
