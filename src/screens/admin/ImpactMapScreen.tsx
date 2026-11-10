import { useState } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import PointsMap from "../../components/PointsMap";
import Screen from "../../components/Screen";
import { Card, Chips, EmptyState, Row, Txt } from "../../components/ui";
import { hasStockItemAdministrativeDetails } from "../../domain/models";
import { useApp } from "../../store/AppStore";
import { colors, spacing, tones } from "../../theme";
import type { Tone } from "../../theme";
import { styles } from "./styles";

type Layer = "all" | "points" | "storage" | "schools" | "demand";

export function ImpactMapScreen() {
  const app = useApp();
  const [layer, setLayer] = useState<Layer>("all");
  const stockDetails = app.stock.filter(hasStockItemAdministrativeDetails);
  const schools = new Set([
    ...app.requests.map((request) => request.schoolName),
    ...stockDetails.map((item) => item.school).filter((school) => school !== "Todas"),
  ]).size;
  const storage = stockDetails.length
    ? new Set(stockDetails.map((item) => item.location.split(" — ")[0])).size
    : null;
  const demand = app.points.filter((p) => p.capacity < 50).length;
  const delivered = app.requests.filter((r) => r.status === "delivered");
  const items = delivered.reduce((s, r) => s + r.items.reduce((a, i) => a + i.quantityApproved, 0), 0);

  const legend: { key: Layer; label: string; value: number | string; color: string; tone: Tone }[] = [
    { key: "points", label: "Pontos de coleta", value: app.points.length, color: colors.brand700, tone: "brand" },
    { key: "storage", label: "Centros de armazenamento", value: storage ?? "—", color: colors.trust600, tone: "trust" },
    { key: "schools", label: "Escolas atendidas", value: schools, color: colors.amber500, tone: "amber" },
    { key: "demand", label: "Regiões de alta demanda", value: demand, color: colors.rose500, tone: "rose" },
  ];

  const pins = app.points
    .filter(() => layer === "all" || layer === "points")
    .map((p) => ({ id: p.id, latitude: p.latitude, longitude: p.longitude, color: colors.brand700 }))
    .concat(
      app.points
        .filter((p) => (layer === "all" || layer === "demand") && p.capacity < 50)
        .map((p) => ({ id: `${p.id}-d`, latitude: p.latitude, longitude: p.longitude, color: colors.rose500 })),
    );

  return (
    <Screen tabs title="Mapa de impacto">
      {pins.length ? <PointsMap points={pins} /> : <EmptyState body="Nenhum marcador nesta camada." icon="map-outline" title="Sem marcadores" />}
      <Card padded={false}>
        <Row gap={0}>
          {legend.map((l) => (
            <View key={l.key} style={{ flex: 1, paddingVertical: spacing.md }}>
              <Txt variant="h2" center color={l.color}>
                {l.value}
              </Txt>
              <Txt variant="tiny" center>
                {l.label.split(" ")[0]}
              </Txt>
            </View>
          ))}
        </Row>
      </Card>
      <Chips
        onChange={setLayer}
        options={[
          { value: "all", label: "Todos" },
          { value: "points", label: "Coleta" },
          { value: "demand", label: "Alta demanda" },
        ]}
        value={layer}
      />
      <Txt variant="h2">Legenda e impacto</Txt>
      {legend.map((l) => (
        <Card key={l.key}>
          <Row>
            <View style={[styles.legendIcon, { backgroundColor: tones[l.tone].bg }]}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            </View>
            <Txt style={{ flex: 1 }} variant="title">
              {l.label}
            </Txt>
            <Txt variant="h1" color={l.color}>
              {l.value}
            </Txt>
          </Row>
        </Card>
      ))}
      <LinearGradient colors={[colors.brand700, colors.brand500]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.total}>
        <Txt variant="small" color="rgba(255,255,255,0.85)">
          Impacto total documentado
        </Txt>
        <Txt variant="display" color={colors.white}>
          {items} itens entregues
        </Txt>
        <Txt variant="small" color="rgba(255,255,255,0.85)">
          {new Set(delivered.map((r) => r.studentName)).size} estudantes · {app.donations.length} doações registradas
        </Txt>
      </LinearGradient>
    </Screen>
  );
}
