import { useState } from "react";
import { Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { Button, Card, Chips, Field, Notice, OptionCard, Row, Txt } from "../../components/ui";
import { ACCOUNT_DOCUMENTS } from "../../domain/documents";
import type { AccountDocumentKey } from "../../domain/documents";
import type { DonorKind } from "../../domain/models";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors } from "../../theme";
import { maskCep, maskCnpj, maskCpf, maskDate, maskPhoneInput } from "../../utils/format";
import { chooseImage } from "../../utils/media";
import { isValidCep, isValidCnpj, isValidCpf, isValidPhone, isValidRg, parseBirthDate } from "../../utils/validation";

/**
 * Quem entra pelo Google só autentica: completa aqui os mesmos dados do
 * cadastro por e-mail e envia os documentos.
 */
export function CompleteProfileScreen() {
  const app = useApp();
  const { reset } = useNav();
  const profile = app.profile;
  const role = profile?.role ?? "student";
  const [donorKind, setDonorKind] = useState<DonorKind>(profile?.donorKind ?? "individual");
  const [form, setForm] = useState({
    fullName: profile?.fullName ?? "",
    document: "",
    rg: "",
    birthDate: "",
    phone: profile?.phone ? maskPhoneInput(profile.phone) : "",
    postalCode: profile?.postalCode ? maskCep(profile.postalCode) : "",
    address: profile?.address ?? "",
  });
  const [docs, setDocs] = useState<Partial<Record<AccountDocumentKey, string>>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const isCompany = role === "donor" && donorKind === "company";
  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().split(/\s+/).length < 2) e.fullName = isCompany ? "Informe a razão social." : "Informe nome e sobrenome.";
    if (isCompany ? !isValidCnpj(form.document) : !isValidCpf(form.document)) e.document = isCompany ? "CNPJ inválido." : "CPF inválido.";
    if (!isCompany && !isValidRg(form.rg)) e.rg = "Informe o número do RG.";
    if (role === "student" && !parseBirthDate(form.birthDate)) e.birthDate = "Data inválida. Use DD/MM/AAAA.";
    if (!isValidPhone(form.phone)) e.phone = "Telefone inválido.";
    if (!isValidCep(form.postalCode)) e.postalCode = "CEP inválido.";
    if (form.address.trim().length < 5) e.address = "Informe o endereço.";
    const missing = ACCOUNT_DOCUMENTS[role].filter((d) => !docs[d.key]);
    if (missing.length) e.docs = `Anexe: ${missing.map((d) => d.label).join(", ")}.`;
    if (!acceptedTerms) e.terms = "É preciso aceitar os termos para continuar.";
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setLoading(true);
    const result = await app.completeProfile(
      {
        fullName: form.fullName.trim(),
        document: form.document,
        rg: isCompany ? undefined : form.rg,
        birthDate: role === "student" ? parseBirthDate(form.birthDate) ?? undefined : undefined,
        donorKind: role === "donor" ? donorKind : undefined,
        phone: form.phone,
        postalCode: form.postalCode,
        address: form.address.trim(),
      },
      docs,
    );
    setLoading(false);
    if (!result.ok) return Alert.alert("Não foi possível concluir", result.error);
    Alert.alert("Cadastro concluído", "Seu login Google ficou vinculado a esta conta.");
    reset({ name: "dashboard" });
  };

  return (
    <Screen footer={<Button label="Concluir cadastro" loading={loading} onPress={submit} />} title="Completar cadastro">
      <Notice
        icon="person-add-outline"
        title="Falta pouco"
        body="O Google só confirma quem você é. Para usar o SOS Estudante, informe os mesmos dados e documentos do cadastro."
      />
      {role === "donor" ? (
        <Chips
          onChange={(v) => (setDonorKind(v), set("document")(""))}
          options={[
            { value: "individual", label: "Pessoa física" },
            { value: "company", label: "Empresa" },
          ]}
          value={donorKind}
        />
      ) : null}
      <Field error={errors.fullName} label={isCompany ? "Razão social" : "Nome completo"} onChangeText={set("fullName")} required value={form.fullName} />
      <Field
        error={errors.document}
        keyboardType="number-pad"
        label={isCompany ? "CNPJ" : "CPF"}
        onChangeText={(v) => set("document")(isCompany ? maskCnpj(v) : maskCpf(v))}
        placeholder={isCompany ? "00.000.000/0000-00" : "000.000.000-00"}
        required
        value={form.document}
      />
      {!isCompany ? (
        <Field autoCapitalize="characters" error={errors.rg} label="RG" onChangeText={set("rg")} placeholder="00.000.000-0" required value={form.rg} />
      ) : null}
      {role === "student" ? (
        <Field error={errors.birthDate} keyboardType="number-pad" label="Data de nascimento" onChangeText={(v) => set("birthDate")(maskDate(v))} placeholder="DD/MM/AAAA" required value={form.birthDate} />
      ) : null}
      <Field error={errors.phone} keyboardType="phone-pad" label="Telefone" onChangeText={(v) => set("phone")(maskPhoneInput(v))} placeholder="(11) 90000-0000" required value={form.phone} />
      <Field error={errors.postalCode} keyboardType="number-pad" label="CEP" onChangeText={(v) => set("postalCode")(maskCep(v))} placeholder="00000-000" required value={form.postalCode} />
      <Field error={errors.address} label="Endereço" onChangeText={set("address")} placeholder="Rua, número e bairro" required value={form.address} />
      <Txt variant="label">Documentos</Txt>
      {role === "student" ? (
        <Notice icon="school-outline" title="Matrícula e CadÚnico" body="Depois, envie a declaração de matrícula e a folha resumo do CadÚnico em Perfil › Escola e matrícula." />
      ) : null}
      {ACCOUNT_DOCUMENTS[role].map((document) => {
        const attached = Boolean(docs[document.key]);
        return (
          <OptionCard
            detail={attached ? "Arquivo anexado — toque para trocar" : "Toque para fotografar ou escolher"}
            icon={attached ? "checkmark-circle-outline" : "document-attach-outline"}
            key={document.key}
            onPress={() => chooseImage((uri) => setDocs((d) => ({ ...d, [document.key]: uri })))}
            selected={attached}
            title={document.label}
          />
        );
      })}
      {errors.docs ? (
        <Txt variant="small" color={colors.rose500}>
          {errors.docs}
        </Txt>
      ) : null}
      <Card>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }} onPress={() => setAcceptedTerms(!acceptedTerms)}>
          <Row style={{ alignItems: "flex-start" }}>
            <Ionicons color={acceptedTerms ? colors.brand600 : colors.ink400} name={acceptedTerms ? "checkbox" : "square-outline"} size={22} />
            <Txt variant="small" style={{ flex: 1 }}>
              Li e aceito os Termos de Uso e a Política de Privacidade, incluindo o tratamento dos meus dados conforme a LGPD.
            </Txt>
          </Row>
        </Pressable>
      </Card>
      {errors.terms ? (
        <Txt variant="small" color={colors.rose500}>
          {errors.terms}
        </Txt>
      ) : null}
    </Screen>
  );
}
