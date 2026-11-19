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
  { q: "Quem pode solicitar itens?", a: "Alunos da rede pública com matrícula ativa e folha resumo do CadÚnico, ambas validadas pela equipe. Cada pedido aceita até 5 itens, com até 5 unidades cada, e até 3 pedidos em andamento." },
  { q: "Existe limite de pedidos?", a: "Sim. Em 12 meses cada aluno pode receber até 2 camisas e 1 kit escolar. Depois de uma entrega, a mesma categoria só pode ser pedida de novo após 6 meses." },
  { q: "Como envio minha matrícula?", a: "Em Perfil > Matrícula, informe escola, número, série e validade e anexe a declaração de matrícula e a folha resumo do CadÚnico. A equipe analisa e avisa o resultado por notificação; se recusar, o motivo aparece na tela." },
  { q: "Como funciona a retirada?", a: "Quando o pedido fica pronto, você recebe um código de 4 dígitos. Mostre-o ao distribuidor no ponto escolhido, que registra a foto dos itens e a sua assinatura." },
  { q: "Meu código de retirada foi bloqueado. E agora?", a: "O código é bloqueado após 5 tentativas erradas. Abra o pedido e gere um código novo; as tentativas voltam a zero. Só você, dono do pedido, pode gerar outro." },
  { q: "Posso cancelar um pedido?", a: "Sim, enquanto ele estiver em análise, aprovado ou em separação. Depois de pronto para retirada, fale com o atendimento." },
  { q: "Como faço uma doação?", a: "Em Doar, escolha categoria, tamanho, quantidade e conservação, selecione o ponto parceiro e o horário. A entrega é feita por você no ponto." },
  { q: "Como ajudo uma necessidade de um estudante?", a: "Em Necessidades, veja os pedidos abertos de forma anônima (item, tamanho, quantidade e bairro), toque em um deles e escolha Demonstrar interesse. O estudante é avisado sem saber quem você é. Depois, faça a doação normalmente em Doar." },
  { q: "O que acontece na triagem?", a: "A equipe confere estado, higienização e tamanho. Itens aprovados vão para o estoque; recusados recebem uma observação explicando o motivo." },
  { q: "Como encontro o ponto mais perto?", a: "Em Locais de retirada, escolha “onde estou”, “casa” ou “escola” e defina o raio de 2 a 20 km. Toque no mapa para ampliá-lo." },
  { q: "Esqueci minha senha", a: "Na tela de login, toque em “Esqueci minha senha” e siga o link enviado ao seu e-mail." },
  { q: "LGPD: quais dados vocês coletam e para quê?", a: "Nome, e-mail, telefone, CPF ou CNPJ, RG, data de nascimento (alunos), CEP e endereço, além dos documentos de matrícula e CadÚnico e da foto e assinatura da retirada. Usamos apenas para validar a elegibilidade, organizar doações e entregas e prevenir fraudes (LGPD, art. 6º e 7º)." },
  { q: "LGPD: quem pode ver os meus dados?", a: "Doadores não veem dados de alunos. Distribuidores não acessam seu CPF e só veem seus documentos enquanto a sua validação está pendente. Cada ação da equipe fica registrada em log de auditoria." },
  { q: "LGPD: onde meus dados ficam guardados?", a: "No Supabase, em servidor no Brasil (São Paulo), com conexão criptografada. Documentos, fotos e assinaturas ficam em armazenamento privado e são abertos por links temporários de 1 hora. Nunca em pasta pública." },
  { q: "LGPD: o aplicativo guarda a minha localização?", a: "Não. A localização e o endereço de casa ou escola são usados só no seu aparelho para calcular a distância até os pontos. Essas coordenadas não são enviadas nem gravadas em nossos servidores." },
  { q: "LGPD: quais são os meus direitos?", a: "Você pode pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação sobre com quem compartilhamos e revogação do consentimento (art. 18). O CPF e o RG só mudam pelo atendimento, para evitar fraude." },
  { q: "LGPD: como exerço esses direitos?", a: "Use “Falar com o atendimento” abaixo, com o assunto “LGPD” e o que você precisa, ou escreva para o e-mail de suporte. Respondemos em até 15 dias, prazo previsto no art. 19 da lei." },
  { q: "LGPD: sou menor de 18 anos. Posso usar o app?", a: "Sim, com o consentimento de um dos pais ou responsável legal, e o tratamento deve atender ao seu melhor interesse (art. 14). Peça ajuda a um responsável no cadastro." },
  { q: "LGPD: e se houver um vazamento?", a: "Em caso de incidente que possa causar risco ou dano, avisamos as pessoas afetadas e a Autoridade Nacional de Proteção de Dados (ANPD), conforme o art. 48." },
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
