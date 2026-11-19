import { useState } from "react";
import { Alert } from "react-native";
import Screen from "../../components/Screen";
import { Button, Field, Notice, Txt } from "../../components/ui";
import { POINT_LIMITS, pointInputIssue } from "../../domain/pointRegistration";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";

/** Cadastro de ponto de coleta pela equipe. O aparelho localiza o endereço no mapa. */
export function PointFormScreen() {
  const app = useApp();
  const { back } = useNav();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [hours, setHours] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const input = { name, address, district, hours, capacity };
    const issue = pointInputIssue(input);
    if (issue) return setError(issue);
    setError(null);
    setLoading(true);
    const result = await app.createPoint(input);
    setLoading(false);
    if (!result.ok) return setError(result.error ?? "Não foi possível cadastrar agora. Tente novamente.");
    Alert.alert("Ponto cadastrado", "O ponto já aparece em Locais de retirada e no mapa.", [{ text: "OK", onPress: back }]);
  };

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setError(null);
  };

  return (
    <Screen title="Cadastrar ponto de coleta">
      <Txt>Informe os dados do local. Procuramos o endereço no mapa para posicionar o ponto automaticamente.</Txt>
      <Field label="Nome do ponto" maxLength={POINT_LIMITS.name.max} onChangeText={edit(setName)} placeholder="Ex.: Escola Municipal Centro" required value={name} />
      <Field label="Endereço" maxLength={POINT_LIMITS.address.max} onChangeText={edit(setAddress)} placeholder="Rua, número e cidade" required value={address} />
      <Field label="Bairro" maxLength={POINT_LIMITS.district.max} onChangeText={edit(setDistrict)} required value={district} />
      <Field label="Horário de funcionamento" maxLength={POINT_LIMITS.hours.max} onChangeText={edit(setHours)} placeholder="Ex.: Seg a Sex, 9h às 17h" required value={hours} />
      <Field hint={`De ${POINT_LIMITS.capacity.min} a ${POINT_LIMITS.capacity.max} lotes por semana`} keyboardType="number-pad" label="Capacidade" maxLength={3} onChangeText={edit(setCapacity)} required value={capacity} />
      {error ? <Notice icon="alert-circle-outline" title="Confira os dados" body={error} tone="rose" /> : null}
      <Button label="Cadastrar ponto" loading={loading} onPress={save} />
    </Screen>
  );
}
