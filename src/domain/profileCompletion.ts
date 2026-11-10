/** Cadastro completo após login Google. */
import type { Profile } from "./models";

/**
 * Campos do cadastro que ainda faltam. Quem entra pelo Google só autentica e
 * precisa completar os mesmos dados do cadastro por e-mail. Lista vazia = cadastro completo.
 */
export function missingProfileFields(
  profile: Pick<Profile, "role" | "document" | "rg" | "birthDate" | "donorKind" | "phone" | "postalCode" | "address">,
): string[] {
  const missing: string[] = [];
  const company = profile.role === "donor" && profile.donorKind === "company";
  if (!profile.document) missing.push(company ? "CNPJ" : "CPF");
  if (!company && !profile.rg) missing.push("RG");
  if (profile.role === "student" && !profile.birthDate) missing.push("data de nascimento");
  if (!profile.phone) missing.push("telefone");
  if (!profile.postalCode) missing.push("CEP");
  if (!profile.address) missing.push("endereço");
  return missing;
}

/** Só o documento principal define se o cadastro precisa ser completado no app. */
/**
 * Só a conta **criada** pelo Google (sem cadastro prévio) completa o cadastro.
 * Quem já tinha conta por e-mail e entra pelo Google é vinculado à mesma conta
 * pelo Supabase e entra no próprio usuário .
 * `signupProvider` = `app_metadata.provider` da sessão (provedor de criação).
 */
export function needsProfileCompletion(profile: Pick<Profile, "document">, signupProvider: string | null | undefined) {
  return signupProvider === "google" && !profile.document;
}
