import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Card, EmptyState, Row, Txt } from "../../components/ui";
import type { IconName } from "../../components/ui";
import type { AppNotification } from "../../domain/models";
import { useApp } from "../../store/AppStore";
import { colors, tones } from "../../theme";
import type { Tone } from "../../theme";
import { relativeTime } from "../../utils/format";
import { styles } from "./styles";

const notificationMeta: Record<AppNotification["kind"], { icon: IconName; tone: Tone }> = {
  success: { icon: "checkmark", tone: "brand" },
  info: { icon: "cube-outline", tone: "trust" },
  reminder: { icon: "notifications-outline", tone: "amber" },
};

export function NotificationsScreen() {
  const app = useApp();
  const list = app.notifications.filter((n) => app.settings.pickupReminders || n.kind !== "reminder");
  const unread = list.some((n) => !n.read);
  return (
    <Screen
      right={
        unread ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => app.markAllRead()} style={styles.markRead}>
            <Txt variant="small" color={colors.brand700}>
              Marcar lidas
            </Txt>
          </Pressable>
        ) : undefined
      }
      title="Notificações"
    >
      {list.length === 0 ? <EmptyState body="Avisos sobre pedidos, doações e retiradas aparecem aqui." icon="notifications-outline" title="Nenhuma notificação" /> : null}
      {list.map((n) => {
        const meta = notificationMeta[n.kind];
        return (
          <Card key={n.id} style={!n.read ? { borderColor: tones[meta.tone].border, backgroundColor: tones[meta.tone].bg } : undefined}>
            <Row style={{ alignItems: "flex-start" }}>
              <View style={[styles.notifIcon, { borderColor: tones[meta.tone].border }]}>
                <Ionicons color={tones[meta.tone].fg} name={meta.icon} size={16} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Txt variant="title" style={{ flex: 1 }}>
                    {n.title}
                  </Txt>
                  <Txt variant="small">{relativeTime(n.createdAt)}</Txt>
                </Row>
                <Txt variant="small">{n.body}</Txt>
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
