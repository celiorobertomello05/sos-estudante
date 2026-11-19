import { useContext, useEffect, useId, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { useFocusChain } from "./FocusChain";
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
  const id = useId();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const chain = useFocusChain();
  const register = chain?.register;
  const chained = Boolean(register) && !input.multiline;

  useEffect(() => (chained && register ? register({ id, ref: inputRef }) : undefined), [chained, register, id]);

  const position = chained && chain ? chain.fields.findIndex((field) => field.id === id) : -1;
  const hasNext = chain !== null && position >= 0 && position < chain.fields.length - 1;
  const isEmail = input.keyboardType === "email-address";

  /** "Próximo" leva ao campo seguinte; no último, o teclado recolhe sozinho. */
  const handleSubmit: TextInputProps["onSubmitEditing"] = (event) => {
    if (input.onSubmitEditing) return input.onSubmitEditing(event);
    if (!chain || position < 0) return;
    chain.fields[position + 1]?.ref.current?.focus();
  };

  const keyboardBehavior = input.multiline
    ? {}
    : {
        returnKeyType: input.returnKeyType ?? (hasNext ? ("next" as const) : input.onSubmitEditing ? ("go" as const) : ("done" as const)),
        submitBehavior: input.submitBehavior ?? (hasNext ? ("submit" as const) : ("blurAndSubmit" as const)),
      };

  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">
        {label}
        {required ? " *" : ""}
      </Txt>
      <View style={[s.input, error ? { borderColor: colors.rose500 } : null, input.multiline && { minHeight: 88, alignItems: "flex-start" }]}>
        <TextInput
          accessibilityLabel={label}
          autoComplete={input.autoComplete ?? (secure ? "password" : isEmail ? "email" : undefined)}
          placeholderTextColor={colors.ink400}
          secureTextEntry={secure && hidden}
          textContentType={input.textContentType ?? (secure ? "password" : isEmail ? "emailAddress" : undefined)}
          {...input}
          {...keyboardBehavior}
          onSubmitEditing={input.multiline ? input.onSubmitEditing : handleSubmit}
          ref={inputRef}
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
