/**
 * Acesso ao banco Supabase (fachada). Escritas sensíveis passam por funções RPC
 * (supabase/migrations), que validam papel, permissões e regras de negócio.
 * Implementação em services/data/: rows, columns, mappers,
 * client, queries e commands.
 */
export * from "./data/queries";
export * from "./data/commands";
