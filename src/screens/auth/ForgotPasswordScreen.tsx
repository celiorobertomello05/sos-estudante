import { useState } from "react";
import Screen from "../../components/Screen";
import { Button, Field, Notice, Txt } from "../../components/ui";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { isValidEmail } from "../../utils/validation";

export function ForgotPasswordScreen() {
  const app = useApp();
  const { back } = useNav();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!isValidEmail(email)) return setError("Informe um e-mail válido.");
    setLoading(true);
    const result = await app.resetPassword(email);
    setLoading(false);
    // Mesma mensagem com ou sem conta, para não revelar quem está cadastrado.
    if (!result.ok && !/conexão/.test(result.error ?? "")) return setSent(true);
    if (!result.ok) return setError(result.error ?? null);
    setSent(true);
  };

  return (
    <Screen title="Recuperar senha">
      {sent ? (
        <>
          <Notice tone="brand" icon="mail-outline" title="Verifique seu e-mail" body="Se houver uma conta com esse endereço, você receberá um link para criar uma nova senha." />
          <Button label="Voltar ao login" onPress={back} />
        </>
      ) : (
        <>
          <Txt>Informe o e-mail da sua conta. Enviaremos um link seguro para redefinir a senha.</Txt>
          <Field autoCapitalize="none" error={error} keyboardType="email-address" label="E-mail" onChangeText={(v) => (setEmail(v), setError(null))} value={email} />
          <Button label="Enviar link" loading={loading} onPress={submit} />
        </>
      )}
    </Screen>
  );
}
