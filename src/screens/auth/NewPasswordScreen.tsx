import { useState } from "react";
import { Alert } from "react-native";
import Screen from "../../components/Screen";
import { Button, Field, Txt } from "../../components/ui";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { passwordIssue } from "../../utils/validation";

/** Aberta pelo link "redefinir senha" do e-mail, já com sessão válida. */
export function NewPasswordScreen() {
  const app = useApp();
  const { reset } = useNav();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const issue = passwordIssue(password);
    if (issue) return setError(issue);
    if (password !== confirm) return setError("As senhas não conferem.");
    setLoading(true);
    const result = await app.changePassword(password);
    setLoading(false);
    if (!result.ok) return setError(result.error ?? null);
    Alert.alert("Senha redefinida", "Sua nova senha já está valendo.");
    reset({ name: "dashboard" });
  };

  return (
    <Screen title="Criar nova senha">
      <Txt>Escolha uma nova senha para a sua conta.</Txt>
      <Field label="Nova senha" onChangeText={(v) => (setPassword(v), setError(null))} secure value={password} />
      <Field error={error} label="Confirmar nova senha" onChangeText={(v) => (setConfirm(v), setError(null))} secure value={confirm} />
      <Button label="Salvar nova senha" loading={loading} onPress={submit} />
    </Screen>
  );
}
