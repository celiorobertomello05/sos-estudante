/**
 * Converte erros técnicos em mensagens seguras, sem expor SQL, tokens,
 * códigos internos ou stack traces. Módulo puro para ser testável.
 */

export const SERVICE_UNAVAILABLE_MESSAGE =
  "O serviço está temporariamente indisponível. Tente novamente mais tarde ou fale com o suporte.";

/**
 * Códigos do PostgREST/Postgres que indicam esquema ausente ou incompleto
 * no servidor (tabela, view ou função não encontrada). Não dependem da ação
 * do usuário, então a mensagem orienta a tentar mais tarde.
 */
const SCHEMA_UNAVAILABLE_CODES = new Set(["PGRST202", "PGRST205", "42P01", "42883"]);

function errorParts(error: unknown): { message: string; code: string } {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return { message: error.message, code: typeof code === "string" ? code : "" };
  }
  if (error && typeof error === "object") {
    const { message, code } = error as { message?: unknown; code?: unknown };
    return {
      message: typeof message === "string" ? message : "",
      code: typeof code === "string" ? code : "",
    };
  }
  return { message: String(error ?? ""), code: "" };
}

export function isSchemaUnavailableError(error: unknown): boolean {
  const { message, code } = errorParts(error);
  return (
    SCHEMA_UNAVAILABLE_CODES.has(code) ||
    /could not find the (table|function) .* in the schema cache/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

/**
 * Recusa esperada de `claim_initial_role` quando a conta já tem papel: a RPC
 * faz `raise exception 'NOT_ALLOWED'` (SQLSTATE P0001) sem outro texto.
 * `permission denied`, RLS ou qualquer outro erro não entram aqui.
 */
export function isRoleAlreadyClaimedError(error: unknown): boolean {
  const { message, code } = errorParts(error);
  return message.trim() === "NOT_ALLOWED" && (code === "" || code === "P0001");
}

/** Erro de permissão: RPC recusada, RLS ou grant ausente. */
export function isNotAllowedError(error: unknown): boolean {
  const { message } = errorParts(error);
  return /NOT_ALLOWED|permission denied|row-level security/i.test(message);
}

export function friendlyErrorMessage(error: unknown): string {
  const { message } = errorParts(error);
  if (isSchemaUnavailableError(error)) return SERVICE_UNAVAILABLE_MESSAGE;
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
  if (/already registered|already exists|duplicate/i.test(message)) return "Já existe uma conta com esses dados.";
  if (/network|fetch/i.test(message)) return "Sem conexão. Verifique sua internet e tente novamente.";
  if (/PICKUP_CODE_INVALID/.test(message)) return "Código de retirada incorreto.";
  if (isNotAllowedError(error)) return "Você não tem permissão para esta ação.";
  if (/BUSINESS_RULE:/.test(message)) return message.split("BUSINESS_RULE:")[1].trim();
  return "Não foi possível concluir agora. Tente novamente.";
}
