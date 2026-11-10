import { Alert, Pressable } from "react-native";
import Grid from "../../components/Grid";
import { Card, ListRow, Pill, SectionTitle, Txt } from "../../components/ui";
import { categoryLabels, donationStatusMeta, movementMeta, requestStatusMeta } from "../../domain/labels";
import { isOpenRequest } from "../../domain/rules";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors, spacing, tones } from "../../theme";
import { formatDateTime, relativeTime } from "../../utils/format";
import { Banner } from "./Banner";
import { styles } from "./styles";

/** Bloco do estudante: próxima retirada e pedido de reagendamento. */
export function StudentHome() {
  const app = useApp();
  const { go } = useNav();
  const nextPickup = app.requests.find((r) => r.status === "ready") ?? app.requests.find((r) => isOpenRequest(r.status));

  const askReschedule = () =>
    Alert.alert("Reagendar retirada", "Vamos avisar a equipe de distribuição para combinar um novo horário com você.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Solicitar",
        onPress: async () => {
          const result = await app.openTicket("Reagendamento de retirada", `Pedido ${nextPickup?.protocol}: gostaria de reagendar a retirada.`);
          Alert.alert(result.ok ? "Pedido enviado" : "Erro", result.ok ? `Protocolo ${result.value}. Você será avisado.` : result.error);
        },
      },
    ]);

  return (
    <>
      {/* Banners de campanha só na demonstração: não há campanhas cadastradas. */}
      {app.isDemo ? <Banner action="Ver itens" eyebrow="Novidade perto de você" imageKey="agasalho" onPress={() => go({ name: "stock" })} title="Novos kits de inverno disponíveis" /> : null}
      {nextPickup ? (
        <Card>
          <Txt variant="caption">Próxima retirada</Txt>
          <ListRow
            flat
            detail={`${formatDateTime(nextPickup.pickupAt)} · ${app.points.find((p) => p.id === nextPickup.pointId)?.name ?? ""}`}
            icon="clipboard-outline"
            onPress={() => go({ name: "request-detail", id: nextPickup.id })}
            title={nextPickup.status === "ready" ? "Kit pronto para retirada" : requestStatusMeta[nextPickup.status].label}
            tone="trust"
          />
          <Pressable accessibilityRole="button" onPress={askReschedule} style={styles.softButton}>
            <Txt variant="label" color={colors.trust600}>
              Reagendar com o distribuidor
            </Txt>
          </Pressable>
        </Card>
      ) : null}
    </>
  );
}

/** Bloco do doador: próxima entrega agendada no ponto. */
export function DonorHome() {
  const app = useApp();
  const { go } = useNav();
  const nextDonation = app.donations.find((d) => d.status === "scheduled");
  return (
    <>
      {app.isDemo ? <Banner action="Doar agora" eyebrow="Campanha de inverno" imageKey="jaqueta" onPress={() => go({ name: "donate" })} title="Agasalhos e jaquetas são os mais pedidos" /> : null}
      {nextDonation ? (
        <Card>
          <Txt variant="caption">Próxima entrega no ponto</Txt>
          <ListRow
            flat
            detail={`${formatDateTime(nextDonation.scheduledFor)} · ${app.points.find((p) => p.id === nextDonation.pointId)?.name ?? ""}`}
            icon="calendar-outline"
            onPress={() => go({ name: "donate", tab: "agenda" })}
            title={`${nextDonation.quantity}× ${categoryLabels[nextDonation.category]}`}
            trailing={<Pill label={donationStatusMeta[nextDonation.status].label} tone={donationStatusMeta[nextDonation.status].tone} />}
          />
        </Card>
      ) : null}
    </>
  );
}

/** Bloco da equipe: atalhos do painel e últimas movimentações. */
export function CollectorHome() {
  const app = useApp();
  const { go } = useNav();
  return (
    <>
      <Grid gap={spacing.sm} minItemWidth={150}>
        <ListRow icon="stats-chart-outline" onPress={() => go({ name: "admin" })} title="Painel" tone="trust" />
        <ListRow icon="map-outline" onPress={() => go({ name: "impact-map" })} title="Mapa" tone="purple" />
      </Grid>
      <SectionTitle action={{ label: "Ver tudo", onPress: () => go({ name: "admin-stock" }) }}>Movimentações recentes</SectionTitle>
      {app.movements.slice(0, 3).map((m) => (
        <ListRow
          detail={`${m.from} → ${m.to} · ${relativeTime(m.createdAt)}`}
          icon="swap-horizontal-outline"
          key={m.id}
          title={m.label}
          tone={movementMeta[m.type].tone}
          trailing={<Txt variant="title" color={tones[movementMeta[m.type].tone].fg}>{`${movementMeta[m.type].sign}${m.quantity}`}</Txt>}
        />
      ))}
    </>
  );
}
