import { useEffect, useState } from "react";
import { Alert } from "react-native";
import Screen from "../../components/Screen";
import { Card, ListRow, Notice, Txt } from "../../components/ui";
import { ACCOUNT_DOCUMENTS } from "../../domain/documents";
import type { AccountDocumentKey } from "../../domain/documents";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { chooseImage } from "../../utils/media";

/** Documentos da conta, inclusive para quem confirmou o e-mail depois do cadastro. */
export function AccountDocumentsScreen() {
  const app = useApp();
  const { go } = useNav();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<AccountDocumentKey | null>(null);
  const { loadAccountDocuments } = app;
  const role = app.profile?.role ?? "student";

  useEffect(() => {
    let active = true;
    loadAccountDocuments().then((result) => {
      if (!active) return;
      setLoading(false);
      setError(result.ok ? null : result.error ?? null);
    });
    return () => {
      active = false;
    };
    // Carrega uma vez ao abrir; o envio já atualiza a lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = (key: AccountDocumentKey) =>
    chooseImage(async (uri) => {
      setSending(key);
      const result = await app.uploadAccountDocument(key, uri);
      setSending(null);
      if (!result.ok) Alert.alert("Não foi possível enviar", result.error);
    });

  const missing = ACCOUNT_DOCUMENTS[role].filter((document) => !app.accountDocuments.includes(document.key));

  return (
    <Screen title="Meus documentos">
      <Notice
        icon="lock-closed-outline"
        title="Armazenamento privado"
        body="Só você e, enquanto houver validação pendente, a equipe da instituição acessam estes arquivos."
      />
      {role === "collector" && app.profile?.status === "pending" ? (
        <Notice tone="amber" icon="time-outline" title="Cadastro em análise" body="A equipe aprova o cadastro depois de conferir os documentos abaixo." />
      ) : null}
      {error ? <Notice icon="alert-circle-outline" title="Não foi possível carregar" body={error} tone="rose" /> : null}
      {!loading && !error && missing.length === 0 ? <Notice tone="brand" icon="checkmark-circle-outline" title="Documentos enviados" /> : null}
      <Card>
        {ACCOUNT_DOCUMENTS[role].map((document) => {
          const sent = app.accountDocuments.includes(document.key);
          return (
            <ListRow
              detail={loading ? "Verificando…" : sent ? "Enviado — toque para trocar" : "Pendente — toque para enviar"}
              flat
              icon={sent ? "checkmark-circle-outline" : "document-attach-outline"}
              key={document.key}
              onPress={sending ? undefined : () => send(document.key)}
              title={document.label}
              tone={sent ? "brand" : "amber"}
              trailing={sending === document.key ? <Txt variant="small">Enviando…</Txt> : undefined}
            />
          );
        })}
      </Card>
      {role === "student" ? (
        <ListRow
          detail="Declaração de matrícula e folha resumo do CadÚnico"
          icon="school-outline"
          onPress={() => go({ name: "enrollment" })}
          title="Escola e matrícula"
          tone="trust"
        />
      ) : null}
    </Screen>
  );
}
