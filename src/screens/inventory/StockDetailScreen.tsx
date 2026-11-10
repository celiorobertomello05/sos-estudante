import { View } from "react-native";
import Photo from "../../components/Photo";
import Screen from "../../components/Screen";
import { Button, Card, EmptyState, InfoRows, Notice, Pill, Timeline, Txt } from "../../components/ui";
import { categoryLabels, conditionLabels } from "../../domain/labels";
import { hasStockItemAdministrativeDetails } from "../../domain/models";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { formatDateTime } from "../../utils/format";
import { stockTone, stockLabel } from "./shared";
import { styles } from "./styles";

export function StockDetailScreen() {
  const { id } = useRouteParams("stock-detail");
  const app = useApp();
  const { go } = useNav();
  const item = app.stock.find((s) => s.id === id);
  if (!item) {
    return (
      <Screen title="Detalhe do item">
        <EmptyState body="Este item não está mais no estoque." icon="cube-outline" title="Item indisponível" />
      </Screen>
    );
  }
  const isStudent = app.profile?.role === "student";
  const isCollector = app.profile?.role === "collector";
  const administrativeDetails = hasStockItemAdministrativeDetails(item) ? item : null;
  return (
    <Screen
      footer={
        isStudent ? (
          <Button disabled={item.quantity === 0} label="Solicitar este item" onPress={() => go({ name: "request", category: item.category })} />
        ) : isCollector ? (
          <Button label="Registrar movimentação" onPress={() => go({ name: "admin-stock" })} />
        ) : undefined
      }
      title="Detalhe do item"
    >
      <View>
        <Photo imageKey={item.category} style={styles.detailImage} />
        <View style={{ position: "absolute", right: 10, top: 10 }}>
          <Pill label={stockLabel(item)} tone={stockTone(item)} />
        </View>
      </View>
      <View>
        <Txt variant="h1">{categoryLabels[item.category]}</Txt>
        <Txt variant="small">#ITEM-{item.id.toUpperCase()}</Txt>
      </View>
      <Card>
        <InfoRows
          rows={[
            ["Tamanhos", item.sizes.join(", ")],
            ["Quantidade", `${item.quantity} unidades`],
            ["Estado", conditionLabels[item.condition].label],
          ]}
        />
      </Card>
      {isCollector && administrativeDetails ? (
        <>
          <Card>
            <Txt variant="h2">Detalhes internos</Txt>
            <InfoRows
              rows={[
                ["Escola", administrativeDetails.school],
                ["Localização", administrativeDetails.location],
                ["Doador", administrativeDetails.donorName],
              ]}
            />
          </Card>
          <Card>
            <Txt variant="h2">Histórico do item</Txt>
            <Timeline
              steps={[
                { label: "Recebido", detail: formatDateTime(administrativeDetails.receivedAt), done: true },
                { label: "Triado e aprovado", detail: "Checklist de qualidade concluído", done: true },
                { label: "Higienizado e no estoque", detail: administrativeDetails.location, done: true },
              ]}
            />
          </Card>
        </>
      ) : isCollector ? (
        <Notice
          body="Escola, localização, origem e recebimento exigem um endpoint interno para coletor ativo."
          title="Detalhes internos indisponíveis"
        />
      ) : null}
    </Screen>
  );
}
