import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import type { IconName } from "./types";
import { Txt } from "./Txt";
import { s } from "./styles";

/** Opção selecionável em cartão (tipo de usuário, conservação etc.). */
export function OptionCard({
  title,
  detail,
  icon,
  selected,
  onPress,
  style,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.option, selected && s.optionActive, style]}
    >
      {icon ? (
        <View style={[s.optionIcon, selected && { backgroundColor: colors.brand600 }]}>
          <Ionicons color={selected ? colors.white : colors.ink500} name={icon} size={18} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt variant="label" color={selected ? colors.brand800 : colors.ink700}>
          {title}
        </Txt>
        {detail ? <Txt variant="small">{detail}</Txt> : null}
      </View>
      {selected && icon ? <Ionicons color={colors.brand700} name="checkmark" size={18} /> : null}
    </Pressable>
  );
}
