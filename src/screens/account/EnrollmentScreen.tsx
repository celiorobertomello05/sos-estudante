import { useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Button, Card, Divider, Field, Notice, Pill, Row, Txt } from "../../components/ui";
import type { Enrollment } from "../../domain/models";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import type { Tone } from "../../theme";
import { formatDate } from "../../utils/format";
import { chooseImage } from "../../utils/media";
import { cleanText } from "../../utils/validation";
import { styles } from "./styles";

export function EnrollmentScreen() {
  const app = useApp();
  const { back } = useNav();
  const current = app.enrollment;
  const [schoolName, setSchoolName] = useState(current?.schoolName ?? "");
  const [enrollmentNumber, setEnrollmentNumber] = useState(current?.enrollmentNumber ?? "");
  const [grade, setGrade] = useState(current?.grade ?? "");
  const [validUntil, setValidUntil] = useState(current?.validUntil ?? `dez ${new Date().getFullYear()}`);
  const [documentUri, setDocumentUri] = useState<string | undefined>(current?.documentUri);
  const [cadUnicoUri, setCadUnicoUri] = useState<string | undefined>(undefined);
  const hasCadUnico = Boolean(current?.hasCadUnico);
  const [loading, setLoading] = useState(false);
  const status = current?.status;
  const statusMeta: Record<Enrollment["status"], { label: string; tone: Tone }> = {
    pending: { label: "Em validação", tone: "amber" },
    verified: { label: "Validada", tone: "brand" },
    rejected: { label: "Recusada", tone: "rose" },
  };
  const submitLabel =
    status === "rejected"
      ? "Reenviar para validação"
      : status
        ? "Enviar nova versão"
        : "Enviar para validação";

  const save = async () => {
    if (schoolName.trim().length < 3 || enrollmentNumber.trim().length < 3 || !grade.trim()) {
      return Alert.alert("Campos obrigatórios", "Informe escola, número da matrícula e série.");
    }
    if (!documentUri && !current) return Alert.alert("Declaração necessária", "Anexe a declaração de matrícula.");
    if (!cadUnicoUri && !hasCadUnico) {
      return Alert.alert("CadÚnico necessário", "Anexe a folha resumo do CadÚnico. Ela é obrigatória para solicitar itens.");
    }
    setLoading(true);
    const result = await app.saveEnrollment(
      { schoolName: cleanText(schoolName, 120), enrollmentNumber: cleanText(enrollmentNumber, 40), grade: cleanText(grade, 40), validUntil: cleanText(validUntil, 20), status: "pending" },
      documentUri !== current?.documentUri ? documentUri : undefined,
      cadUnicoUri,
    );
    setLoading(false);
    if (!result.ok) return Alert.alert("Erro", result.error);
    Alert.alert("Matrícula enviada", app.isDemo ? "Matrícula validada (demonstração)." : "A equipe vai validar sua declaração em breve.");
    back();
  };

  return (
    <Screen footer={<Button label={submitLabel} loading={loading} onPress={save} />} title="Escola e matrícula">
      {status ? (
        <Notice
          icon={status === "verified" ? "shield-checkmark-outline" : status === "pending" ? "time-outline" : "alert-circle-outline"}
          title={status === "verified" ? "Matrícula validada" : status === "pending" ? "Em validação" : "Declaração recusada"}
          tone={status === "verified" ? "brand" : status === "pending" ? "amber" : "rose"}
          body={
            status === "verified"
              ? "Sua matrícula está ativa e permite solicitar itens."
              : status === "pending"
                ? "A equipe está analisando a declaração enviada."
                : current?.reviewNote
                  ? `Motivo: ${current.reviewNote} Corrija e envie novamente.`
                  : "Revise os dados ou troque a declaração e envie novamente."
          }
        />
      ) : null}
      <Field label="Escola" onChangeText={setSchoolName} placeholder="EMEF João Paulo II" required value={schoolName} />
      <Field label="Número da matrícula" onChangeText={setEnrollmentNumber} required value={enrollmentNumber} />
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Field label="Série" onChangeText={setGrade} placeholder="8º ano" required value={grade} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Válida até" onChangeText={setValidUntil} value={validUntil} />
        </View>
      </Row>
      <Pressable accessibilityRole="button" onPress={() => chooseImage(setDocumentUri)} style={styles.docBox}>
        {documentUri ? <Image source={{ uri: documentUri }} style={styles.docPreview} /> : <Ionicons color={colors.ink400} name="document-attach-outline" size={30} />}
        <Txt variant="label">{documentUri ? "Trocar declaração" : "Anexar declaração de matrícula"}</Txt>
        <Txt variant="small">Arquivo privado, visível só para a equipe de validação</Txt>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => chooseImage(setCadUnicoUri)} style={styles.docBox}>
        {cadUnicoUri ? <Image source={{ uri: cadUnicoUri }} style={styles.docPreview} /> : <Ionicons color={hasCadUnico ? colors.brand600 : colors.ink400} name={hasCadUnico ? "checkmark-circle-outline" : "document-attach-outline"} size={30} />}
        <Txt variant="label">{cadUnicoUri ? "Trocar folha do CadÚnico" : hasCadUnico ? "CadÚnico anexado · enviar outra versão" : "Anexar folha resumo do CadÚnico"}</Txt>
        <Txt variant="small">Obrigatório para solicitar itens. Arquivo privado.</Txt>
      </Pressable>
      {app.enrollmentHistory.length ? (
        <Card padded={false}>
          <View style={styles.enrollmentHistoryHeader}>
            <Txt variant="h2">Histórico de envios</Txt>
            <Txt variant="small">Acompanhe a análise de cada declaração enviada.</Txt>
          </View>
          {app.enrollmentHistory.map((submission, index) => {
            const meta = statusMeta[submission.status];
            return (
              <View key={submission.id}>
                {index > 0 ? <Divider /> : null}
                <View style={styles.enrollmentHistoryItem}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row gap={6}>
                      <Txt variant="title">{submission.schoolName}</Txt>
                      {submission.isActive ? <Pill label="Atual" tone="trust" /> : null}
                    </Row>
                    <Txt variant="small">
                      Matrícula {submission.enrollmentNumber} · {submission.grade}
                    </Txt>
                    <Txt variant="caption">Enviada em {formatDate(submission.createdAt)}</Txt>
                  </View>
                  <Pill label={meta.label} tone={meta.tone} />
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
