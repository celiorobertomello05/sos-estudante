/**
 * Links de autenticação recebidos pelo app (esquema `sosestudante://`).
 *
 * - `auth/reset`: link do e-mail "redefinir senha".
 * - `auth/callback`: confirmação de e-mail do cadastro.
 *
 * Com o fluxo PKCE o Supabase devolve `?code=...`; erros chegam como
 * `error`/`error_description` na query ou no fragmento. Função pura, sem Expo.
 */
export type AuthLinkKind = "reset" | "callback";

export type AuthLink =
  | { kind: AuthLinkKind; code: string }
  | { kind: AuthLinkKind; error: string };

const EXPIRED_MESSAGE = "O link expirou ou já foi usado. Peça um novo link.";

function readParams(url: string) {
  const params = new Map<string, string>();
  const [beforeHash, hash = ""] = url.split("#", 2);
  const query = beforeHash.includes("?") ? beforeHash.slice(beforeHash.indexOf("?") + 1) : "";
  for (const part of [query, hash]) {
    for (const pair of part.split("&")) {
      if (!pair) continue;
      const [key, value = ""] = pair.split("=", 2);
      try {
        params.set(decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, " ")));
      } catch {
        params.set(key, value);
      }
    }
  }
  return params;
}

/** Retorna `null` para links que não são de autenticação. */
export function parseAuthLink(url: string | null | undefined): AuthLink | null {
  if (!url) return null;
  const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  const kind: AuthLinkKind | null = /(^|\/|:)auth\/reset$/.test(path)
    ? "reset"
    : /(^|\/|:)auth\/callback$/.test(path)
      ? "callback"
      : null;
  if (!kind) return null;
  const params = readParams(url);
  const code = params.get("code");
  if (code) return { kind, code };
  // Não repassa o texto do provedor: mensagem fixa e segura.
  if (params.has("error") || params.has("error_code") || params.has("error_description")) {
    return { kind, error: EXPIRED_MESSAGE };
  }
  return { kind, error: "Link inválido. Peça um novo link." };
}

/**
 * Lê a resposta pública de `/auth/v1/settings` do Supabase e diz se um
 * provedor externo está habilitado. Qualquer formato inesperado conta como
 * desabilitado, para não mostrar um botão que falharia.
 */
export function isAuthProviderEnabled(settings: unknown, provider: string): boolean {
  if (!settings || typeof settings !== "object") return false;
  const external = (settings as { external?: unknown }).external;
  if (!external || typeof external !== "object") return false;
  return (external as Record<string, unknown>)[provider] === true;
}

/**
 * Endereço de retorno do login quando o app roda no Expo Go. O Expo Go só
 * atende endereços `exp://`; o esquema próprio (`sosestudante://`) só existe
 * no app instalado. Recebe a URL que abriu o app (ex.: `exp://192.168.0.5:8081`)
 * e devolve `exp://192.168.0.5:8081/--/auth/callback`. Fora do Expo Go, `null`.
 */
export function expoGoRedirectUrl(appUrl: string | null | undefined, path: string): string | null {
  if (!appUrl || !/^exps?:\/\//.test(appUrl)) return null;
  const base = appUrl.split(/[?#]/, 1)[0].split("/--/", 1)[0].replace(/\/+$/, "");
  return `${base}/--/${path.replace(/^\/+/, "")}`;
}
