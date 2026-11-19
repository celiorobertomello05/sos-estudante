import { useEffect, useMemo, useState } from "react";
import Screen from "../../components/Screen";
import { categoryIcons } from "../../components/icons";
import { Chips, EmptyState, Field, ListRow, Notice, Pill, Tabs, Txt } from "../../components/ui";
import { categoryLabels, requestStatusMeta } from "../../domain/labels";
import type { ItemCategory } from "../../domain/models";
import { filterNeeds, interestedLabel, isNeedOpen, needTitle } from "../../domain/needs";
import type { MyInterest, OpenNeed } from "../../domain/needs";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { relativeTime } from "../../utils/format";

const categoryOptions: { value: ItemCategory | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  ...(Object.keys(categoryLabels) as ItemCategory[]).map((value) => ({ value, label: categoryLabels[value] })),
];

/** US05: o doador busca necessidades abertas (anônimas) e acompanha seus interesses. */
export function NeedsScreen() {
  const app = useApp();
  const { go } = useNav();
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [category, setCategory] = useState<ItemCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [needs, setNeeds] = useState<OpenNeed[]>([]);
  const [interests, setInterests] = useState<MyInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loadNeeds } = app;

  useEffect(() => {
    let active = true;
    loadNeeds().then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.ok || !result.value) return setError(result.error ?? "Não foi possível carregar as necessidades.");
      setError(null);
      setNeeds(result.value.needs);
      setInterests(result.value.interests);
    });
    return () => {
      active = false;
    };
    // Carrega uma vez ao abrir a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => filterNeeds(needs, category, query), [needs, category, query]);

  return (
    <Screen tabs title="Necessidades">
      <Txt>Veja o que estudantes da região precisam e demonstre interesse em ajudar. Os pedidos são anônimos: você não vê quem recebe.</Txt>
      <Tabs
        onChange={setTab}
        options={[
          { value: "open", label: "Abertas", count: needs.length },
          { value: "mine", label: "Meus interesses", count: interests.length },
        ]}
        value={tab}
      />
      {error ? <Notice icon="alert-circle-outline" title="Não foi possível carregar" body={error} tone="rose" /> : null}
      {loading ? <Txt center>Carregando necessidades…</Txt> : null}

      {!loading && !error && tab === "open" ? (
        <>
          <Field label="Buscar" onChangeText={setQuery} placeholder="Item, tamanho ou bairro" value={query} />
          <Chips onChange={setCategory} options={categoryOptions} value={category} />
          {filtered.length === 0 ? (
            <EmptyState body="Quando um estudante solicitar itens, a necessidade aparece aqui." icon="heart-outline" title="Nenhuma necessidade aberta" />
          ) : null}
          {filtered.map((need) => (
            <ListRow
              detail={`${need.district} · ${relativeTime(need.createdAt)}`}
              icon={categoryIcons[need.category]}
              key={need.id}
              onPress={() => go({ name: "need-detail", id: need.id })}
              title={needTitle(need)}
              tone={need.mine ? "brand" : "trust"}
              trailing={<Pill label={interestedLabel(need)} tone={need.mine ? "brand" : "neutral"} />}
            />
          ))}
        </>
      ) : null}

      {!loading && !error && tab === "mine" ? (
        <>
          {interests.length === 0 ? (
            <EmptyState body="Ao demonstrar interesse em uma necessidade, ela aparece aqui com o status do pedido." icon="time-outline" title="Nenhum interesse ainda" />
          ) : null}
          {interests.map((interest) => (
            <ListRow
              detail={`${interest.district} · ${relativeTime(interest.createdAt)}`}
              icon={categoryIcons[interest.category]}
              key={interest.id}
              onPress={isNeedOpen(interest.status) ? () => go({ name: "need-detail", id: interest.needId }) : undefined}
              title={needTitle(interest)}
              tone="brand"
              trailing={<Pill label={requestStatusMeta[interest.status].label} tone={requestStatusMeta[interest.status].tone} />}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
