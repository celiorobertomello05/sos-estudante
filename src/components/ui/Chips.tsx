import { Pressable, View } from "react-native";
import { colors, spacing } from "../../theme";
import { Txt } from "./Txt";
import { s } from "./styles";

export function Chips<T extends string>({
  options,
  value,
  onChange,
  dark,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  dark?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[s.chip, active && { backgroundColor: dark ? colors.ink900 : colors.brand600, borderColor: dark ? colors.ink900 : colors.brand600 }]}
          >
            <Txt variant="label" color={active ? colors.white : colors.ink700}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
