import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Button, Card, InfoRows, Txt } from "../../components/ui";
import { categoryLabels, conditionLabels, donationStatusMeta } from "../../domain/labels";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors } from "../../theme";
import { formatDateTime } from "../../utils/format";
import { styles } from "./styles";

export function DonationSuccessScreen() {
  const { id } = useRouteParams("donation-success");
  const app = useApp();
  const { reset, replace } = useNav();
  const donation = app.donations.find((d) => d.id === id);
  const point = app.points.find((p) => p.id === donation?.pointId);

  return (
    <Screen
      back={false}
      footer={
        <>
          <Button label="Ir para o início" onPress={() => reset({ name: "dashboard" })} />
          <Button label="Fazer outra doação" onPress={() => replace({ name: "donate" })} variant="secondary" />
        </>
      }
    >
      <View style={styles.successIcon}>
        <View style={styles.successInner}>
          <Ionicons color={colors.brand700} name="checkmark" size={40} />
        </View>
      </View>
      <Txt variant="h1" center>
        Doação registrada!
      </Txt>
      <Txt center>Sua doação foi cadastrada. Leve os itens ao ponto parceiro no dia e horário agendados.</Txt>
      {donation ? (
        <Card tone="brand">
          <Txt variant="label" color={colors.brand700}>
            Protocolo #{donation.protocol}
          </Txt>
          <InfoRows
            rows={[
              ["Tipo", categoryLabels[donation.category]],
              ["Tamanho", donation.size],
              ["Quantidade", `${donation.quantity} ${donation.quantity === 1 ? "unidade" : "unidades"}`],
              ["Estado", conditionLabels[donation.condition].label],
              ["Ponto", point?.name ?? "—"],
              ["Horário", formatDateTime(donation.scheduledFor)],
              ["Status", donationStatusMeta[donation.status].label],
            ]}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
