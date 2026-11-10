import { useState } from "react";
import { Alert } from "react-native";
import Screen from "../../components/Screen";
import { Button, Field } from "../../components/ui";
import { useNav } from "../../navigation/Navigator";
import { useApp, useProfile } from "../../store/AppStore";
import { maskCep, maskCnpj, maskCpf, maskRg, maskPhoneInput } from "../../utils/format";
import { cleanText, isValidCep, isValidPhone, onlyDigits } from "../../utils/validation";

export function PersonalDataScreen() {
  const app = useApp();
  const { back } = useNav();
  const profile = useProfile();
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(maskPhoneInput(profile.phone ?? ""));
  const [postalCode, setPostalCode] = useState(maskCep(profile.postalCode ?? ""));
  const [address, setAddress] = useState(profile.address ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const doc = profile.document ?? "";
  const maskedDoc = doc.length === 14 ? maskCnpj(doc) : doc ? maskCpf(doc).replace(/^\d{3}\.\d{3}/, "***.***") : "—";

  const save = async () => {
    const e: Record<string, string> = {};
    if (cleanText(fullName).split(" ").length < 2) e.fullName = "Informe nome e sobrenome.";
    if (!isValidPhone(phone)) e.phone = "Telefone inválido.";
    if (postalCode && !isValidCep(postalCode)) e.postalCode = "CEP inválido.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const result = await app.updateProfile({ fullName: cleanText(fullName, 120), phone: onlyDigits(phone), postalCode: onlyDigits(postalCode), address: cleanText(address, 200) });
    setLoading(false);
    if (!result.ok) return Alert.alert("Erro", result.error);
    Alert.alert("Dados atualizados", "Suas informações foram salvas.");
    back();
  };

  return (
    <Screen footer={<Button label="Salvar alterações" loading={loading} onPress={save} />} title="Dados pessoais">
      <Field error={errors.fullName} label="Nome completo" onChangeText={setFullName} value={fullName} />
      <Field editable={false} hint="Para alterar o e-mail, fale com o suporte." label="E-mail" value={profile.email} />
      <Field editable={false} hint="Documento protegido. Apenas os últimos dígitos ficam visíveis." label={doc.length === 14 ? "CNPJ" : "CPF"} value={maskedDoc} />
      {profile.rg ? <Field editable={false} hint="Documento protegido. Para corrigir, fale com o suporte." label="RG" value={maskRg(profile.rg)} /> : null}
      <Field error={errors.phone} keyboardType="phone-pad" label="Telefone" onChangeText={(v) => setPhone(maskPhoneInput(v))} value={phone} />
      <Field error={errors.postalCode} keyboardType="number-pad" label="CEP" onChangeText={(v) => setPostalCode(maskCep(v))} value={postalCode} />
      <Field label="Endereço" onChangeText={setAddress} value={address} />
    </Screen>
  );
}
