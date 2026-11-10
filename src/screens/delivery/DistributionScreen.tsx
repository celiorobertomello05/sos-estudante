import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Avatar, Card, Chips, EmptyState, Pill, Row, Txt } from "../../components/ui";
import { requestStatusMeta } from "../../domain/labels";
import type { RequestStatus } from "../../domain/models";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { formatDateTime } from "../../utils/format";
import { itemsSummary, nextRequestAction } from "../../utils/requestPresentation";
import { styles } from "./styles";

type Filter = "all" | RequestStatus;

export function DistributionScreen() {
  const app = useApp();
  const { go } = useNav();
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = new Date().toDateString();
  const active = app.requests.filter((r) => r.status !== "delivered" && r.status !== "cancelled");
  const list = filter === "all" ? active : active.filter((r) => r.status === filter);
  const deliveredToday = app.deliveries.filter((d) => new Date(d.deliveredAt).toDateString() === today).length;

  const advance = async (id: string, to: RequestStatus) => {
    setBusyId(id);
    const result = await app.advanceRequest(id, to);
    setBusyId(null);
    if (!result.ok) Alert.alert("Erro", result.error);
  };

  return (
    <Screen tabs title="Distribuição">
      <Card padded={false}>
        <Row style={{ padding: spacing.lg }}>
          <View style={styles.routeIcon}>
            <Ionicons color={colors.brand700} name="car-outline" size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="title">Rota de distribuição</Txt>
            <Txt variant="small">
              {active.length} entregas programadas · {deliveredToday} concluídas hoje
            </Txt>
          </View>
        </Row>
        <Row gap={0} style={{ borderTopColor: colors.ink100, borderTopWidth: 1 }}>
          {[
            [active.filter((r) => r.status === "ready").length, "Prontas", colors.brand700, colors.brand50],
            [active.filter((r) => r.status === "separating").length, "Separando", colors.amber500, colors.amber50],
            [deliveredToday, "Entregues hoje", colors.trust600, colors.trust50],
          ].map(([value, label, fg, bg]) => (
            <View key={String(label)} style={[styles.stat, { backgroundColor: String(bg) }]}>
              <Txt variant="h1" center color={String(fg)}>
                {value}
              </Txt>
              <Txt variant="small" center>
                {label}
              </Txt>
            </View>
          ))}
        </Row>
      </Card>
      <Chips
        onChange={setFilter}
        options={[
          { value: "all", label: "Todas" },
          { value: "ready", label: "Prontas" },
          { value: "separating", label: "Separando" },
          { value: "approved", label: "Aprovadas" },
          { value: "in_review", label: "Em análise" },
        ]}
        value={filter}
      />
      {list.length === 0 ? <EmptyState body="Nenhuma solicitação nesta etapa." icon="checkmark-done-outline" title="Tudo entregue" /> : null}
      {list.map((r) => {
        const meta = requestStatusMeta[r.status];
        const action = nextRequestAction[r.status];
        const point = app.points.find((p) => p.id === r.pointId);
        return (
          <Card key={r.id} padded={false}>
            <Pressable accessibilityRole="button" onPress={() => go({ name: "request-detail", id: r.id })} style={{ flexDirection: "row", gap: spacing.md, padding: spacing.lg }}>
              <Avatar name={r.studentName} />
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Txt variant="title">{r.studentName}</Txt>
                  <Pill dot label={meta.label} tone={meta.tone} />
                </Row>
                <Txt variant="small">{r.schoolName}</Txt>
                <Txt variant="label">{itemsSummary(r.items)}</Txt>
                <Txt variant="small">
                  {formatDateTime(r.pickupAt)} · {point?.name}
                </Txt>
                <Row gap={4}>
                  <Ionicons color={colors.ink400} name="eye-off-outline" size={12} />
                  <Txt variant="small" color={colors.ink400}>
                    Contato protegido {r.contactMasked}
                  </Txt>
                </Row>
              </View>
            </Pressable>
            <View style={styles.actions}>
              {action ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busyId === r.id }}
                  disabled={busyId === r.id}
                  onPress={() => advance(r.id, action.to)}
                  style={styles.action}
                >
                  <Ionicons color={colors.trust600} name="cube-outline" size={16} />
                  <Txt variant="label" color={colors.trust600}>
                    {action.label.replace(" solicitação", "")}
                  </Txt>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: r.status !== "ready" }}
                disabled={r.status !== "ready"}
                onPress={() => go({ name: "delivery", id: r.id })}
                style={[styles.action, r.status !== "ready" && { opacity: 0.4 }]}
              >
                <Ionicons color={colors.brand700} name="checkmark" size={16} />
                <Txt variant="label" color={colors.brand700}>
                  Confirmar entrega
                </Txt>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
