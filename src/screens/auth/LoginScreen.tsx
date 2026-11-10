import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Brand from "../../components/Brand";
import Screen from "../../components/Screen";
import { roleIcons } from "../../components/icons";
import { Button, Field, Notice, Row, Txt } from "../../components/ui";
import { env, isSupabaseConfigured } from "../../config/env";
import { roleLabels } from "../../domain/labels";
import type { UserRole } from "../../domain/models";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors, spacing } from "../../theme";
import { isValidEmail } from "../../utils/validation";
import { CONFIGURATION_ERROR, roles } from "./shared";
import { styles } from "./styles";

function RolePicker({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  return (
    <Row gap={spacing.sm}>
      {roles.map((role) => {
        const active = role === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            key={role}
            onPress={() => onChange(role)}
            style={[styles.roleCard, active && styles.roleCardActive]}
          >
            <View style={[styles.roleIcon, active && { backgroundColor: colors.brand600 }]}>
              <Ionicons color={active ? colors.white : colors.ink500} name={roleIcons[role]} size={18} />
            </View>
            <Txt variant="label" color={active ? colors.brand800 : colors.ink700}>
              {roleLabels[role].short}
            </Txt>
          </Pressable>
        );
      })}
    </Row>
  );
}

export function LoginScreen() {
  const app = useApp();
  const { go, reset } = useNav();
  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Mostra por que uma sessão salva não pôde ser restaurada na abertura do app.
  const [error, setError] = useState<string | null>(app.startupError);
  const [loading, setLoading] = useState(false);

  const enterDemo = () => {
    if (!env.demoModeEnabled) {
      setError(CONFIGURATION_ERROR);
      return;
    }
    app.enterDemo(role);
    reset({ name: "dashboard" });
  };

  const submit = async () => {
    if (!isSupabaseConfigured) {
      enterDemo();
      return;
    }
    if (!isValidEmail(email)) return setError("Informe um e-mail válido.");
    if (!password) return setError("Digite sua senha.");
    setLoading(true);
    const result = await app.signIn(email, password);
    setLoading(false);
    if (!result.ok) return setError(result.error ?? null);
    reset({ name: "dashboard" });
  };

  const google = async () => {
    if (!isSupabaseConfigured) {
      return Alert.alert("Indisponível no modo demonstração", "Conecte o Supabase para entrar com Google.");
    }
    const result = await app.signInWithGoogle(role);
    if (!result.ok) return setError(result.error ?? null);
    if (result.value) reset({ name: "dashboard" });
  };

  return (
    <Screen back={false} gap={spacing.lg}>
      <View style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.xl }}>
        <Brand full size={96} />
        <Txt variant="h1" center>
          Acesse sua conta
        </Txt>
        <Txt center>Escolha seu perfil para continuar</Txt>
      </View>
      <RolePicker value={role} onChange={setRole} />
      {!isSupabaseConfigured && env.demoModeEnabled ? (
        <Notice
          icon="flask-outline"
          title="Modo demonstração"
          body="O banco de dados ainda não foi configurado. Você pode explorar todos os fluxos com dados de exemplo."
        />
      ) : null}
      {!isSupabaseConfigured && !env.demoModeEnabled ? (
        <Notice
          icon="alert-circle-outline"
          tone="rose"
          title="Configuração necessária"
          body="O Supabase não está configurado e o modo demonstração está desativado."
        />
      ) : null}
      {isSupabaseConfigured ? (
        <>
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="E-mail"
            onChangeText={(v) => (setEmail(v), setError(null))}
            placeholder="seuemail@exemplo.com"
            value={email}
          />
          <Field
            autoComplete="password"
            label="Senha"
            onChangeText={(v) => (setPassword(v), setError(null))}
            onSubmitEditing={submit}
            placeholder="Digite sua senha"
            secure
            value={password}
          />
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => go({ name: "forgot-password" })} style={{ alignSelf: "flex-end" }}>
            <Txt variant="label" color={colors.brand700}>
              Esqueci minha senha
            </Txt>
          </Pressable>
        </>
      ) : null}
      {error ? (
        <Txt variant="small" color={colors.rose500} center>
          {error}
        </Txt>
      ) : null}
      <Button
        label={
          isSupabaseConfigured
            ? "Entrar"
            : env.demoModeEnabled
              ? `Entrar como ${roleLabels[role].short.toLowerCase()}`
              : "Verificar configuração"
        }
        loading={loading}
        onPress={submit}
      />
      {/* Gov.br fica de fora até existir credenciamento. */}
      {/* Só aparece com o provedor habilitado no Supabase. */}
      {app.googleEnabled ? <Button icon="logo-google" label="Entrar com Google" onPress={google} variant="ghost" /> : null}
      {isSupabaseConfigured && env.demoModeEnabled ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={enterDemo}>
          <Txt variant="label" center color={colors.ink500}>
            Explorar sem conta (demonstração)
          </Txt>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" hitSlop={8} onPress={() => go({ name: "register", role })}>
        <Txt variant="small" center>
          Não tem conta? <Txt variant="label" color={colors.brand700}>Criar conta</Txt>
        </Txt>
      </Pressable>
    </Screen>
  );
}
