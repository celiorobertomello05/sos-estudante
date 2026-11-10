import { useContext, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { TextScaleContext, Txt } from "./Txt";
import { s } from "./styles";

export function Field({
  label,
  error,
  hint,
  secure,
  required,
  ...input
}: TextInputProps & { label: string; error?: string | null; hint?: string; secure?: boolean; required?: boolean }) {
  const [hidden, setHidden] = useState(true);
  const scale = useContext(TextScaleContext);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">
        {label}
        {required ? " *" : ""}
      </Txt>
      <View style={[s.input, error ? { borderColor: colors.rose500 } : null, input.multiline && { minHeight: 88, alignItems: "flex-start" }]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.ink400}
          secureTextEntry={secure && hidden}
          {...input}
          style={[s.inputText, { fontSize: 15 * scale }, input.multiline && { textAlignVertical: "top", paddingTop: 12 }]}
        />
        {secure ? (
          <Pressable
            accessibilityLabel={hidden ? "Mostrar senha" : "Ocultar senha"}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setHidden(!hidden)}
          >
            <Ionicons color={colors.ink400} name={hidden ? "eye-outline" : "eye-off-outline"} size={20} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Txt variant="small" color={colors.rose500}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small">{hint}</Txt>
      ) : null}
    </View>
  );
}
