import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../theme";
import { Txt } from "./Txt";
import { s } from "./styles";

export function Timeline({ steps }: { steps: { label: string; detail?: string; done: boolean }[] }) {
  return (
    <View>
      {steps.map((step, index) => (
        <View key={step.label} style={s.timelineRow}>
          <View style={{ alignItems: "center" }}>
            <View style={[s.timelineDot, step.done && s.timelineDotDone]}>
              {step.done ? <Ionicons color={colors.white} name="checkmark" size={13} /> : null}
            </View>
            {index < steps.length - 1 ? <View style={[s.timelineLine, step.done && { backgroundColor: colors.brand600 }]} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: spacing.lg }}>
            <Txt variant="title" color={step.done ? colors.ink900 : colors.ink400}>
              {step.label}
            </Txt>
            <Txt variant="small">{step.detail ?? "—"}</Txt>
          </View>
        </View>
      ))}
    </View>
  );
}
