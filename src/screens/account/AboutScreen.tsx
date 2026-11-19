import { useState } from "react";
import { Linking, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Brand from "../../components/Brand";
import Screen from "../../components/Screen";
import { Button, Card, Row, Txt } from "../../components/ui";
import { env } from "../../config/env";
import { colors, spacing } from "../../theme";

const steps = [
  { icon: "heart-outline", title: "Doadores", body: "Entregam uniformes e materiais em bom estado nos pontos parceiros." },
  { icon: "funnel-outline", title: "Triagem", body: "A equipe confere estado, higienização e tamanho antes de ir para o estoque." },
  { icon: "school-outline", title: "Estudantes", body: "Alunos da rede pública com matrícula e CadÚnico validados solicitam os itens." },
  { icon: "cube-outline", title: "Retirada", body: "O distribuidor entrega no ponto escolhido, com código, foto e assinatura." },
] as const;

const docs = {
  terms: [
    "O SOS Estudante conecta doadores, pontos parceiros e estudantes. Os itens são gratuitos e não podem ser vendidos nem trocados.",
    "Cada usuário é responsável pela veracidade dos dados e dos documentos que envia. Informações falsas podem levar à recusa do pedido e à suspensão da conta.",
    "O acesso aos itens segue regras de elegibilidade: matrícula ativa, CadÚnico, limite anual de 2 camisas e 1 kit e carência de 6 meses por categoria.",
    "A disponibilidade depende do estoque. Aprovar um pedido reserva as peças para o aluno; a baixa do estoque acontece na entrega.",
    "Contas com uso indevido, tentativa de fraude ou conduta ofensiva podem ser bloqueadas.",
  ],
  privacy: [
    "Coletamos somente o necessário para validar cadastros, organizar doações e entregas e prevenir fraudes (LGPD, arts. 6º e 7º).",
    "Seus documentos, fotos e assinaturas ficam em armazenamento privado, em servidor no Brasil, e só são abertos por links temporários.",
    "Distribuidores não acessam seu CPF e só veem seus documentos enquanto a validação está pendente. Doadores não veem dados de alunos.",
    "A localização e os endereços de casa e escola são usados só no aparelho para calcular distâncias; não são enviados ao servidor.",
    "Não vendemos nem compartilhamos seus dados para publicidade.",
    "Você pode pedir confirmação, acesso, correção, bloqueio, eliminação ou portabilidade dos dados (art. 18) em Central de ajuda > Falar com o atendimento. Respondemos em até 15 dias.",
    "Menores de 18 anos usam o aplicativo com o consentimento de um responsável legal (art. 14).",
  ],
};

export function AboutScreen() {
  const [open, setOpen] = useState<"terms" | "privacy" | null>(null);
  return (
    <Screen title="Sobre">
      <View style={{ alignItems: "center", marginTop: spacing.lg }}>
        <Brand full size={120} />
      </View>
      <Txt center>Conectando doações, estudantes e comunidades para garantir dignidade e acesso à educação.</Txt>

      <Card>
        <Txt variant="h2">Nossa missão</Txt>
        <Txt>
          A falta de uniforme e de material escolar pode pesar no dia a dia de estudantes da rede pública. O SOS Estudante organiza doações de forma transparente, para que cada peça chegue a quem precisa, com segurança e
          respeito à privacidade.
        </Txt>
      </Card>

      <Txt variant="h2">Como funciona</Txt>
      {steps.map((s, i) => (
        <Card key={s.title}>
          <Row style={{ alignItems: "flex-start" }}>
            <Ionicons color={colors.brand600} name={s.icon} size={22} />
            <View style={{ flex: 1 }}>
              <Txt variant="title">
                {i + 1}. {s.title}
              </Txt>
              <Txt variant="small">{s.body}</Txt>
            </View>
          </Row>
        </Card>
      ))}

      {(["terms", "privacy"] as const).map((key) => (
        <Card key={key} onPress={() => setOpen(open === key ? null : key)}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="title">{key === "terms" ? "Termos de uso" : "Política de privacidade"}</Txt>
            <Ionicons color={colors.ink400} name={open === key ? "chevron-up" : "chevron-down"} size={18} />
          </Row>
          {open === key ? docs[key].map((p) => <Txt key={p} variant="small">{`• ${p}`}</Txt>) : null}
        </Card>
      ))}

      <Card>
        <Txt variant="h2">Fale com a gente</Txt>
        <Txt variant="small">Dúvidas, sugestões ou pedidos sobre seus dados: use a Central de ajuda ou escreva para o e-mail de suporte.</Txt>
        <Button icon="mail-outline" label={env.supportEmail} onPress={() => Linking.openURL(`mailto:${env.supportEmail}`)} variant="ghost" />
      </Card>

      <Txt center variant="small">
        Versão 1.0.0 · Android e iOS
      </Txt>
    </Screen>
  );
}
