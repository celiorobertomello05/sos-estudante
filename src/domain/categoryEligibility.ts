/** Carência de 6 meses por categoria. */
import type { ItemCategory, RequestItem, RequestStatus } from "./models";
import { isOpenRequest } from "./requestRules";

export interface CategoryEligibilityRequest {
  id: string;
  status: RequestStatus;
  items: readonly Pick<RequestItem, "category">[];
}

export interface CategoryEligibilityDelivery {
  requestId: string;
  deliveredAt?: string;
}

export interface EvaluateCategoryEligibilityInput {
  requestedCategories: readonly ItemCategory[];
  previousRequests: readonly CategoryEligibilityRequest[];
  previousDeliveries: readonly CategoryEligibilityDelivery[];
  now: Date;
}

export type CategoryEligibilityBlock =
  | {
      category: ItemCategory;
      reason: "delivery_data_inconsistent";
      requestId: string;
    }
  | {
      category: ItemCategory;
      reason: "open_request";
      requestId: string;
    }
  | {
      category: ItemCategory;
      reason: "cooldown";
      requestId: string;
      deliveredAt: string;
      eligibleAt: string;
    };

export interface CategoryEligibilityResult {
  allowed: boolean;
  blockedCategories: CategoryEligibilityBlock[];
}

const CATEGORY_COOLDOWN_MONTHS = 6;

export function addUtcCalendarMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

/**
 * Avalia a solicitação inteira por categoria.
 *
 * Uma categoria bloqueada torna o resultado completo não elegível. Entregas
 * inconsistentes têm prioridade sobre pedidos abertos e sobre a carência.
 */
export function evaluateCategoryEligibility({
  requestedCategories,
  previousRequests,
  previousDeliveries,
  now,
}: EvaluateCategoryEligibilityInput): CategoryEligibilityResult {
  const uniqueCategories = [...new Set(requestedCategories)];
  const blockedCategories: CategoryEligibilityBlock[] = [];

  for (const category of uniqueCategories) {
    const deliveredRequests = previousRequests.filter(
      (request) =>
        request.status === "delivered" &&
        request.items.some((item) => item.category === category),
    );

    const deliveredHistory = deliveredRequests.map((request) => ({
      request,
      delivery: previousDeliveries.find((delivery) => delivery.requestId === request.id),
    }));
    const inconsistent = deliveredHistory.find(({ delivery }) => {
      if (!delivery?.deliveredAt) return true;
      return Number.isNaN(new Date(delivery.deliveredAt).getTime());
    });

    if (inconsistent) {
      blockedCategories.push({
        category,
        reason: "delivery_data_inconsistent",
        requestId: inconsistent.request.id,
      });
      continue;
    }

    const openRequest = previousRequests.find(
      (request) =>
        isOpenRequest(request.status) &&
        request.items.some((item) => item.category === category),
    );
    if (openRequest) {
      blockedCategories.push({
        category,
        reason: "open_request",
        requestId: openRequest.id,
      });
      continue;
    }

    const latestDelivery = deliveredHistory
      .map(({ request, delivery }) => ({
        requestId: request.id,
        deliveredAt: delivery?.deliveredAt ?? "",
        date: new Date(delivery?.deliveredAt ?? ""),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    if (!latestDelivery) continue;

    const eligibleAt = addUtcCalendarMonths(
      latestDelivery.date,
      CATEGORY_COOLDOWN_MONTHS,
    );
    if (now.getTime() < eligibleAt.getTime()) {
      blockedCategories.push({
        category,
        reason: "cooldown",
        requestId: latestDelivery.requestId,
        deliveredAt: latestDelivery.date.toISOString(),
        eligibleAt: eligibleAt.toISOString(),
      });
    }
  }

  return {
    allowed: blockedCategories.length === 0,
    blockedCategories,
  };
}
