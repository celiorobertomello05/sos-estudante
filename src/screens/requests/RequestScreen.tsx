import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CategoryGrid from "../../components/CategoryGrid";
import Screen from "../../components/Screen";
import { Avatar, Button, Card, Chips, Field, ListRow, Notice, OptionCard, Pill, Row, Stepper, Txt } from "../../components/ui";
import { categoryLabels } from "../../domain/labels";
import type { ItemCategory, RequestItem } from "../../domain/models";
import { sizesByCategory } from "../../domain/catalog";
import { RULES, isOpenRequest } from "../../domain/rules";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp, useProfile } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { cleanText } from "../../utils/validation";
import { styles } from "./styles";

export function RequestScreen() {
  const params = useRouteParams("request");
  const app = useApp();
  const { go, replace } = useNav();
  const [category, setCategory] = useState<ItemCategory>(params.category ?? "camisa");
  const [size, setSize] = useState(sizesByCategory[params.category ?? "camisa"][1] ?? "Único");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<RequestItem[]>([]);
  const [pointId, setPointId] = useState(app.points[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const profile = useProfile();
  const verified = app.enrollment?.status === "verified";
  const available = (c: ItemCategory) => app.stock.filter((s) => s.category === c).reduce((sum, s) => sum + s.quantity, 0);
  const maxQty = Math.max(1, Math.min(RULES.maxQuantityPerItem, available(category)));
  const openCount = app.requests.filter((r) => isOpenRequest(r.status)).length;

  const choose = (c: ItemCategory) => {
    setCategory(c);
    setSize(sizesByCategory[c].includes(size) ? size : sizesByCategory[c][0]);
    setQuantity(1);
  };

  const currentItem: RequestItem = { category, size, quantityRequested: quantity, quantityApproved: 0 };

  const add = () => {
    if (available(category) === 0) return Alert.alert("Sem estoque", "Este item está esgotado no momento.");
    if (cart.some((i) => i.category === category && i.size === size)) return Alert.alert("Já adicionado", "Este item e tamanho já estão no pedido.");
    if (cart.length >= RULES.maxItemsPerRequest) return Alert.alert("Limite atingido", `Cada solicitação aceita até ${RULES.maxItemsPerRequest} itens.`);
    setCart([...cart, currentItem]);
  };

  const submit = async () => {
    const items = cart.length ? cart : [currentItem];
    if (items.some((i) => available(i.category) === 0)) return Alert.alert("Sem estoque", "Remova os itens esgotados para continuar.");
    setLoading(true);
    const result = await app.createRequest(items, pointId, cleanText(notes, 300));
    setLoading(false);
    if (!result.ok || !result.value) return Alert.alert("Não foi possível enviar", result.error);
    replace({ name: "request-success", id: result.value });
  };

  return (
    <Screen
      footer={
        <Button
          disabled={!verified || openCount >= RULES.maxOpenRequestsPerStudent}
          label={`Enviar solicitação (${cart.length || 1} ${cart.length > 1 ? "itens" : "item"})`}
          loading={loading}
          onPress={submit}
        />
      }
      title="Nova solicitação"
    >
      <Card padded={false}>
        <Row style={{ padding: spacing.lg }}>
          <Avatar name={profile.fullName} uri={profile.avatarUri} />
          <View style={{ flex: 1 }}>
            <Row gap={6}>
              <Txt variant="title">{profile.fullName}</Txt>
              {verified ? <Pill label="Elegível" /> : <Pill label="Pendente" tone="amber" />}
            </Row>
            <Txt variant="small">{verified ? "Identidade e matrícula validadas" : "Matrícula ainda não validada"}</Txt>
          </View>
        </Row>
        <Pressable accessibilityRole="button" onPress={() => go({ name: "enrollment" })} style={styles.enrollRow}>
          <Ionicons color={colors.ink500} name="school-outline" size={18} />
          <View style={{ flex: 1 }}>
            <Txt variant="label">{app.enrollment?.schoolName ?? "Cadastrar escola"}</Txt>
            <Txt variant="small">{app.enrollment ? `Matrícula ${app.enrollment.enrollmentNumber} · ${app.enrollment.grade}` : "Envie sua declaração"}</Txt>
          </View>
          {app.enrollment ? (
            <View style={{ alignItems: "flex-end" }}>
              <Txt variant="caption">Válido até</Txt>
              <Txt variant="label">{app.enrollment.validUntil}</Txt>
            </View>
          ) : null}
          <Ionicons color={colors.ink400} name="chevron-forward" size={18} />
        </Pressable>
      </Card>

      {!verified ? <Notice tone="amber" icon="alert-circle-outline" title="Matrícula necessária" body="Envie a declaração de matrícula para liberar as solicitações." /> : null}
      {openCount >= RULES.maxOpenRequestsPerStudent ? (
        <Notice tone="amber" icon="alert-circle-outline" title="Limite de pedidos em andamento" body={`Você já tem ${openCount} solicitações abertas. Aguarde a retirada para pedir novamente.`} />
      ) : null}

      <Card>
        <Row>
          <View style={styles.stepNumber}><Txt variant="label" color={colors.white}>1</Txt></View>
          <View style={{ flex: 1 }}>
            <Txt variant="h2">Selecione o item</Txt>
            <Txt variant="small">Disponibilidade para sua escola e região</Txt>
          </View>
        </Row>
        <CategoryGrid caption={(c) => `${available(c)} disponíveis`} onChange={choose} value={category} />
        <Row style={{ alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt variant="label">Tamanho</Txt>
            <Chips dark onChange={setSize} options={sizesByCategory[category].map((s) => ({ value: s, label: s }))} value={size} />
          </View>
        </Row>
        <Row style={{ justifyContent: "space-between" }}>
          <View>
            <Txt variant="label">Quantidade</Txt>
            <Txt variant="small">Máximo {maxQty} por item</Txt>
          </View>
          <Stepper max={maxQty} onChange={setQuantity} value={Math.min(quantity, maxQty)} />
        </Row>
        <Button icon="add" label="Adicionar outro item ao pedido" onPress={add} variant="secondary" />
        {cart.map((item, index) => (
          <ListRow
            detail={`Tam. ${item.size} · ${item.quantityRequested} un.`}
            icon="shirt-outline"
            key={`${item.category}-${item.size}`}
            title={categoryLabels[item.category]}
            tone="brand"
            trailing={
              <Pressable accessibilityLabel="Remover item" hitSlop={8} onPress={() => setCart(cart.filter((_, i) => i !== index))}>
                <Ionicons color={colors.rose500} name="trash-outline" size={18} />
              </Pressable>
            }
          />
        ))}
      </Card>

      <Card>
        <Row>
          <View style={styles.stepNumber}><Txt variant="label" color={colors.white}>2</Txt></View>
          <Txt variant="h2">Local de retirada</Txt>
        </Row>
        {app.points.map((p) => (
          <OptionCard detail={`${p.address} · ${p.hours}`} icon="location-outline" key={p.id} onPress={() => setPointId(p.id)} selected={p.id === pointId} title={p.name} />
        ))}
        <Field label="Observações (opcional)" maxLength={300} multiline onChangeText={setNotes} placeholder="Ex.: preciso do tamanho maior se não houver M" value={notes} />
      </Card>
    </Screen>
  );
}
