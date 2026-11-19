import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Card, EmptyState, ListRow, Tabs, Txt } from "../../components/ui";
import { buildAgenda } from "../../domain/agenda";
import { useApp, useProfile } from "../../store/AppStore";
import { colors } from "../../theme";
import { formatDateTime } from "../../utils/format";

/** RU04: calendário com as datas do usuário (entregas e retiradas agendadas). */
export function AgendaScreen() {
  const app = useApp();
  const { role } = useProfile();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const entries = useMemo(() => buildAgenda(role, { requests: app.requests, donations: app.donations, points: app.points }), [role, app.requests, app.donations, app.points]);
  const shown = entries.filter((entry) => entry.past === (tab === "past"));
  const next = entries.find((entry) => !entry.past);

  return (
    <Screen title="Calendário">
      <Card tone="brand">
        <Ionicons color={colors.brand700} name="calendar-outline" size={22} />
        <Txt variant="title">{next ? "Próxima data" : "Nenhuma data marcada"}</Txt>
        <Txt variant="small">{next ? `${formatDateTime(next.date)} · ${next.title}` : "Quando você agendar uma doação ou tiver uma retirada, a data aparece aqui."}</Txt>
      </Card>
      <Tabs
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Próximas", count: entries.filter((entry) => !entry.past).length },
          { value: "past", label: "Anteriores", count: entries.filter((entry) => entry.past).length },
        ]}
        value={tab}
      />
      {shown.length === 0 ? <EmptyState body="Nada por aqui ainda." icon="calendar-clear-outline" title={tab === "upcoming" ? "Sem datas próximas" : "Sem datas anteriores"} /> : null}
      {shown.map((entry) => (
        <ListRow
          detail={`${formatDateTime(entry.date)} · ${entry.detail}`}
          icon={entry.kind === "donation" ? "heart-outline" : "cube-outline"}
          key={entry.id}
          title={entry.title}
          tone={entry.kind === "donation" ? "trust" : "brand"}
        />
      ))}
    </Screen>
  );
}
