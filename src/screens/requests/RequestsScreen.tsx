import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Button, Card, EmptyState, Row, Txt } from "../../components/ui";
import { isOpenRequest } from "../../domain/rules";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors } from "../../theme";
import { styles } from "./styles";
import { RequestCard } from "./RequestCard";

export function RequestsScreen() {
  const app = useApp();
  const { go } = useNav();
  const received = app.requests.filter((r) => r.status === "delivered").reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.quantityApproved, 0), 0);
  return (
    <Screen
      right={
        <Pressable accessibilityLabel="Nova solicitação" accessibilityRole="button" onPress={() => go({ name: "request" })} style={styles.plus}>
          <Ionicons color={colors.white} name="add" size={20} />
        </Pressable>
      }
      tabs
      title="Minhas solicitações"
    >
      <Card padded={false}>
        <Row gap={0}>
          {[
            [app.requests.length, "Total"],
            [app.requests.filter((r) => isOpenRequest(r.status)).length, "Ativas"],
            [received, "Itens recebidos"],
          ].map(([value, label], i) => (
            <View key={String(label)} style={[styles.statCell, i > 0 && { borderLeftColor: colors.ink100, borderLeftWidth: 1 }]}>
              <Txt variant="h2" center color={i === 1 ? colors.brand700 : colors.ink900}>
                {value}
              </Txt>
              <Txt variant="small" center>
                {label}
              </Txt>
            </View>
          ))}
        </Row>
      </Card>
      {app.requests.length === 0 ? (
        <EmptyState action={<Button label="Fazer solicitação" onPress={() => go({ name: "request" })} />} body="Peça uniformes e materiais escolares disponíveis na sua região." icon="clipboard-outline" title="Nenhuma solicitação" />
      ) : null}
      {app.requests.map((r) => (
        <RequestCard key={r.id} onPress={() => go({ name: "request-detail", id: r.id })} request={r} />
      ))}
    </Screen>
  );
}
