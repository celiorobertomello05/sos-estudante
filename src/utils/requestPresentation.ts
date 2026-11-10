import { categoryLabels } from "../domain/labels";
import type { RequestItem, RequestStatus } from "../domain/models";

export function itemsSummary(items: readonly RequestItem[]) {
  return items
    .map((item) => {
      const quantity = item.quantityApproved || item.quantityRequested;
      const category = categoryLabels[item.category].replace(" escolar", "");
      const size = item.size === "Único" ? "" : item.size;
      return `${quantity}× ${category} ${size}`.trim();
    })
    .join(" + ");
}

/** Rótulos da próxima ação operacional; as transições válidas ficam no domínio. */
export const nextRequestAction: Partial<
  Record<RequestStatus, { to: RequestStatus; label: string }>
> = {
  in_review: { to: "approved", label: "Aprovar solicitação" },
  approved: { to: "separating", label: "Iniciar separação" },
  separating: { to: "ready", label: "Marcar como pronto" },
};
