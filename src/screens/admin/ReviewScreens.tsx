import { useEffect, useState } from "react";
import { Alert, Linking, View } from "react-native";
import Screen from "../../components/Screen";
import { Button, Card, EmptyState, Field, InfoRows, ListRow, Notice, Row, Tabs, Txt } from "../../components/ui";
import type { PendingCollectorReview, PendingEnrollmentReview } from "../../domain/models";
import { REVIEW_NOTE_MAX_LENGTH, documentFileLabel } from "../../domain/rules";
import { useApp } from "../../store/AppStore";
import { spacing } from "../../theme";
import { formatDateTime, maskPhone } from "../../utils/format";

/** Lista de arquivos do bucket privado; abre um link temporário de 1 hora. */
function DocumentList({ files }: { files: string[] }) {
  const app = useApp();
  const open = async (path: string) => {
    const result = await app.openReviewDocument(path);
    if (!result.ok || !result.value) return Alert.alert("Documento indisponível", result.error ?? "Tente novamente.");
    await Linking.openURL(result.value).catch(() => Alert.alert("Documento indisponível", "Não foi possível abrir o arquivo."));
  };
  if (!files.length) {
    return <Notice icon="alert-circle-outline" title="Nenhum documento enviado" tone="rose" />;
  }
  return (
    <View style={{ gap: spacing.xs }}>
      {files.map((path) => (
        <ListRow flat icon="document-text-outline" key={path} onPress={() => open(path)} title={documentFileLabel(path)} tone="trust" />
      ))}
    </View>
  );
}

function EnrollmentReviewCard({ review }: { review: PendingEnrollmentReview }) {
  const app = useApp();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"verify" | "reject" | null>(null);

  const decide = async (decision: "verify" | "reject") => {
    setBusy(decision);
    const result = await app.reviewEnrollment(review.enrollmentId, decision, note);
    setBusy(null);
    if (!result.ok) return Alert.alert("Não foi possível revisar", result.error);
    Alert.alert(
      decision === "verify" ? "Matrícula validada" : "Matrícula recusada",
      decision === "verify" ? `${review.studentName} já pode solicitar itens.` : "O estudante foi avisado com o motivo informado.",
    );
  };

  const confirmVerify = () =>
    Alert.alert("Validar matrícula?", "Confira a declaração e a folha resumo do CadÚnico antes de validar.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Validar", onPress: () => decide("verify") },
    ]);

  return (
    <Card>
      <Txt variant="h2">{review.studentName}</Txt>
      <InfoRows
        rows={[
          ["Escola", review.schoolName],
          ["Matrícula", review.enrollmentNumber],
          ["Série", review.grade],
          ["Validade", review.validUntil],
          ["Enviada em", formatDateTime(review.submittedAt)],
        ]}
      />
      {!review.documentPath || !review.cadUnicoPath ? (
        <Notice
          body="Só é possível validar com a declaração de matrícula e a folha resumo do CadÚnico."
          icon="alert-circle-outline"
          title="Documento obrigatório ausente"
          tone="rose"
        />
      ) : null}
      <Txt variant="label">Documentos</Txt>
      <DocumentList files={review.files} />
      <Field
        hint="Obrigatório para recusar. O estudante recebe este texto."
        label="Motivo da recusa"
        maxLength={REVIEW_NOTE_MAX_LENGTH}
        multiline
        onChangeText={setNote}
        placeholder="Ex.: declaração ilegível, envie uma foto mais nítida."
        value={note}
      />
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Button disabled={busy !== null} label="Recusar" loading={busy === "reject"} onPress={() => decide("reject")} variant="secondary" />
        </View>
        <View style={{ flex: 1 }}>
          <Button disabled={busy !== null} label="Validar" loading={busy === "verify"} onPress={confirmVerify} />
        </View>
      </Row>
    </Card>
  );
}

function CollectorReviewCard({ review }: { review: PendingCollectorReview }) {
  const app = useApp();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const decide = (decision: "approve" | "reject") =>
    Alert.alert(
      decision === "approve" ? "Aprovar coletor?" : "Recusar cadastro?",
      decision === "approve"
        ? `${review.fullName} terá acesso à triagem, ao estoque, às entregas e aos documentos em revisão.`
        : "A conta ficará bloqueada para as ações da equipe.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: decision === "approve" ? "Aprovar" : "Recusar",
          style: decision === "reject" ? "destructive" : "default",
          onPress: async () => {
            setBusy(decision);
            const result = await app.reviewCollector(review.profileId, decision);
            setBusy(null);
            if (!result.ok) Alert.alert("Não foi possível revisar", result.error);
          },
        },
      ],
    );

  return (
    <Card>
      <Txt variant="h2">{review.fullName}</Txt>
      <InfoRows
        rows={[
          ["E-mail", review.email],
          ["Telefone", maskPhone(review.phone)],
          ["Cadastro em", formatDateTime(review.createdAt)],
        ]}
      />
      <Txt variant="label">Documentos</Txt>
      <DocumentList files={review.files} />
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}>
          <Button disabled={busy !== null} label="Recusar" loading={busy === "reject"} onPress={() => decide("reject")} variant="secondary" />
        </View>
        <View style={{ flex: 1 }}>
          <Button disabled={busy !== null} label="Aprovar" loading={busy === "approve"} onPress={() => decide("approve")} />
        </View>
      </Row>
    </Card>
  );
}

/** Revisão pela equipe: matrículas com CadÚnico e cadastros de coletores. */
export function ReviewsScreen() {
  const app = useApp();
  const [tab, setTab] = useState<"enrollments" | "collectors">("enrollments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loadReviews } = app;

  useEffect(() => {
    let active = true;
    loadReviews().then((result) => {
      if (!active) return;
      setLoading(false);
      setError(result.ok ? null : result.error ?? null);
    });
    return () => {
      active = false;
    };
    // Carrega uma vez ao abrir; as decisões já recarregam a lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { enrollments, collectors } = app.reviews;

  return (
    <Screen tabs title="Validações">
      <Tabs
        onChange={setTab}
        options={[
          { value: "enrollments", label: "Matrículas", count: enrollments.length },
          { value: "collectors", label: "Coletores", count: collectors.length },
        ]}
        value={tab}
      />
      {error ? <Notice icon="alert-circle-outline" title="Não foi possível carregar" body={error} tone="rose" /> : null}
      {loading ? <Txt center>Carregando…</Txt> : null}
      {!loading && tab === "enrollments" && enrollments.length === 0 ? (
        <EmptyState body="Nenhuma matrícula aguardando validação." icon="school-outline" title="Tudo em dia" />
      ) : null}
      {!loading && tab === "collectors" && collectors.length === 0 ? (
        <EmptyState body="Nenhum cadastro de coletor aguardando aprovação." icon="people-outline" title="Tudo em dia" />
      ) : null}
      {tab === "enrollments"
        ? enrollments.map((review) => <EnrollmentReviewCard key={review.enrollmentId} review={review} />)
        : collectors.map((review) => <CollectorReviewCard key={review.profileId} review={review} />)}
    </Screen>
  );
}
