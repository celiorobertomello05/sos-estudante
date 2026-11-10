import { useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Button, Card, Divider, Field, ListRow, Pill, Txt } from "../../components/ui";
import { env } from "../../config/env";
import { useApp } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { formatDate } from "../../utils/format";
import { cleanText } from "../../utils/validation";
import { styles } from "./styles";

const faq = [
  { q: "Quem pode solicitar itens?", a: "Alunos da rede pública com matrícula ativa validada. Cada pedido aceita até 5 itens, com até 5 unidades cada, e até 3 pedidos em andamento." },
  { q: "Como funciona a retirada?", a: "Quando o pedido fica pronto, você recebe um código de 4 dígitos. Mostre-o ao distribuidor no ponto escolhido, que registra foto dos itens e sua assinatura." },
  { q: "Como faço uma doação?", a: "Em Doar, escolha categoria, tamanho, quantidade e conservação, selecione o ponto parceiro e o horário. A entrega é feita por você no ponto." },
  { q: "O que acontece na triagem?", a: "A equipe confere estado, higienização e tamanho. Itens aprovados vão para o estoque; recusados recebem uma observação explicando o motivo." },
  { q: "Meus documentos ficam seguros?", a: "Sim. Os arquivos ficam em armazenamento privado e só a equipe de validação tem acesso temporário a eles." },
  { q: "Esqueci minha senha", a: "Na tela de login, toque em “Esqueci minha senha” e siga o link enviado ao seu e-mail." },
];

export function HelpScreen() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const q = query.trim().toLowerCase();
  const list = faq.filter((f) => !q || `${f.q} ${f.a}`.toLowerCase().includes(q));

  const send = async () => {
    if (cleanText(subject).length < 3 || cleanText(message).length < 10) {
      return Alert.alert("Mensagem incompleta", "Informe o assunto e descreva sua dúvida (mínimo de 10 caracteres).");
    }
    setLoading(true);
    const result = await app.openTicket(cleanText(subject, 80), cleanText(message, 1000));
    setLoading(false);
    if (!result.ok) return Alert.alert("Erro", result.error);
    setSubject("");
    setMessage("");
    Alert.alert("Atendimento registrado", `Protocolo ${result.value}. A resposta chega pelas notificações do aplicativo.`);
  };

  return (
    <Screen title="Central de ajuda">
      <Field label="Como podemos ajudar?" onChangeText={setQuery} placeholder="Buscar uma dúvida" value={query} />
      <Card padded={false}>
        {list.length === 0 ? (
          <Txt style={{ padding: spacing.lg }}>Nenhuma dúvida encontrada. Fale com o atendimento abaixo.</Txt>
        ) : (
          list.map((f, i) => (
            <View key={f.q}>
              {i > 0 ? <Divider /> : null}
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === f.q }} onPress={() => setOpen(open === f.q ? null : f.q)} style={styles.faqRow}>
                <Txt style={{ flex: 1 }} variant="title">
                  {f.q}
                </Txt>
                <Ionicons color={colors.ink400} name={open === f.q ? "chevron-up" : "chevron-down"} size={18} />
              </Pressable>
              {open === f.q ? <Txt style={{ paddingBottom: spacing.lg, paddingHorizontal: spacing.lg }}>{f.a}</Txt> : null}
            </View>
          ))
        )}
      </Card>
      <Card>
        <Txt variant="h2">Falar com o atendimento</Txt>
        <Field label="Assunto" maxLength={80} onChangeText={setSubject} value={subject} />
        <Field label="Mensagem" maxLength={1000} multiline onChangeText={setMessage} value={message} />
        <Button label="Enviar mensagem" loading={loading} onPress={send} />
        <Button icon="mail-outline" label={env.supportEmail} onPress={() => Linking.openURL(`mailto:${env.supportEmail}`)} variant="ghost" />
      </Card>
      {app.tickets.length ? (
        <>
          <Txt variant="h2">Seus atendimentos</Txt>
          {app.tickets.map((t) => (
            <ListRow detail={`${t.protocol} · ${formatDate(t.createdAt)}`} icon="chatbubble-ellipses-outline" key={t.id} title={t.subject} tone="trust" trailing={<Pill label="Aberto" tone="amber" />} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
