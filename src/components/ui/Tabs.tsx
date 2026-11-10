import { Pressable, View } from "react-native";
import { colors } from "../../theme";
import { Txt } from "./Txt";
import { s } from "./styles";

export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={s.tabs}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[s.tab, active && s.tabActive]}
          >
            <Txt variant="label" color={active ? colors.brand700 : colors.ink500}>
              {option.label}
              {option.count !== undefined ? ` (${option.count})` : ""}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
