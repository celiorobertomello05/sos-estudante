import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Photo from "../../components/Photo";
import Screen from "../../components/Screen";
import { Button, Card, EmptyState, InfoRows, ListRow, Notice, Row, Timeline, Txt } from "../../components/ui";
import { categoryLabels, requestStatusMeta } from "../../domain/labels";
import { inactiveAccountNotice, isOpenRequest } from "../../domain/rules";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors } from "../../theme";
import { formatDate, formatDateTime } from "../../utils/format";
import { nextRequestAction } from "../../utils/requestPresentation";
import { styles } from "./styles";

export function RequestDetailScreen() {
  const { id } = useRouteParams("request-detail");
  const app = useApp();
  const { go } = useNav();
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const request = app.requests.find((r) => r.id === id);
  if (!request) {
    return (
      <Screen title="Detalhe da solicitação">
        <EmptyState body="Esta solicitação não foi encontrada." icon="search-outline" title="Não encontrada" />
      </Screen>
    );
  }
  const meta = requestStatusMeta[request.status];
  const point = app.points.find((p) => p.id === request.pointId);
  const isStudent = app.profile?.role === "student";
  const code = app.pickupCodes[request.id];
  const codeLocked = app.lockedPickupCodes.includes(request.id);

  const regenerateCode = () =>
    Alert.alert(
      "Gerar novo código?",
      "O código atual deixa de valer. Use isto se o código foi bloqueado ou se alguém o viu.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Gerar novo código",
          onPress: async () => {
            const result = await app.regeneratePickupCode(request.id);
            if (!result.ok) return Alert.alert("Não foi possível gerar", result.error);
            setShowCode(false);
            Alert.alert("Novo código gerado", "Mostre o novo código ao distribuidor na retirada.");
          },
        },
      ],
    );
  const action = nextRequestAction[request.status];

  const advance = async () => {
    if (!action) return;
    setBusy(true);
    const result = await app.advanceRequest(request.id, action.to);
    setBusy(false);
    if (!result.ok) Alert.alert("Erro", result.error);
  };

  const cancel = () =>
    Alert.alert("Cancelar solicitação?", "Os itens voltam para o estoque e ficam disponíveis para outros estudantes.", [
      { text: "Manter", style: "cancel" },
      {
        text: "Cancelar pedido",
        style: "destructive",
        onPress: async () => {
          const result = await app.cancelRequest(request.id);
          if (!result.ok) Alert.alert("Erro", result.error);
        },
      },
    ]);

  const actionFooter = isStudent ? (
    isOpenRequest(request.status) && request.status !== "ready" ? <Button label="Cancelar solicitação" onPress={cancel} variant="ghost" /> : undefined
  ) : request.status === "ready" ? (
    <Button icon="checkmark-circle-outline" label="Confirmar entrega" onPress={() => go({ name: "delivery", id: request.id })} />
  ) : action ? (
    <Button label={action.label} loading={busy} onPress={advance} />
  ) : undefined;
  // Conta pendente ou bloqueada consulta o detalhe, mas não inicia ações.
  const inactiveNotice = app.profile ? inactiveAccountNotice(app.profile.role, app.profile.status) : null;
  const actionsBlocked = Boolean(inactiveNotice && actionFooter);
  const footer = actionsBlocked ? undefined : actionFooter;

  return (
    <Screen footer={footer} title="Detalhe da solicitação">
      <LinearGradient colors={[colors.brand700, colors.brand500]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.hero}>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt variant="small" color="rgba(255,255,255,0.85)">
            Número da solicitação
          </Txt>
          <View style={styles.heroPill}>
            <Txt variant="small" color={colors.brand800}>
              {meta.label}
            </Txt>
          </View>
        </Row>
        <Txt variant="display" color={colors.white}>
          #{request.protocol}
        </Txt>
        <Txt variant="small" color="rgba(255,255,255,0.85)">
          Solicitado em {formatDate(request.createdAt)}
        </Txt>
      </LinearGradient>

      {actionsBlocked && inactiveNotice ? (
        <Notice
          tone={app.profile?.status === "blocked" ? "rose" : "amber"}
          icon={app.profile?.status === "blocked" ? "lock-closed-outline" : "time-outline"}
          title={`${inactiveNotice.title}: ações indisponíveis`}
          body={`Você pode consultar esta solicitação, mas não pode avançar etapas nem cancelar. ${inactiveNotice.body}`}
        />
      ) : null}

      {isStudent && code && (request.status === "ready" || request.status === "approved" || request.status === "separating") ? (
        <Card tone="brand">
          <Row>
            <Ionicons color={colors.brand700} name="key-outline" size={20} />
            <View style={{ flex: 1 }}>
              <Txt variant="title">Código de retirada</Txt>
              <Txt variant="small">Mostre este código apenas ao distribuidor, no momento da entrega.</Txt>
            </View>
          </Row>
          <Pressable
            accessibilityLabel={showCode ? "Ocultar código" : "Mostrar código"}
            accessibilityRole="button"
            onPress={() => setShowCode(!showCode)}
            style={styles.codeBox}
          >
            <Txt variant="display" color={colors.brand800} style={{ letterSpacing: 10 }}>
              {showCode ? code : "••••"}
            </Txt>
            <Ionicons color={colors.brand700} name={showCode ? "eye-off-outline" : "eye-outline"} size={20} />
          </Pressable>
          {codeLocked ? (
            <Notice
              body="Houve 5 tentativas erradas na entrega. Gere um novo código para retirar os itens."
              icon="lock-closed-outline"
              title="Código bloqueado"
              tone="rose"
            />
          ) : null}
          {!inactiveNotice ? (
            <Button icon="refresh-outline" label="Gerar novo código" onPress={regenerateCode} variant={codeLocked ? "primary" : "ghost"} />
          ) : null}
        </Card>
      ) : null}

      {!isStudent ? (
        <Card>
          <InfoRows
            rows={[
              ["Beneficiário", request.studentName],
              ["Escola", request.schoolName],
              ["Contato", request.contactMasked],
              ["Documentos pessoais", "Protegidos"],
            ]}
          />
        </Card>
      ) : null}

      <Card>
        <Txt variant="h2">Itens solicitados</Txt>
        {request.items.map((item) => (
          <Row key={`${item.category}-${item.size}`}>
            <Photo imageKey={item.category} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Txt variant="title">{`${categoryLabels[item.category]}${item.size === "Único" ? "" : ` Tamanho ${item.size}`}`}</Txt>
              <Txt variant="small">
                Solicitado: {item.quantityRequested} · Aprovado: <Txt variant="label" color={colors.brand700}>{item.quantityApproved}</Txt>
              </Txt>
            </View>
            {item.quantityApproved > 0 ? (
              <View style={styles.okDot}>
                <Ionicons color={colors.brand700} name="checkmark" size={14} />
              </View>
            ) : null}
          </Row>
        ))}
        {request.notes ? <Txt variant="small">Observação: {request.notes}</Txt> : null}
      </Card>

      {point ? (
        <Card>
          <Txt variant="h2">Retirada</Txt>
          <ListRow detail={`${point.address} · ${formatDateTime(request.pickupAt)}`} icon="location-outline" onPress={() => go({ name: "points" })} title={point.name} tone="brand" />
        </Card>
      ) : null}

      <Card>
        <Txt variant="h2">Linha do tempo</Txt>
        {request.status === "cancelled" ? (
          <Notice tone="rose" icon="close-circle-outline" title="Solicitação cancelada" />
        ) : (
          <Timeline steps={request.timeline.map((t) => ({ label: t.label, detail: t.at ? formatDateTime(t.at) : "Aguardando", done: Boolean(t.at) }))} />
        )}
      </Card>
    </Screen>
  );
}
