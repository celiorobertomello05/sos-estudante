import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Button, Card, InfoRows, Txt } from "../../components/ui";
import { requestStatusMeta } from "../../domain/labels";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors } from "../../theme";
import { itemsSummary } from "../../utils/requestPresentation";
import { styles } from "./styles";

export function RequestSuccessScreen() {
  const { id } = useRouteParams("request-success");
  const app = useApp();
  const { reset, replace } = useNav();
  const request = app.requests.find((r) => r.id === id);
  return (
    <Screen
      back={false}
      footer={
        <>
          <Button label="Acompanhar solicitação" onPress={() => replace({ name: "request-detail", id })} tone="trust" />
          <Button label="Voltar ao início" onPress={() => reset({ name: "dashboard" })} variant="ghost" />
        </>
      }
    >
      <View style={styles.successIcon}>
        <Ionicons color={colors.trust600} name="clipboard-outline" size={40} />
      </View>
      <Txt variant="h1" center>
        Solicitação enviada!
      </Txt>
      <Txt center>Sua solicitação foi registrada e está em análise. Você será notificado quando for aprovada.</Txt>
      {request ? (
        <Card tone="trust">
          <Txt variant="label">#{request.protocol}</Txt>
          <InfoRows
            rows={[
              ["Status", requestStatusMeta[request.status].label],
              ["Escola vinculada", request.schoolName],
              ["Itens", itemsSummary(request.items)],
              ["Retirada", app.points.find((p) => p.id === request.pointId)?.name ?? "—"],
              ["Próximo passo", "Análise da equipe; você recebe o aviso no app"],
            ]}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
