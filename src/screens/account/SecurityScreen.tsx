import { useState } from "react";
import { Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Button, Card, Field, Row, Txt } from "../../components/ui";
import type { IconName } from "../../components/ui";
import { useApp } from "../../store/AppStore";
import { colors } from "../../theme";
import { passwordIssue } from "../../utils/validation";

export function SecurityScreen() {
  const app = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const change = async () => {
    const issue = passwordIssue(password);
    if (issue) return setError(issue);
    if (password !== confirm) return setError("As senhas não conferem.");
    setLoading(true);
    const result = await app.changePassword(password);
    setLoading(false);
    if (!result.ok) return setError(result.error ?? null);
    setPassword("");
    setConfirm("");
    setError(null);
    Alert.alert("Senha alterada", app.isDemo ? "Na demonstração nada é salvo." : "Use a nova senha no próximo acesso.");
  };

  const requestDeletion = () =>
    Alert.alert("Excluir conta e dados", "Vamos abrir um pedido de exclusão conforme a LGPD. Registros de entregas podem ser mantidos pelo prazo legal.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Solicitar exclusão",
        style: "destructive",
        onPress: async () => {
          const result = await app.openTicket("Exclusão de conta (LGPD)", "Solicito a exclusão da minha conta e dos meus dados pessoais.");
          Alert.alert(result.ok ? "Pedido registrado" : "Erro", result.ok ? `Protocolo ${result.value}.` : result.error);
        },
      },
    ]);

  return (
    <Screen title="Privacidade e segurança">
      <Card>
        <Txt variant="h2">Como protegemos seus dados</Txt>
        {[
          ["lock-closed-outline", "Documentos ficam em armazenamento privado, sem links públicos."],
          ["eye-off-outline", "Distribuidores veem só nome, escola e telefone mascarado."],
          ["key-outline", "A retirada exige um código pessoal de 4 dígitos."],
          ["phone-portrait-outline", "Sua sessão fica guardada de forma criptografada no aparelho."],
        ].map(([icon, text]) => (
          <Row key={text} style={{ alignItems: "flex-start" }}>
            <Ionicons color={colors.brand700} name={icon as IconName} size={18} />
            <Txt style={{ flex: 1 }} variant="small">
              {text}
            </Txt>
          </Row>
        ))}
      </Card>
      <Card>
        <Txt variant="h2">Alterar senha</Txt>
        <Field label="Nova senha" onChangeText={(v) => (setPassword(v), setError(null))} secure value={password} />
        <Field error={error} label="Confirme a nova senha" onChangeText={(v) => (setConfirm(v), setError(null))} secure value={confirm} />
        <Button label="Atualizar senha" loading={loading} onPress={change} />
      </Card>
      <Button icon="trash-outline" label="Solicitar exclusão da conta" onPress={requestDeletion} variant="ghost" />
    </Screen>
  );
}
