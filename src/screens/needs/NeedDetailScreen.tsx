import { useEffect, useState } from "react";
import { Alert } from "react-native";
import Screen from "../../components/Screen";
import { Button, Card, EmptyState, InfoRows, Notice, Txt } from "../../components/ui";
import { categoryLabels } from "../../domain/labels";
import { interestedLabel, needTitle } from "../../domain/needs";
import type { OpenNeed } from "../../domain/needs";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { formatDateTime } from "../../utils/format";

/** Detalhes de uma necessidade (anônima) e confirmação do interesse em ajudar. */
export function NeedDetailScreen() {
  const { id } = useRouteParams("need-detail");
  const app = useApp();
  const { replace } = useNav();
  const [need, setNeed] = useState<OpenNeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { loadNeeds } = app;

  useEffect(() => {
    let active = true;
    loadNeeds().then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.ok || !result.value) return setError(result.error ?? "Não foi possível carregar a necessidade.");
      setNeed(result.value.needs.find((item) => item.id === id) ?? null);
    });
    return () => {
      active = false;
    };
    // Carrega uma vez ao abrir a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const confirm = () =>
    Alert.alert("Demonstrar interesse", "Vamos avisar o estudante, sem revelar quem é você. Depois, leve a doação a um ponto parceiro.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quero ajudar",
        onPress: async () => {
          setSaving(true);
          const result = await app.expressInterest(id);
          setSaving(false);
          if (!result.ok) return Alert.alert("Não foi possível registrar", result.error);
          replace({ name: "need-success", id });
        },
      },
    ]);

  return (
    <Screen
      footer={need && !need.mine ? <Button label="Demonstrar interesse" loading={saving} onPress={confirm} /> : undefined}
      title="Detalhes da necessidade"
    >
      {loading ? <Txt center>Carregando…</Txt> : null}
      {error ? <Notice icon="alert-circle-outline" title="Não foi possível carregar" body={error} tone="rose" /> : null}
      {!loading && !error && !need ? (
        <EmptyState body="Esta necessidade já foi atendida ou não está mais aberta." icon="checkmark-circle-outline" title="Necessidade indisponível" />
      ) : null}
      {need ? (
        <>
          <Card tone="brand">
            <Txt variant="h2">{needTitle(need)}</Txt>
            <InfoRows
              rows={[
                ["Item", categoryLabels[need.category]],
                ["Tamanho", need.size],
                ["Quantidade", `${need.quantity} ${need.quantity === 1 ? "unidade" : "unidades"}`],
                ["Bairro de retirada", need.district],
                ["Registrada em", formatDateTime(need.createdAt)],
                ["Interessados", interestedLabel(need)],
              ]}
            />
          </Card>
          <Notice
            body="Para proteger o estudante, o pedido é anônimo: você não vê nome, escola nem documentos. A doação é entregue em um ponto parceiro e passa pela triagem."
            icon="shield-checkmark-outline"
            title="Privacidade"
          />
          {need.mine ? <Notice body="Você já demonstrou interesse nesta necessidade. Acompanhe o status em Meus interesses." icon="checkmark-circle-outline" title="Interesse registrado" /> : null}
        </>
      ) : null}
    </Screen>
  );
}
