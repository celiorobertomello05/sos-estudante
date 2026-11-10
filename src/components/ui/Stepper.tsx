import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { Txt } from "./Txt";
import { s } from "./styles";

export function Stepper({ value, onChange, min = 1, max }: { value: number; onChange: (value: number) => void; min?: number; max: number }) {
  return (
    <View style={s.stepper}>
      <Pressable
        accessibilityLabel="Diminuir"
        accessibilityRole="button"
        accessibilityState={{ disabled: value <= min }}
        disabled={value <= min}
        hitSlop={6}
        onPress={() => onChange(value - 1)}
        style={s.stepperButton}
      >
        <Ionicons color={value <= min ? colors.ink300 : colors.brand700} name="remove" size={18} />
      </Pressable>
      <Txt variant="title" style={{ minWidth: 28, textAlign: "center" }}>
        {value}
      </Txt>
      <Pressable
        accessibilityLabel="Aumentar"
        accessibilityRole="button"
        accessibilityState={{ disabled: value >= max }}
        disabled={value >= max}
        hitSlop={6}
        onPress={() => onChange(value + 1)}
        style={s.stepperButton}
      >
        <Ionicons color={value >= max ? colors.ink300 : colors.brand700} name="add" size={18} />
      </Pressable>
    </View>
  );
}
