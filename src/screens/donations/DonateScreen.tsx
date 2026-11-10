import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import CategoryGrid from "../../components/CategoryGrid";
import Screen from "../../components/Screen";
import { Avatar, Button, Card, Chips, EmptyState, OptionCard, Pill, Row, Stepper, Tabs, Txt } from "../../components/ui";
import { categoryLabels, conditionLabels, donationStatusMeta } from "../../domain/labels";
import type { ItemCategory, ItemCondition } from "../../domain/models";
import { sizesByCategory } from "../../domain/catalog";
import { RULES } from "../../domain/rules";
import { donationDays, localDateKey, parseOpeningHours, slotTimesFor } from "../../domain/schedule";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp, useProfile } from "../../store/AppStore";
import { spacing } from "../../theme";
import { formatDateTime } from "../../utils/format";

function nextSlots(pointHours: string | undefined) {
  const opening = parseOpeningHours(pointHours);
  const days = donationDays(new Date(), opening).map((date) => ({
    value: localDateKey(date),
    label: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }).replace(".", ""),
  }));
  return { days, hours: slotTimesFor(opening) };
}

export function DonateScreen() {
  const params = useRouteParams("donate");
  const app = useApp();
  const { replace, go } = useNav();
  const [tab, setTab] = useState<"new" | "agenda">(params.tab ?? "new");
  const [category, setCategory] = useState<ItemCategory>("camisa");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<ItemCondition>("muito_bom");
  const [pointId, setPointId] = useState(app.points[0]?.id ?? "");
  const pointHours = app.points.find((p) => p.id === pointId)?.hours;
  const { days, hours } = useMemo(() => nextSlots(pointHours), [pointHours]);
  const [chosenDay, setDay] = useState(days[0]?.value ?? "");
  const [chosenHour, setHour] = useState(hours[0] ?? "");
  // Trocar de ponto pode tirar o dia/horário escolhido da lista: volta ao primeiro.
  const day = days.some((d) => d.value === chosenDay) ? chosenDay : days[0]?.value ?? "";
  const hour = hours.includes(chosenHour) ? chosenHour : hours[0] ?? "";
  const [loading, setLoading] = useState(false);
  const profile = useProfile();

  const chooseCategory = (c: ItemCategory) => {
    setCategory(c);
    setSize(sizesByCategory[c].includes(size) ? size : sizesByCategory[c][0]);
  };

  const submit = async () => {
    if (!pointId) return Alert.alert("Escolha um ponto", "Selecione o ponto parceiro de entrega.");
    if (!day || !hour) return Alert.alert("Sem horário disponível", "Este ponto não tem horário de entrega nos próximos dias. Escolha outro ponto.");
    setLoading(true);
    const result = await app.createDonation({
      category,
      size,
      quantity,
      condition,
      pointId,
      scheduledFor: new Date(`${day}T${hour}:00`).toISOString(),
    });
    setLoading(false);
    if (!result.ok || !result.value) return Alert.alert("Não foi possível registrar", result.error);
    replace({ name: "donation-success", id: result.value.id });
  };

  return (
    <Screen
      footer={tab === "new" ? <Button icon="checkmark-circle-outline" label="Confirmar doação" loading={loading} onPress={submit} /> : undefined}
      tabs={tab === "agenda"}
      title="Minhas doações"
    >
      <Tabs
        onChange={setTab}
        options={[
          { value: "new", label: "Nova doação" },
          { value: "agenda", label: "Minha agenda", count: app.donations.length },
        ]}
        value={tab}
      />

      {tab === "new" ? (
        <>
          <Card>
            <Row>
              <Avatar name={profile.fullName} uri={profile.avatarUri} />
              <View style={{ flex: 1 }}>
                <Row gap={6}>
                  <Txt variant="title">{profile.fullName}</Txt>
                  {profile.status === "active" ? <Pill label="Aprovado" /> : <Pill label="Em análise" tone="amber" />}
                </Row>
                <Txt variant="small">{profile.donorKind === "company" ? "Empresa" : "Pessoa física"}</Txt>
              </View>
            </Row>
          </Card>

          <Card>
            <Txt variant="h2">1. O que você quer doar?</Txt>
            <Txt variant="small">Escolha a categoria principal deste lote</Txt>
            <CategoryGrid onChange={chooseCategory} value={category} />
            <Txt variant="label">Tamanho predominante</Txt>
            <Chips dark onChange={setSize} options={sizesByCategory[category].map((s) => ({ value: s, label: s }))} value={size} />
            <Row style={{ justifyContent: "space-between" }}>
              <View>
                <Txt variant="label">Quantidade</Txt>
                <Txt variant="small">Até {RULES.maxDonationQuantity} por lote</Txt>
              </View>
              <Stepper max={RULES.maxDonationQuantity} onChange={setQuantity} value={quantity} />
            </Row>
            <Txt variant="label">Conservação</Txt>
            <Row gap={spacing.sm}>
              {(Object.keys(conditionLabels) as ItemCondition[]).map((c) => (
                <OptionCard detail={conditionLabels[c].hint} key={c} onPress={() => setCondition(c)} selected={condition === c} style={{ flex: 1, padding: 10 }} title={conditionLabels[c].label} />
              ))}
            </Row>
          </Card>

          <Card>
            <Txt variant="h2">2. Onde você vai entregar?</Txt>
            <Txt variant="small">A entrega é feita por você no ponto parceiro. Não há coleta domiciliar.</Txt>
            {app.points.map((point) => (
              <OptionCard
                detail={`${point.address} · ${point.hours}`}
                icon="location-outline"
                key={point.id}
                onPress={() => setPointId(point.id)}
                selected={point.id === pointId}
                title={point.name}
              />
            ))}
            <Button icon="map-outline" label="Ver pontos no mapa" onPress={() => go({ name: "points" })} variant="ghost" />
          </Card>

          <Card>
            <Txt variant="h2">3. Quando?</Txt>
            <Chips onChange={setDay} options={days} value={day} />
            <Chips onChange={setHour} options={hours.map((h) => ({ value: h, label: h }))} value={hour} />
          </Card>
        </>
      ) : app.donations.length === 0 ? (
        <EmptyState action={<Button label="Fazer uma doação" onPress={() => setTab("new")} />} body="Suas doações agendadas e o resultado da triagem aparecem aqui." icon="heart-outline" title="Nenhuma doação ainda" />
      ) : (
        app.donations.map((d) => (
          <Card key={d.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <Txt variant="small">#{d.protocol}</Txt>
              <Pill dot label={donationStatusMeta[d.status].label} tone={donationStatusMeta[d.status].tone} />
            </Row>
            <Txt variant="title">{`${d.quantity}× ${categoryLabels[d.category]} · Tam. ${d.size}`}</Txt>
            <Txt variant="small">
              {app.points.find((p) => p.id === d.pointId)?.name} · {formatDateTime(d.scheduledFor)}
            </Txt>
            {d.reviewNote ? <Txt variant="small">Triagem: {d.reviewNote}</Txt> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
