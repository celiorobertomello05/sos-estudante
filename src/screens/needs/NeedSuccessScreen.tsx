import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Button, Card, Txt } from "../../components/ui";
import { useNav } from "../../navigation/Navigator";
import { colors } from "../../theme";
import { styles } from "../donations/styles";

/** Confirmação do interesse: próximos passos e acesso ao status. */
export function NeedSuccessScreen() {
  const { reset, replace } = useNav();
  return (
    <Screen
      back={false}
      footer={
        <>
          <Button label="Doar agora" onPress={() => replace({ name: "donate" })} />
          <Button label="Ver meus interesses" onPress={() => replace({ name: "needs" })} variant="secondary" />
          <Button label="Ir para o início" onPress={() => reset({ name: "dashboard" })} variant="ghost" />
        </>
      }
    >
      <View style={styles.successIcon}>
        <View style={styles.successInner}>
          <Ionicons color={colors.brand700} name="heart" size={40} />
        </View>
      </View>
      <Txt variant="h1" center>
        Interesse registrado!
      </Txt>
      <Txt center>O estudante foi avisado, sem saber quem você é. Agora é só doar o item em um ponto parceiro.</Txt>
      <Card tone="brand">
        <Txt variant="label" color={colors.brand700}>
          Próximos passos
        </Txt>
        <Txt variant="small">1. Em Doar, cadastre a doação com o mesmo item e tamanho.</Txt>
        <Txt variant="small">2. Leve a peça ao ponto no horário agendado.</Txt>
        <Txt variant="small">3. Acompanhe o status do pedido em Necessidades › Meus interesses.</Txt>
      </Card>
    </Screen>
  );
}
