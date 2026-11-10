import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Grid from "../../components/Grid";
import Screen from "../../components/Screen";
import { Button, Card, Chips, EmptyState, Field, Row, Stepper, Txt } from "../../components/ui";
import { categoryLabels, conditionLabels, movementMeta } from "../../domain/labels";
import { hasStockItemAdministrativeDetails } from "../../domain/models";
import type { MovementType } from "../../domain/models";
import { useApp } from "../../store/AppStore";
import { colors, spacing, tones } from "../../theme";
import type { Tone } from "../../theme";
import { formatDateTime } from "../../utils/format";
import { cleanText } from "../../utils/validation";
import { styles } from "./styles";

const movementButtons: { type: MovementType; label: string; tone: Tone }[] = [
  { type: "in", label: "Entrada de itens", tone: "brand" },
  { type: "out", label: "Saída de itens", tone: "rose" },
  { type: "transfer", label: "Transferência", tone: "trust" },
  { type: "adjust", label: "Ajuste de qtde.", tone: "amber" },
];

function MovementModal({ type, onClose }: { type: MovementType | null; onClose: () => void }) {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [stockId, setStockId] = useState(app.stock[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const item = app.stock.find((s) => s.id === stockId);
  if (!type) return null;
  const meta = movementMeta[type];
  const demoDefaults: Record<MovementType, [string, string]> = {
    in: ["Triagem", "Estoque A"],
    out: ["Estoque A", "Distribuição"],
    transfer: ["Estoque A", "Estoque B"],
    adjust: [
      "Inventário",
      item && hasStockItemAdministrativeDetails(item)
        ? item.location.split(" — ")[0]
        : "",
    ],
  };
  const defaults: readonly [string, string] = app.isDemo
    ? demoDefaults[type]
    : ["", ""];

  const save = async () => {
    if (!item) return;
    const origin = cleanText(from || defaults[0], 60);
    const destination = cleanText(to || defaults[1], 60);
    if (!origin || !destination) {
      return Alert.alert("Localização necessária", "Informe a origem e o destino da movimentação.");
    }
    const itemSizes = item.sizes.length ? ` (Tam. ${item.sizes.join(", ")})` : "";
    setLoading(true);
    const result = await app.registerMovement({
      stockItemId: item.id,
      label: `${categoryLabels[item.category]}${itemSizes}`,
      type,
      quantity,
      from: origin,
      to: destination,
    });
    setLoading(false);
    if (!result.ok) return Alert.alert("Não foi possível registrar", result.error);
    setQuantity(1);
    setFrom("");
    setTo("");
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <ScrollView contentContainerStyle={{ gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="h2">{meta.label}</Txt>
            <Pressable accessibilityLabel="Fechar" hitSlop={10} onPress={onClose}>
              <Ionicons color={colors.ink500} name="close" size={22} />
            </Pressable>
          </Row>
          <Txt variant="label">Item</Txt>
          <Chips
            onChange={setStockId}
            options={app.stock.map((s) => ({
              value: s.id,
              label: `${categoryLabels[s.category]} [${s.sizes.join("/")}] (${s.quantity})`,
            }))}
            value={stockId}
          />
          {item ? (
            <Card style={{ backgroundColor: colors.ink50, borderColor: colors.ink200, gap: spacing.xs }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Txt variant="caption">Condição: {conditionLabels[item.condition].label}</Txt>
                <Txt variant="caption">Tamanhos: {item.sizes.join(", ")}</Txt>
              </Row>
              {hasStockItemAdministrativeDetails(item) ? (
                <Row style={{ justifyContent: "space-between" }}>
                  <Txt variant="caption">Local: {item.location}</Txt>
                  <Txt variant="caption">Escola: {item.school}</Txt>
                </Row>
              ) : null}
            </Card>
          ) : null}
          <Row style={{ justifyContent: "space-between" }}>
            <View>
              <Txt variant="label">{type === "adjust" ? "Nova quantidade" : "Quantidade"}</Txt>
              {type === "out" || type === "transfer" ? <Txt variant="small">Disponível: {item?.quantity ?? 0}</Txt> : null}
            </View>
            <Stepper
              max={type === "out" || type === "transfer" ? Math.max(1, item?.quantity ?? 1) : 1000}
              min={type === "adjust" ? 0 : 1}
              onChange={setQuantity}
              value={quantity}
            />
          </Row>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Field label="Origem" onChangeText={setFrom} placeholder={defaults[0] || "Informe a origem"} value={from} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Destino" onChangeText={setTo} placeholder={defaults[1] || "Informe o destino"} value={to} />
            </View>
          </Row>
          <Button label="Registrar movimentação" loading={loading} onPress={save} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export function AdminStockScreen() {
  const app = useApp();
  const [filter, setFilter] = useState<"all" | MovementType>("all");
  const [modal, setModal] = useState<MovementType | null>(null);
  const list = filter === "all" ? app.movements : app.movements.filter((m) => m.type === filter);

  return (
    <Screen tabs title="Gestão de estoque">
      <Grid gap={spacing.sm} minItemWidth={140}>
        {movementButtons.map((b) => (
          <Pressable accessibilityRole="button" key={b.type} onPress={() => setModal(b.type)} style={[styles.actionButton, { backgroundColor: tones[b.tone].bg, borderColor: tones[b.tone].border }]}>
            <Txt variant="label" color={tones[b.tone].fg}>
              {b.label}
            </Txt>
          </Pressable>
        ))}
      </Grid>
      <Chips
        dark
        onChange={setFilter}
        options={[
          { value: "all", label: "Todos" },
          { value: "in", label: "Entrada" },
          { value: "out", label: "Saída" },
          { value: "transfer", label: "Transferência" },
          { value: "adjust", label: "Ajuste" },
        ]}
        value={filter}
      />
      <Txt variant="h2">Movimentações recentes</Txt>
      {list.length === 0 ? <EmptyState body="Registre uma movimentação acima." icon="swap-horizontal-outline" title="Sem movimentações" /> : null}
      {list.map((m) => {
        const meta = movementMeta[m.type];
        return (
          <Card key={m.id}>
            <Row style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <View>
                <Txt variant="title">{m.label}</Txt>
                <Txt variant="small">{formatDateTime(m.createdAt)}</Txt>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Txt variant="h2" color={tones[meta.tone].fg}>{`${meta.sign}${m.quantity}`}</Txt>
                <View style={[styles.typePill, { backgroundColor: tones[meta.tone].bg }]}>
                  <Txt variant="tiny" color={tones[meta.tone].fg}>
                    {meta.label}
                  </Txt>
                </View>
              </View>
            </Row>
            <Row style={{ borderTopColor: colors.ink100, borderTopWidth: 1, paddingTop: spacing.sm }}>
              <Txt variant="small">
                Resp.: <Txt variant="label">{m.responsible}</Txt>
              </Txt>
              <Txt variant="small" color={colors.ink400}>
                {m.from} → {m.to}
              </Txt>
            </Row>
          </Card>
        );
      })}
      <MovementModal onClose={() => setModal(null)} type={modal} />
    </Screen>
  );
}
