import { DEMO_PICKUP_CODE } from "../data/seed";
import type { Delivery, ItemCategory, RequestItem, RequestStatus, SupportRequest } from "../domain/models";
import { REQUEST_STEPS, RULES, allocateApprovedQuantities, canTransition, enrollmentEligibilityIssue, evaluateAnnualLimit, evaluateCategoryEligibility, isOpenRequest, isValidPickupCode, reservedStockByCategory, validateRequestItems } from "../domain/rules";
import * as api from "../services/dataService";
import { uploadFile, uploadText } from "../services/storageService";
import { localId, maskPhone, protocol } from "../utils/format";
import { annualLimitIssue, categoryEligibilityIssue } from "./messages";
import type { StoreCore } from "./core";

/** Solicitações: criar, cancelar, avançar, código de retirada e entrega. */
export function createRequestActions(core: StoreCore) {
  const { profile, data, patch, run, pushLocalNotification, refresh, isDemo, ensureActiveAccount } = core;

  const createRequest = (items: RequestItem[], pointId: string, notes: string) =>
    run(async () => {
      const issue = validateRequestItems(items);
      if (issue) throw new Error(`BUSINESS_RULE: ${issue}`);
      const enrollmentIssue = enrollmentEligibilityIssue(data.enrollment);
      if (enrollmentIssue) throw new Error(`BUSINESS_RULE: ${enrollmentIssue}`);
      const open = data.requests.filter((r) => isOpenRequest(r.status)).length;
      if (open >= RULES.maxOpenRequestsPerStudent) {
        throw new Error(`BUSINESS_RULE: Você pode ter até ${RULES.maxOpenRequestsPerStudent} solicitações em andamento.`);
      }
      const eligibility = evaluateCategoryEligibility({
        requestedCategories: items.map((item) => item.category),
        previousRequests: data.requests,
        previousDeliveries: data.deliveries,
        now: new Date(),
      });
      if (!eligibility.allowed) {
        throw new Error(`BUSINESS_RULE: ${categoryEligibilityIssue(eligibility)}`);
      }
      const annual = evaluateAnnualLimit({
        requestedItems: items,
        previousRequests: data.requests,
        previousDeliveries: data.deliveries,
        now: new Date(),
      });
      if (!annual.allowed) {
        throw new Error(`BUSINESS_RULE: ${annualLimitIssue(annual)}`);
      }
      if (!isDemo) {
        const id = await api.createRequest(items, pointId, notes);
        await refresh();
        return id;
      }
      const id = localId("req");
      const request: SupportRequest = {
        id,
        protocol: protocol("SOL"),
        studentName: profile?.fullName ?? "Aluno",
        schoolName: data.enrollment?.schoolName ?? "",
        contactMasked: maskPhone(profile?.phone),
        items,
        status: "in_review",
        pointId,
        pickupAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        notes,
        timeline: REQUEST_STEPS.map((label, i) => ({ label, at: i === 0 ? new Date().toISOString() : undefined })),
      };
      const code = String(Math.floor(1000 + Math.random() * 9000));
      patch({ requests: [request, ...data.requests], pickupCodes: { ...data.pickupCodes, [id]: code } });
      pushLocalNotification("Solicitação enviada", `Protocolo ${request.protocol} em análise.`, "success");
      return id;
    });


  const cancelRequest = (requestId: string) =>
    run(async () => {
      ensureActiveAccount();
      if (!isDemo) {
        await api.cancelRequest(requestId);
        return refresh();
      }
      const nextCodes = { ...data.pickupCodes };
      delete nextCodes[requestId];
      patch({
        requests: data.requests.map((r) => (r.id === requestId && isOpenRequest(r.status) ? { ...r, status: "cancelled" } : r)),
        pickupCodes: nextCodes,
      });
    });

  /** O estudante troca o código (desbloqueia após 5 erros ou se ele vazou). */
  const regeneratePickupCode = (requestId: string) =>
    run(async () => {
      ensureActiveAccount();
      if (!isDemo) {
        await api.regeneratePickupCode(requestId);
        return refresh();
      }
      patch({
        pickupCodes: { ...data.pickupCodes, [requestId]: String(Math.floor(1000 + Math.random() * 9000)) },
        lockedPickupCodes: data.lockedPickupCodes.filter((id) => id !== requestId),
      });
    });

  const stepIndex: Partial<Record<RequestStatus, number>> = { approved: 1, separating: 2, ready: 4, delivered: 5 };

  const advanceRequest = (requestId: string, status: RequestStatus) =>
    run(async () => {
      ensureActiveAccount();
      const request = data.requests.find((r) => r.id === requestId);
      if (!request || !canTransition(request.status, status)) {
        throw new Error("BUSINESS_RULE: Esta mudança de etapa não é permitida.");
      }
      if (!isDemo) {
        await api.updateRequestStatus(requestId, status);
        return refresh();
      }
      const until = stepIndex[status] ?? 0;
      const now = new Date().toISOString();
      const stockByCategory: Partial<Record<ItemCategory, number>> = {};
      for (const item of data.stock) stockByCategory[item.category] = (stockByCategory[item.category] ?? 0) + item.quantity;
      const reserved = reservedStockByCategory(data.requests, requestId);
      let items = request.items;
      if (status === "approved") {
        items = allocateApprovedQuantities(request.items, stockByCategory, reserved);
        if (items.every((item) => item.quantityApproved === 0)) {
          throw new Error("BUSINESS_RULE: Sem estoque disponível para aprovar esta solicitação. O saldo já está reservado para outros pedidos.");
        }
      }
      if (status === "ready") {
        const short = request.items.some(
          (item) =>
            (stockByCategory[item.category] ?? 0) <
            request.items.filter((i) => i.category === item.category).reduce((sum, i) => sum + i.quantityApproved, 0) +
              (reserved[item.category] ?? 0),
        );
        if (short) {
          throw new Error("BUSINESS_RULE: O estoque atual não cobre as reservas desta categoria. Ajuste o estoque ou cancele um pedido antes de marcar como pronto.");
        }
      }
      patch({
        requests: data.requests.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status,
                items,
                timeline: r.timeline.map((t, i) => (i <= until && !t.at ? { ...t, at: now } : t)),
              }
            : r,
        ),
      });
    });

  /** Etapas obrigatórias: código de 4 dígitos, foto dos itens e assinatura. */
  const confirmDelivery = (requestId: string, code: string, photoUri: string, signatureSvg: string) =>
    run(async () => {
      if (!isValidPickupCode(code)) {
        throw new Error(`BUSINESS_RULE: O código deve ter ${RULES.pickupCodeLength} dígitos.`);
      }
      if (!photoUri || !signatureSvg) throw new Error("BUSINESS_RULE: Registre a foto e a assinatura.");
      if (!isDemo) {
        const photoPath = await uploadFile("delivery-proofs", `${requestId}/itens.jpg`, photoUri, "image/jpeg");
        const signaturePath = await uploadText("delivery-proofs", `${requestId}/assinatura.svg`, signatureSvg, "image/svg+xml");
        await api.confirmDelivery(requestId, code, photoPath, signaturePath);
        await refresh();
        return;
      }
      const expected = data.pickupCodes[requestId] ?? DEMO_PICKUP_CODE;
      if (code !== expected) throw new Error("PICKUP_CODE_INVALID");
      const request = data.requests.find((r) => r.id === requestId);
      const now = new Date().toISOString();
      const delivery: Delivery = {
        requestId,
        receiptNumber: protocol("ENT"),
        photoUri,
        signaturePath: signatureSvg,
        deliveredAt: now,
        collectorName: profile?.fullName ?? "Equipe",
      };
      const stock = data.stock.map((s) => {
        const used = request?.items.filter((i) => i.category === s.category).reduce((sum, i) => sum + i.quantityApproved, 0) ?? 0;
        return { ...s, quantity: Math.max(0, s.quantity - used) };
      });
      patch({
        deliveries: [...data.deliveries, delivery],
        stock,
        requests: data.requests.map((r) =>
          r.id === requestId ? { ...r, status: "delivered", timeline: r.timeline.map((t) => ({ ...t, at: t.at ?? now })) } : r,
        ),
      });
    });

  return { createRequest, cancelRequest, regeneratePickupCode, advanceRequest, confirmDelivery };
}
