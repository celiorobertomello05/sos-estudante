import { Pressable, View } from "react-native";
import Screen, { GlassButton, Hero, HeroStat } from "../../components/Screen";
import { Avatar, ListRow, Notice, Row, Txt } from "../../components/ui";
import type { UserRole } from "../../domain/models";
import { inactiveAccountNotice } from "../../domain/rules";
import { useNav } from "../../navigation/Navigator";
import { useApp, useProfile } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { firstName } from "../../utils/format";
import { dashboardContent } from "./dashboardContent";
import { CollectorHome, DonorHome, StudentHome } from "./RoleHomes";
import { Shortcuts } from "./Shortcuts";

/** Bloco específico de cada papel. */
const roleHome: Record<UserRole, () => React.JSX.Element> = {
  student: StudentHome,
  donor: DonorHome,
  collector: CollectorHome,
};

export default function DashboardScreen() {
  const app = useApp();
  const { go } = useNav();
  const profile = useProfile();
  const unread = app.settings.pushEnabled && app.notifications.some((n) => !n.read);
  const inactiveNotice = inactiveAccountNotice(profile.role, profile.status);
  const { subtitle, stats, shortcuts } = dashboardContent[profile.role](app);
  const RoleHome = roleHome[profile.role];

  return (
    <Screen
      hero={
        <Hero>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt color="rgba(255,255,255,0.8)">Olá,</Txt>
              <Txt variant="display" color={colors.white}>
                {firstName(profile.fullName)}
              </Txt>
              <Txt variant="small" color="rgba(255,255,255,0.8)">
                {subtitle}
              </Txt>
            </View>
            <Row gap={spacing.sm}>
              <GlassButton badge={unread} icon="notifications-outline" label="Notificações" onPress={() => go({ name: "notifications" })} />
              <Pressable accessibilityLabel="Meu perfil" accessibilityRole="button" onPress={() => go({ name: "profile" })}>
                <Avatar light name={profile.fullName} size={38} uri={profile.avatarUri} />
              </Pressable>
            </Row>
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
      {app.isDemo ? <Notice icon="flask-outline" title="Modo demonstração" body="Dados de exemplo. Nada é enviado ao servidor." /> : null}
      {inactiveNotice ? (
        <Notice
          tone={profile.status === "blocked" ? "rose" : "amber"}
          icon={profile.status === "blocked" ? "lock-closed-outline" : "time-outline"}
          title={inactiveNotice.title}
          body={inactiveNotice.body}
        />
      ) : null}
      {profile.role === "student" && app.enrollment?.status !== "verified" ? (
        <ListRow icon="school-outline" title="Valide sua matrícula" detail="Necessário para solicitar uniformes e materiais" tone="amber" onPress={() => go({ name: "enrollment" })} />
      ) : null}

      <Shortcuts items={shortcuts} />
      <RoleHome />
    </Screen>
  );
}
