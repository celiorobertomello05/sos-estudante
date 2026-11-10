import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen, { GlassButton, Hero, HeroStat, useBackAction } from "../../components/Screen";
import { Avatar, Button, Card, ListRow, Row, Txt } from "../../components/ui";
import { roleLabels } from "../../domain/labels";
import { isOpenRequest } from "../../domain/rules";
import { useNav } from "../../navigation/Navigator";
import { useApp, useProfile } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { chooseImage } from "../../utils/media";
import { styles } from "./styles";

export function ProfileScreen() {
  const app = useApp();
  const { go, reset } = useNav();
  const onBack = useBackAction();
  const profile = useProfile();
  const role = profile.role;

  const stats: [string | number, string][] =
    role === "student"
      ? [
          [app.requests.filter((r) => isOpenRequest(r.status)).length, "Pedidos"],
          [app.requests.filter((r) => r.status === "delivered").length, "Retiradas"],
          [app.enrollment?.status === "verified" ? "Ativo" : "Pendente", "Matrícula"],
        ]
      : role === "donor"
        ? [
            [app.donations.length, "Doações"],
            [app.donations.filter((d) => d.status === "stocked").reduce((s, d) => s + d.quantity, 0), "Itens"],
            [profile.status === "active" ? "Ativo" : "Análise", "Cadastro"],
          ]
        : [
            [app.deliveries.length + app.requests.filter((r) => r.status === "delivered").length, "Entregas"],
            [app.movements.length, "Movimentos"],
            [profile.status === "active" ? "Ativo" : "Análise", "Cadastro"],
          ];

  const changePhoto = () =>
    chooseImage(async (uri) => {
      const result = await app.updateProfile(
        { fullName: profile.fullName, phone: profile.phone ?? "", postalCode: profile.postalCode ?? "", address: profile.address ?? "" },
        uri,
      );
      if (!result.ok) Alert.alert("Erro", result.error);
    }, true);

  const logout = () =>
    Alert.alert("Sair da conta?", "Você precisará entrar novamente.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await app.signOut();
          reset({ name: "login" });
        },
      },
    ]);

  return (
    <Screen
      hero={
        <Hero onBack={onBack} right={<GlassButton icon="settings-outline" label="Configurações" onPress={() => go({ name: "settings" })} />} title="Meu Perfil">
          <Row>
            <Pressable accessibilityLabel="Alterar foto" accessibilityRole="button" onPress={changePhoto}>
              <Avatar light name={profile.fullName} size={64} uri={profile.avatarUri} />
              <View style={styles.cameraBadge}>
                <Ionicons color={colors.brand700} name="camera" size={12} />
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="h2" color={colors.white}>
                {profile.fullName}
              </Txt>
              <View style={styles.rolePill}>
                <Txt variant="small" color={colors.white}>
                  {roleLabels[role].short}
                </Txt>
              </View>
              <Txt variant="small" color="rgba(255,255,255,0.8)">
                {profile.email}
              </Txt>
            </View>
          </Row>
          <Row gap={spacing.sm}>
            {stats.map(([value, label]) => (
              <HeroStat key={label} label={label} value={value} />
            ))}
          </Row>
        </Hero>
      }
      tabs
    >
      <Card padded={false}>
        <Txt variant="caption" style={styles.groupTitle}>
          Minha conta
        </Txt>
        <ListRow flat icon="person-outline" onPress={() => go({ name: "personal-data" })} title="Dados pessoais" />
        <ListRow flat icon="time-outline" onPress={() => go({ name: "history" })} title="Histórico de atividades" />
        <ListRow flat icon="document-attach-outline" onPress={() => go({ name: "documents" })} title="Meus documentos" />
        {role === "student" ? <ListRow flat icon="school-outline" onPress={() => go({ name: "enrollment" })} title="Escola e matrícula" /> : null}
        {role === "donor" ? <ListRow flat icon="analytics-outline" onPress={() => go({ name: "impact-map" })} title="Impacto das doações" /> : null}
        {role === "collector" ? <ListRow flat icon="stats-chart-outline" onPress={() => go({ name: "admin" })} title="Painel administrativo" /> : null}
      </Card>
      <Card padded={false}>
        <Txt variant="caption" style={styles.groupTitle}>
          Configurações
        </Txt>
        <ListRow flat icon="notifications-outline" onPress={() => go({ name: "notifications" })} title="Notificações" />
        <ListRow flat icon="eye-outline" onPress={() => go({ name: "security" })} title="Privacidade e segurança" />
        <ListRow flat icon="settings-outline" onPress={() => go({ name: "settings" })} title="Configurações gerais" />
        <ListRow flat icon="help-circle-outline" onPress={() => go({ name: "help" })} title="Central de ajuda" />
        <ListRow flat icon="information-circle-outline" onPress={() => go({ name: "about" })} title="Sobre o SOS Estudante" />
      </Card>
      <Button icon="log-out-outline" label="Sair da conta" onPress={logout} variant="secondary" />
    </Screen>
  );
}
