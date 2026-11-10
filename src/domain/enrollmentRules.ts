/** Matrícula, CadÚnico e revisão pela equipe. */
import { accountDocumentLabel } from "./documents";

/**
 * Elegibilidade documental para solicitar itens: matrícula ativa validada pela equipe e folha resumo do
 * CadÚnico anexada. Retorna a mensagem do bloqueio ou `null`.
 */
export function enrollmentEligibilityIssue(
  enrollment: { status: "pending" | "verified" | "rejected"; hasCadUnico?: boolean } | null | undefined,
): string | null {
  if (!enrollment || enrollment.status !== "verified") {
    return "Envie e valide sua declaração de matrícula antes de solicitar.";
  }
  if (!enrollment.hasCadUnico) {
    return "Anexe a folha resumo do CadÚnico na tela de matrícula. Ela é obrigatória para solicitar itens.";
  }
  return null;
}

/** Tamanho máximo do motivo de recusa enviado ao estudante (igual ao servidor). */
export const REVIEW_NOTE_MAX_LENGTH = 300;

/**
 * Valida uma decisão de revisão de matrícula pela equipe. Recusar exige
 * motivo, e validar exige os dois documentos (declaração e CadÚnico).
 */
export function enrollmentReviewIssue(
  decision: "verify" | "reject",
  review: { documentPath: string | null; cadUnicoPath: string | null },
  note: string,
): string | null {
  if (decision === "reject" && !note.trim()) {
    return "Informe o motivo da recusa para o estudante.";
  }
  if (decision === "verify" && (!review.documentPath || !review.cadUnicoPath)) {
    return "A matrícula precisa da declaração e da folha resumo do CadÚnico para ser validada.";
  }
  return null;
}

/**
 * Nome legível de um arquivo do bucket `documents`, a partir do caminho
 * `<uid>/<arquivo>.jpg` gravado pelo cadastro e pela tela de matrícula.
 */
export function documentFileLabel(path: string): string {
  const file = path.split("/").pop() ?? path;
  const base = file.replace(/\.[a-z0-9]+$/i, "");
  if (/^matricula-/.test(base)) return "Declaração de matrícula";
  if (/^cadunico-/.test(base)) return "Folha resumo do CadÚnico";
  const account = accountDocumentLabel(file);
  if (account) return account;
  const signup = base.replace(/^\d+-/, "").replace(/-+/g, " ").trim();
  if (!signup) return "Documento";
  return signup.charAt(0).toUpperCase() + signup.slice(1);
}
