import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Grid from "../../components/Grid";
import Screen, { Hero, useBackAction } from "../../components/Screen";
import { Card, ListRow, Row, Txt } from "../../components/ui";
import type { IconName } from "../../components/ui";
import { monthlyDonations } from "../../data/seed";
import { categoryLabels } from "../../domain/labels";
import { RULES, isAwaitingTriage } from "../../domain/rules";
import { monthlyDonationSeries } from "../../domain/statistics";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors, spacing, tones } from "../../theme";
import type { Tone } from "../../theme";
import { formatDateTime } from "../../utils/format";
import { styles } from "./styles";

function StatCard({ icon, value, label, chip, tone }: { icon: IconName; value: string | number; label: string; chip: string; tone: Tone }) {
  return (
    <View style={[styles.statCard, { borderColor: tones[tone].border }]}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={[styles.statIcon, { backgroundColor: tones[tone].bg }]}>
          <Ionicons color={tones[tone].fg} name={icon} size={18} />
        </View>
        <View style={[styles.statChip, { backgroundColor: tones[tone].bg }]}>
          <Txt variant="tiny" color={tones[tone].fg}>
            {chip}
          </Txt>
        </View>
      </Row>
      <Txt variant="h1" color={tones[tone].fg}>
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </Txt>
      <Txt variant="small">{label}</Txt>
    </View>
  );
}

export function AdminDashboardScreen() {
  const app = useApp();
  const { go } = useNav();
  const onBack = useBackAction();
  const today = new Date().toDateString();
  const delivered = app.requests.filter((r) => r.status === "delivered");
  const students = new Set(delivered.map((r) => r.studentName)).size;
  const totalStock = app.stock.reduce((s, i) => s + i.quantity, 0);
  const donationsByMonth = app.isDemo
    ? monthlyDonations
    : monthlyDonationSeries(app.donations, new Date());
  const maxMonth = Math.max(1, ...donationsByMonth.map((month) => month.value));
  const byCategory = app.stock.map((s) => ({ label: categoryLabels[s.category], value: s.quantity }));
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.value));

  return (
    <Screen
      hero={
        <Hero onBack={onBack}>
          <Txt variant="h1" color={colors.white} center>
            Painel Administrativo
          </Txt>
          <Txt variant="small" center color="rgba(255,255,255,0.8)">
            Atualizado: {formatDateTime(new Date().toISOString())}
          </Txt>
        </Hero>
      }
      tabs
    >
      <Grid minItemWidth={150}>
        <StatCard chip={`${app.donations.filter((d) => d.status === "scheduled").length} agendadas`} icon="shirt-outline" label="Doações registradas" tone="brand" value={app.donations.length} />
        <StatCard chip={`${app.movements.filter((m) => m.type === "in" && new Date(m.createdAt).toDateString() === today).length} entradas hoje`} icon="cube-outline" label="Itens no estoque" tone="trust" value={totalStock} />
        <StatCard chip={`${app.requests.filter((r) => r.status === "in_review").length} em análise`} icon="clipboard-outline" label="Solicitações abertas" tone="amber" value={app.requests.filter((r) => r.status !== "delivered" && r.status !== "cancelled").length} />
        <StatCard chip={`${app.deliveries.filter((d) => new Date(d.deliveredAt).toDateString() === today).length} hoje`} icon="car-outline" label="Entregas realizadas" tone="purple" value={delivered.length} />
        <StatCard chip="atendidos" icon="person-outline" label="Estudantes atendidos" tone="rose" value={students} />
        <StatCard chip={`${app.points.filter((p) => p.openNow).length} abertos`} icon="location-outline" label="Pontos de coleta ativos" tone="amber" value={app.points.length} />
      </Grid>

      <Card>
        <Txt variant="h2">Doações por mês</Txt>
        <Row style={{ alignItems: "flex-end", height: 140 }} gap={spacing.sm}>
          {donationsByMonth.map((m, i) => (
            <View key={m.month} style={{ alignItems: "center", flex: 1, gap: 4 }}>
              <Txt variant="tiny">
                {m.value}
              </Txt>
              <View style={[styles.bar, { height: (m.value / maxMonth) * 100, backgroundColor: i === donationsByMonth.length - 1 ? colors.brand600 : colors.brand200 }]} />
              <Txt variant="tiny">
                {m.month}
              </Txt>
            </View>
          ))}
        </Row>
      </Card>

      <Card>
        <Txt variant="h2">Distribuição por tipo</Txt>
        {byCategory.map((c) => (
          <View key={c.label} style={{ gap: 4 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Txt variant="label">{c.label}</Txt>
              <Txt variant="small">{c.value}</Txt>
            </Row>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${(c.value / maxCategory) * 100}%`, backgroundColor: c.value < RULES.lowStockThreshold ? colors.amber500 : colors.brand600 }]} />
            </View>
          </View>
        ))}
      </Card>

      <ListRow detail={`${app.donations.filter((d) => isAwaitingTriage(d.status)).length} lotes aguardando`} icon="filter-outline" onPress={() => go({ name: "triage" })} title="Triagem" tone="amber" />
      <ListRow detail="Matrículas com CadÚnico e cadastros de coletores" icon="shield-checkmark-outline" onPress={() => go({ name: "reviews" })} title="Validações" tone="purple" />
      <ListRow detail="Entradas, saídas e transferências" icon="swap-horizontal-outline" onPress={() => go({ name: "admin-stock" })} title="Gestão de estoque" tone="brand" />
      <ListRow detail="Pontos, escolas e regiões" icon="map-outline" onPress={() => go({ name: "impact-map" })} title="Mapa de impacto" tone="trust" />
    </Screen>
  );
}
