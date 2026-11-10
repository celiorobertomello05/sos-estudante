import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Screen from "../../components/Screen";
import { categoryIcons } from "../../components/icons";
import { Card, EmptyState, Row, Tabs, Txt } from "../../components/ui";
import type { IconName } from "../../components/ui";
import { categoryLabels, movementMeta } from "../../domain/labels";
import { useNav } from "../../navigation/Navigator";
import { useApp, useProfile } from "../../store/AppStore";
import { colors, tones } from "../../theme";
import type { Tone } from "../../theme";
import { formatDate } from "../../utils/format";
import { itemsSummary } from "../../utils/requestPresentation";
import { styles } from "./styles";

interface HistoryEntry {
  id: string;
  title: string;
  detail: string;
  date: string;
  icon: IconName;
  tone: Tone;
  done: boolean;
}

export function HistoryScreen() {
  const app = useApp();
  const { go } = useNav();
  const { role } = useProfile();
  const [tab, setTab] = useState<"done" | "all">("done");
  const pointName = (id: string) => app.points.find((p) => p.id === id)?.name ?? "";

  let entries: HistoryEntry[] = [];
  let headline = "";
  if (role === "student") {
    const list = tab === "done" ? app.requests.filter((r) => r.status === "delivered") : app.requests;
    entries = list.map((r) => ({ id: r.id, title: itemsSummary(r.items), detail: `${r.status === "delivered" ? "Retirado" : "Retirada"} no ${pointName(r.pointId)}`, date: r.pickupAt, icon: categoryIcons[r.items[0]?.category ?? "kit"], tone: "brand", done: r.status === "delivered" }));
    const total = app.requests.filter((r) => r.status === "delivered").reduce((s, r) => s + r.items.reduce((a, i) => a + i.quantityApproved, 0), 0);
    headline = `${total} itens recebidos em ${app.requests.filter((r) => r.status === "delivered").length} retiradas`;
  } else if (role === "donor") {
    const list = tab === "done" ? app.donations.filter((d) => d.status === "stocked" || d.status === "approved") : app.donations;
    entries = list.map((d) => ({ id: d.id, title: `${d.quantity}× ${categoryLabels[d.category]} — Tam. ${d.size}`, detail: `Protocolo ${d.protocol} · ${pointName(d.pointId)}`, date: d.createdAt, icon: categoryIcons[d.category], tone: "trust", done: d.status === "stocked" || d.status === "approved" }));
    headline = `${app.donations.filter((d) => d.status === "stocked").reduce((s, d) => s + d.quantity, 0)} itens já estão ajudando estudantes`;
  } else {
    entries =
      tab === "done"
        ? app.requests.filter((r) => r.status === "delivered").map((r) => ({ id: r.id, title: `Entrega para ${r.studentName}`, detail: itemsSummary(r.items), date: r.pickupAt, icon: "checkmark-circle-outline", tone: "brand", done: true }))
        : app.movements.map((m) => ({ id: m.id, title: `${movementMeta[m.type].label} · ${m.label}`, detail: `${m.from} → ${m.to} · ${m.responsible}`, date: m.createdAt, icon: "swap-horizontal-outline", tone: movementMeta[m.type].tone, done: true }));
    headline = `${app.deliveries.length + app.requests.filter((r) => r.status === "delivered").length} entregas registradas`;
  }

  const tabLabels = role === "student" ? ["Recebidos", "Solicitações"] : role === "donor" ? ["Aprovadas", "Todas"] : ["Entregas", "Movimentações"];

  return (
    <Screen tabs title={role === "student" ? "Seus pedidos" : "Histórico"}>
      <LinearGradient colors={[colors.brand800, colors.brand600]} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={styles.historyHero}>
        <View style={styles.historyIcon}>
          <Ionicons color={colors.white} name="cube-outline" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="title" color={colors.white}>
            {role === "donor" ? "Suas doações" : role === "student" ? "Itens que você recebeu" : "Sua operação"}
          </Txt>
          <Txt variant="small" color="rgba(255,255,255,0.8)">
            {headline}
          </Txt>
        </View>
      </LinearGradient>
      <Tabs onChange={setTab} options={[{ value: "done", label: tabLabels[0] }, { value: "all", label: tabLabels[1] }]} value={tab} />
      {entries.length === 0 ? <EmptyState body="Quando houver atividade, ela aparece aqui." icon="time-outline" title="Sem registros" /> : null}
      {entries.map((e) => (
        <Card key={e.id} onPress={role !== "donor" && tab === "all" && role === "student" ? () => go({ name: "request-detail", id: e.id }) : undefined}>
          <Row style={{ alignItems: "flex-start" }}>
            <View style={[styles.historyThumb, { backgroundColor: tones[e.tone].bg }]}>
              <Ionicons color={tones[e.tone].fg} name={e.icon} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="title" numberOfLines={1}>
                {e.title}
              </Txt>
              <Txt variant="small">{e.detail}</Txt>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Txt variant="small">{formatDate(e.date)}</Txt>
              {e.done ? <Ionicons color={colors.brand600} name="checkmark-circle" size={18} /> : null}
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
