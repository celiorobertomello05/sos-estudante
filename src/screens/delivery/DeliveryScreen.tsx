import { useState } from "react";
import { Alert, Image, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Brand from "../../components/Brand";
import Screen from "../../components/Screen";
import SignaturePad from "../../components/SignaturePad";
import { Button, Card, EmptyState, InfoRows, Pill, Row, Txt } from "../../components/ui";
import { categoryLabels } from "../../domain/labels";
import { RULES, isValidPickupCode } from "../../domain/rules";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors } from "../../theme";
import { formatDateTime } from "../../utils/format";
import { pickImage } from "../../utils/media";
import { itemsSummary } from "../../utils/requestPresentation";
import { onlyDigits } from "../../utils/validation";
import { styles } from "./styles";

export function DeliveryScreen() {
  const { id } = useRouteParams("delivery");
  const app = useApp();
  const { back, reset } = useNav();
  const [code, setCode] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const request = app.requests.find((r) => r.id === id);
  const delivery = app.deliveries.find((d) => d.requestId === id);
  const point = app.points.find((p) => p.id === request?.pointId);

  if (!request) {
    return (
      <Screen title="Confirmar entrega">
        <EmptyState body="A solicitação não foi encontrada." icon="search-outline" title="Não encontrada" />
      </Screen>
    );
  }

  if (request.status === "delivered") {
    return (
      <Screen footer={<Button label="Voltar às entregas" onPress={() => reset({ name: "distribution" })} />} title="Comprovante de entrega">
        <View style={styles.doneIcon}>
          <Ionicons color={colors.white} name="checkmark" size={40} />
        </View>
        <Txt variant="h1" center>
          Entrega confirmada
        </Txt>
        <Card>
          <View style={{ alignItems: "center" }}>
            <Brand full size={80} />
          </View>
          <Txt variant="caption">Comprovante nº</Txt>
          <Txt variant="h1" color={colors.brand700}>
            {delivery?.receiptNumber ?? request.protocol}
          </Txt>
          <InfoRows
            rows={[
              ["Beneficiário", request.studentName],
              ["Pedido", `#${request.protocol}`],
              ["Itens", itemsSummary(request.items)],
              ["Local", point?.name ?? "—"],
              ["Data", delivery ? formatDateTime(delivery.deliveredAt) : "—"],
              ["Responsável", delivery?.collectorName ?? "—"],
            ]}
          />
          <Pill label="Código validado · foto e assinatura registradas" />
        </Card>
      </Screen>
    );
  }

  const takePhoto = async () => {
    const uri = await pickImage("camera");
    if (uri) setPhoto(uri);
  };

  const finish = async () => {
    if (!isValidPickupCode(code)) {
      return Alert.alert(
        "Código inválido",
        `Digite o código de ${RULES.pickupCodeLength} dígitos informado pelo beneficiário.`,
      );
    }
    if (!photo) return Alert.alert("Foto obrigatória", "Fotografe os itens entregues.");
    if (!signature) return Alert.alert("Assinatura obrigatória", "Peça ao beneficiário para assinar.");
    setLoading(true);
    const result = await app.confirmDelivery(request.id, code, photo, signature);
    setLoading(false);
    if (!result.ok) Alert.alert("Não foi possível confirmar", result.error);
  };

  const ready = request.status === "ready";

  return (
    <Screen footer={<Button disabled={!ready} label="Finalizar e gerar comprovante" loading={loading} onPress={finish} />} title="Confirmar entrega">
      <View style={styles.darkHero}>
        <View style={styles.darkIcon}>
          <Ionicons color={colors.white} name="cube-outline" size={24} />
        </View>
        <Txt variant="h1" center color={colors.white}>
          Confirmar entrega
        </Txt>
        <Txt variant="small" center color="rgba(255,255,255,0.8)">
          #{request.protocol} · {point?.name}
        </Txt>
      </View>
      {!ready ? (
        <Card tone="amber">
          <Txt variant="title">Pedido ainda não está pronto</Txt>
          <Txt variant="small">Conclua a separação antes de entregar.</Txt>
          <Button label="Voltar" onPress={back} variant="secondary" />
        </Card>
      ) : null}
      <Card>
        <Txt variant="h2">Itens para entregar</Txt>
        {request.items.map((item) => (
          <Row key={`${item.category}-${item.size}`}>
            <View style={styles.check}>
              <Ionicons color={colors.brand700} name="checkmark" size={14} />
            </View>
            <Txt>{`${item.quantityApproved}× ${categoryLabels[item.category]}${item.size === "Único" ? "" : ` Tamanho ${item.size}`}`}</Txt>
          </Row>
        ))}
      </Card>
      <Card>
        <InfoRows
          rows={[
            ["Beneficiário", request.studentName],
            ["Escola vinculada", request.schoolName],
            ["Contato", request.contactMasked],
            ["Agendamento", formatDateTime(request.pickupAt)],
            ["Documentos pessoais", "Protegidos"],
          ]}
        />
      </Card>

      <Card>
        <Row>
          <Ionicons color={colors.brand700} name="key-outline" size={20} />
          <View style={{ flex: 1 }}>
            <Txt variant="title">1. Código de retirada</Txt>
            <Txt variant="small">Peça ao beneficiário o código de 4 dígitos exibido no aplicativo.</Txt>
          </View>
        </Row>
        <TextInput
          accessibilityLabel="Código de retirada"
          keyboardType="number-pad"
          maxLength={4}
          onChangeText={(v) => setCode(onlyDigits(v))}
          placeholder="0000"
          placeholderTextColor={colors.ink300}
          style={styles.codeInput}
          value={code}
        />
        {app.isDemo ? <Txt variant="small">Demonstração: use o código 4827 para pedidos de exemplo.</Txt> : null}
      </Card>

      <Card>
        <Txt variant="title">2. Foto dos itens</Txt>
        <Pressable accessibilityRole="button" onPress={takePhoto} style={[styles.capture, photo && { borderColor: colors.brand500, borderStyle: "solid" }]}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.preview} />
          ) : (
            <>
              <Ionicons color={colors.ink400} name="camera-outline" size={30} />
              <Txt variant="label">Abrir câmera</Txt>
              <Txt variant="small">Fotografe apenas os itens, sem rostos</Txt>
            </>
          )}
        </Pressable>
        {photo ? <Button label="Tirar outra foto" onPress={takePhoto} variant="ghost" /> : null}
      </Card>

      <Card>
        <Txt variant="title">3. Assinatura digital</Txt>
        <SignaturePad onChange={setSignature} />
      </Card>
    </Screen>
  );
}
