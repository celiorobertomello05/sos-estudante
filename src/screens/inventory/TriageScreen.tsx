import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Photo from "../../components/Photo";
import Screen from "../../components/Screen";
import { Avatar, Card, EmptyState, Field, Pill, Row, Tabs, Txt } from "../../components/ui";
import { categoryLabels, donationStatusMeta } from "../../domain/labels";
import type { Donation, DonationStatus } from "../../domain/models";
import { donationStatusesAwaitingTriage, isAwaitingTriage } from "../../domain/rules";
import { useApp, useProfile } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { relativeTime } from "../../utils/format";
import { styles } from "./styles";

const checklist = ["Sem rasgos ou manchas", "Higienizado", "Tamanho identificado", "Adequado para uso escolar"];

function TriageCard({ donation }: { donation: Donation }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const point = app.points.find((p) => p.id === donation.pointId);
  const pending = isAwaitingTriage(donation.status);

  const act = async (decision: "approve" | "reject" | "stock") => {
    if (decision === "reject" && note.trim().length < 5) {
      setOpen(true);
      return Alert.alert("Informe o motivo", "Descreva na observação por que o lote foi recusado.");
    }
    if (pending && decision !== "reject" && checked.length < checklist.length) {
      setOpen(true);
      return Alert.alert("Checklist incompleto", "Confirme todos os itens de qualidade antes de aprovar.");
    }
    setBusy(true);
    const result = await app.reviewDonation(donation.id, decision, note.trim() || undefined);
    setBusy(false);
    if (!result.ok) Alert.alert("Erro", result.error);
  };

  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole={pending ? "button" : undefined}
        accessibilityState={pending ? { expanded: open } : undefined}
        onPress={() => pending && setOpen(!open)}
        style={{ flexDirection: "row", gap: spacing.md, padding: spacing.lg }}
      >
        <Photo imageKey={donation.category} style={styles.thumb} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="title">{`${categoryLabels[donation.category]} — Tam. ${donation.size}`}</Txt>
          <Txt variant="small">
            {donation.quantity} un. · Doador: {donation.donorName}
          </Txt>
          <Txt variant="small">{point?.name}</Txt>
          <Txt variant="small" color={colors.ink400}>
            {relativeTime(donation.scheduledFor)}
          </Txt>
        </View>
        <Pill label={donation.status === "received" ? "Triagem pendente" : donationStatusMeta[donation.status].label} tone={donationStatusMeta[donation.status].tone} />
      </Pressable>
      {open && pending ? (
        <View style={{ gap: spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.lg }}>
          <Txt variant="label">Checklist de qualidade</Txt>
          {checklist.map((item) => {
            const on = checked.includes(item);
            return (
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} key={item} onPress={() => setChecked(on ? checked.filter((c) => c !== item) : [...checked, item])}>
                <Row gap={spacing.sm}>
                  <Ionicons color={on ? colors.brand600 : colors.ink400} name={on ? "checkbox" : "square-outline"} size={20} />
                  <Txt>{item}</Txt>
                </Row>
              </Pressable>
            );
          })}
          <Field label="Observação da triagem" maxLength={300} multiline onChangeText={setNote} placeholder="Obrigatória em caso de recusa" value={note} />
        </View>
      ) : null}
      {pending || donation.status === "approved" ? (
        <View style={styles.actions}>
          {pending ? (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => act("reject")} style={styles.action}>
              <Ionicons color={colors.rose500} name="close" size={16} />
              <Txt variant="label" color={colors.rose500}>
                Recusar
              </Txt>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => act("stock")} style={styles.action}>
            <Ionicons color={colors.amber500} name="cube-outline" size={16} />
            <Txt variant="label" color={colors.amber500}>
              Estoque
            </Txt>
          </Pressable>
          {pending ? (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => act("approve")} style={styles.action}>
              <Ionicons color={colors.brand700} name="checkmark" size={16} />
              <Txt variant="label" color={colors.brand700}>
                Aprovar
              </Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

type TriageTab = "pending" | "approved" | "rejected" | "stocked";

const tabStatuses: Record<TriageTab, DonationStatus[]> = {
  pending: donationStatusesAwaitingTriage,
  approved: ["approved"],
  rejected: ["rejected"],
  stocked: ["stocked"],
};

export function TriageScreen() {
  const app = useApp();
  const [tab, setTab] = useState<TriageTab>("pending");
  const count = (t: TriageTab) => app.donations.filter((d) => tabStatuses[t].includes(d.status)).length;
  const list = app.donations.filter((d) => tabStatuses[tab].includes(d.status));
  const profile = useProfile();

  return (
    <Screen tabs title="Triagem de doações">
      <Card>
        <Row>
          <Avatar name={profile.fullName} uri={profile.avatarUri} />
          <View style={{ flex: 1 }}>
            <Row gap={6}>
              <Txt variant="title">{profile.fullName}</Txt>
              <Pill label={profile.status === "active" ? "Turno ativo" : "Em análise"} tone={profile.status === "active" ? "trust" : "amber"} />
            </Row>
            <Txt variant="small">Toque num lote para abrir o checklist</Txt>
          </View>
        </Row>
      </Card>
      <Tabs
        onChange={setTab}
        options={[
          { value: "pending", label: "Aguardando" },
          { value: "approved", label: "Aprovado" },
          { value: "rejected", label: "Recusado" },
          { value: "stocked", label: "Estoque" },
        ]}
        value={tab}
      />
      <Row gap={0}>
        {(["pending", "approved", "rejected", "stocked"] as TriageTab[]).map((t, i) => (
          <View key={t} style={{ flex: 1, alignItems: "center" }}>
            <Txt variant="h2" color={[colors.amber500, colors.brand700, colors.rose500, colors.trust600][i]}>
              {count(t)}
            </Txt>
          </View>
        ))}
      </Row>
      {list.length === 0 ? <EmptyState body="Nenhum lote nesta etapa." icon="checkmark-done-outline" title="Tudo em dia" /> : null}
      {list.map((d) => (
        <TriageCard donation={d} key={d.id} />
      ))}
    </Screen>
  );
}
