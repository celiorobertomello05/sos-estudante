import type { UserRole } from "./models";

/**
 * Documentos da conta, guardados no bucket privado `documents` em
 * `<uid>/<chave>.jpg`. A declaração de matrícula e o
 * CadÚnico do estudante não estão aqui: são enviados na tela de matrícula,
 * que é o que a equipe valida.
 */
export type AccountDocumentKey = "documento-com-foto" | "cnh-categoria-b" | "comprovante-vinculo";

export interface AccountDocument {
  key: AccountDocumentKey;
  label: string;
}

const photoId: AccountDocument = { key: "documento-com-foto", label: "Documento com foto" };

export const ACCOUNT_DOCUMENTS: Record<UserRole, AccountDocument[]> = {
  student: [photoId],
  donor: [photoId],
  collector: [
    photoId,
    { key: "cnh-categoria-b", label: "CNH categoria B" },
    { key: "comprovante-vinculo", label: "Comprovante de vínculo com a instituição" },
  ],
};

export function accountDocumentPath(userId: string, key: AccountDocumentKey) {
  return `${userId}/${key}.jpg`;
}

/** Chaves já enviadas, a partir dos nomes de arquivo da pasta do usuário. */
export function uploadedAccountDocuments(fileNames: readonly string[]): AccountDocumentKey[] {
  const keys = new Set<AccountDocumentKey>();
  for (const name of fileNames) {
    const base = (name.split("/").pop() ?? name).replace(/\.[a-z0-9]+$/i, "").replace(/^\d+-/, "");
    // Nomes antigos do cadastro: "0-documento-com-foto", "2-comprovante-de-v-nculo-com-a-institui-o".
    if (base === "documento-com-foto") keys.add("documento-com-foto");
    else if (base === "cnh-categoria-b") keys.add("cnh-categoria-b");
    else if (base.startsWith("comprovante-")) keys.add("comprovante-vinculo");
  }
  return [...keys];
}

export function missingAccountDocuments(role: UserRole, uploaded: readonly AccountDocumentKey[]) {
  return ACCOUNT_DOCUMENTS[role].filter((document) => !uploaded.includes(document.key));
}

/** Rótulo de um arquivo de documento da conta, ou `null` se não for um deles. */
export function accountDocumentLabel(fileName: string): string | null {
  const [key] = uploadedAccountDocuments([fileName]);
  if (!key) return null;
  for (const list of Object.values(ACCOUNT_DOCUMENTS)) {
    const found = list.find((document) => document.key === key);
    if (found) return found.label;
  }
  return null;
}
