import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Brand from "../../components/Brand";
import Screen from "../../components/Screen";
import { Card, Row, Txt } from "../../components/ui";
import { colors, spacing } from "../../theme";

export function AboutScreen() {
  const [open, setOpen] = useState<"terms" | "privacy" | null>(null);
  const docs = {
    terms: "O SOS Estudante conecta doadores, pontos parceiros e estudantes. Os itens são gratuitos e não podem ser revendidos. Cada usuário é responsável pela veracidade dos dados informados. Contas com uso indevido podem ser suspensas.",
    privacy: "Coletamos apenas os dados necessários para validar cadastros e organizar entregas (LGPD, art. 7º). Documentos ficam em armazenamento privado. Distribuidores não acessam CPF nem documentos. Você pode pedir acesso, correção ou exclusão dos seus dados pela Central de ajuda.",
  };
  return (
    <Screen title="Sobre">
      <View style={{ alignItems: "center", marginTop: spacing.lg }}>
        <Brand full size={120} />
      </View>
      <Txt center>Conectando doações, estudantes e comunidades para garantir dignidade e acesso à educação.</Txt>
      {(["terms", "privacy"] as const).map((key) => (
        <Card key={key} onPress={() => setOpen(open === key ? null : key)}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="title">{key === "terms" ? "Termos de uso" : "Política de privacidade"}</Txt>
            <Ionicons color={colors.ink400} name={open === key ? "chevron-up" : "chevron-down"} size={18} />
          </Row>
          {open === key ? <Txt variant="small">{docs[key]}</Txt> : null}
        </Card>
      ))}
      <Txt center variant="small">
        Versão 1.0.0 · Android e iOS
      </Txt>
    </Screen>
  );
}
