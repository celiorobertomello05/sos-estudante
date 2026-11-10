import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { roleIcons } from "../../components/icons";
import { Button, Card, Chips, Field, Notice, OptionCard, Row, Txt } from "../../components/ui";
import { env, isSupabaseConfigured } from "../../config/env";
import { roleLabels } from "../../domain/labels";
import { ACCOUNT_DOCUMENTS } from "../../domain/documents";
import type { AccountDocumentKey } from "../../domain/documents";
import type { DonorKind, UserRole } from "../../domain/models";
import { useNav, useRouteParams } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors } from "../../theme";
import { maskCep, maskCnpj, maskCpf, maskDate, maskPhoneInput } from "../../utils/format";
import { chooseImage } from "../../utils/media";
import { isValidCep, isValidCnpj, isValidCpf, isValidEmail, isValidPhone, isValidRg, parseBirthDate, passwordIssue } from "../../utils/validation";
import { CONFIGURATION_ERROR, roles } from "./shared";
import { styles } from "./styles";

export function RegisterScreen() {
  const params = useRouteParams("register");
  const app = useApp();
  const { back, reset } = useNav();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>(params.role);
  const [donorKind, setDonorKind] = useState<DonorKind>("individual");
  const [form, setForm] = useState({ fullName: "", document: "", rg: "", birthDate: "", phone: "", postalCode: "", address: "", email: "", password: "", confirm: "" });
  const [docs, setDocs] = useState<Partial<Record<AccountDocumentKey, string>>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const isCompany = role === "donor" && donorKind === "company";
  const documentsNeeded = ACCOUNT_DOCUMENTS[role];

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (form.fullName.trim().split(/\s+/).length < 2) e.fullName = isCompany ? "Informe a razão social." : "Informe nome e sobrenome.";
      if (isCompany ? !isValidCnpj(form.document) : !isValidCpf(form.document)) e.document = isCompany ? "CNPJ inválido." : "CPF inválido.";
      if (!isCompany && !isValidRg(form.rg)) e.rg = "Informe o número do RG.";
      if (role === "student" && !parseBirthDate(form.birthDate)) e.birthDate = "Data inválida. Use DD/MM/AAAA.";
      if (!isValidPhone(form.phone)) e.phone = "Telefone inválido.";
    }
    if (step === 2) {
      if (!isValidCep(form.postalCode)) e.postalCode = "CEP inválido.";
      if (form.address.trim().length < 5) e.address = "Informe o endereço.";
      if (!isValidEmail(form.email)) e.email = "E-mail inválido.";
      const issue = passwordIssue(form.password);
      if (issue) e.password = issue;
      if (form.password !== form.confirm) e.confirm = "As senhas não conferem.";
    }
    if (step === 3) {
      const missing = documentsNeeded.filter((d) => !docs[d.key]);
      if (missing.length) e.docs = `Anexe: ${missing.map((d) => d.label).join(", ")}.`;
      if (!acceptedTerms) e.terms = "É preciso aceitar os termos para continuar.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validate()) return;
    if (step < 3) return setStep(step + 1);
    if (!isSupabaseConfigured) {
      if (!env.demoModeEnabled) {
        Alert.alert("Configuração necessária", CONFIGURATION_ERROR);
        return;
      }
      app.enterDemo(role, { fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone, donorKind });
      return reset({ name: "dashboard" });
    }
    setLoading(true);
    const result = await app.signUp(
      {
        role,
        fullName: form.fullName,
        document: form.document,
        rg: isCompany ? undefined : form.rg,
        birthDate: parseBirthDate(form.birthDate) ?? undefined,
        email: form.email,
        phone: form.phone,
        password: form.password,
        donorKind: role === "donor" ? donorKind : undefined,
        postalCode: form.postalCode,
        address: form.address,
      },
      docs,
    );
    setLoading(false);
    if (!result.ok) return Alert.alert("Não foi possível criar a conta", result.error);
    if (result.value?.needsEmailConfirmation) {
      Alert.alert(
        "Confirme seu e-mail",
        "Enviamos um link de confirmação. Depois de entrar, envie seus documentos em Perfil › Meus documentos.",
      );
      return reset({ name: "login" });
    }
    reset({ name: "dashboard" });
  };

  const labels = ["Identificação", "Acesso e endereço", "Documentos"];

  return (
    <Screen
      back={() => (step > 1 ? setStep(step - 1) : back())}
      footer={<Button label={step === 3 ? "Concluir cadastro" : "Continuar"} loading={loading} onPress={next} />}
      title="Criar conta"
    >
      <View style={{ gap: 6 }}>
        <Row gap={6}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[styles.progress, n <= step && { backgroundColor: colors.brand600 }]} />
          ))}
        </Row>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt variant="label">{labels[step - 1]}</Txt>
          <Txt variant="small">Passo {step} de 3</Txt>
        </Row>
      </View>

      {step === 1 ? (
        <>
          <Txt variant="label">Tipo de usuário</Txt>
          {roles.map((r) => (
            <OptionCard
              detail={roleLabels[r].description}
              icon={roleIcons[r]}
              key={r}
              onPress={() => (setRole(r), setDocs({}))}
              selected={role === r}
              title={roleLabels[r].long}
            />
          ))}
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
          <Field error={errors.fullName} label={isCompany ? "Razão social" : "Nome completo"} onChangeText={set("fullName")} placeholder={isCompany ? "Papelaria Avenida Ltda." : "Ana Carolina Santos"} required value={form.fullName} />
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
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Field error={errors.postalCode} keyboardType="number-pad" label="CEP" onChangeText={(v) => set("postalCode")(maskCep(v))} placeholder="00000-000" required value={form.postalCode} />
          <Field error={errors.address} label="Endereço" onChangeText={set("address")} placeholder="Rua, número e bairro" required value={form.address} />
          <Field autoCapitalize="none" error={errors.email} keyboardType="email-address" label="E-mail" onChangeText={set("email")} placeholder="seuemail@exemplo.com" required value={form.email} />
          <Field error={errors.password} hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número." label="Crie uma senha" onChangeText={set("password")} required secure value={form.password} />
          <Field error={errors.confirm} label="Confirme a senha" onChangeText={set("confirm")} required secure value={form.confirm} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Notice
            icon="lock-closed-outline"
            title="Validação segura"
            body="Envie imagens legíveis. Os arquivos ficam em armazenamento privado e são usados apenas para validar o cadastro."
          />
          {role === "collector" ? (
            <Notice tone="amber" icon="time-outline" title="Aprovação da equipe" body="Contas de coletor ficam pendentes até a validação da instituição." />
          ) : null}
          {role === "student" ? (
            <Notice
              icon="school-outline"
              title="Matrícula e CadÚnico"
              body="Depois de entrar, envie a declaração de matrícula e a folha resumo do CadÚnico em Perfil › Escola e matrícula. A equipe valida os dois antes da primeira solicitação."
            />
          ) : null}
          {documentsNeeded.map((document) => {
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
        </>
      ) : null}
    </Screen>
  );
}
