import { categoryLabels } from "../domain/labels";
import { evaluateAnnualLimit, evaluateCategoryEligibility } from "../domain/rules";

/** Mensagens das regras de elegibilidade mostradas ao usuário. */
export function formatEligibilityDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function annualLimitIssue(result: ReturnType<typeof evaluateAnnualLimit>) {
  return result.blockedCategories
    .map((blocked) => {
      const remaining = Math.max(0, blocked.limit - blocked.used);
      return `${categoryLabels[blocked.category]}: limite de ${blocked.limit} por ano; restam ${remaining} nos últimos 12 meses.`;
    })
    .join(" ");
}

export function categoryEligibilityIssue(
  result: ReturnType<typeof evaluateCategoryEligibility>,
) {
  return result.blockedCategories
    .map((blocked) => {
      const category = categoryLabels[blocked.category];
      if (blocked.reason === "delivery_data_inconsistent") {
        return `${category}: há uma entrega concluída sem data válida. Procure o atendimento para corrigir o histórico.`;
      }
      if (blocked.reason === "open_request") {
        return `${category}: esta categoria já está em outra solicitação em andamento.`;
      }
      return `${category}: nova solicitação permitida a partir de ${formatEligibilityDate(blocked.eligibleAt)}.`;
    })
    .join(" ");
}
