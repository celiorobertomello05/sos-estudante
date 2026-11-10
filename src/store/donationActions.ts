import type { Donation, ItemCategory, ItemCondition, StockItemAdministrativeDetails, StockMovement } from "../domain/models";
import { categoryLabels } from "../domain/labels";
import { RULES } from "../domain/rules";
import * as api from "../services/dataService";
import { localId, protocol } from "../utils/format";
import type { StoreCore } from "./core";

/** Doações: agendar e triar. */
export function createDonationActions(core: StoreCore) {
  const { profile, data, patch, run, pushLocalNotification, refresh, isDemo } = core;

  const createDonation = (input: {
    category: ItemCategory;
    size: string;
    quantity: number;
    condition: ItemCondition;
    pointId: string;
    scheduledFor: string;
  }) =>
    run(async () => {
      if (input.quantity < 1 || input.quantity > RULES.maxDonationQuantity) {
        throw new Error(`BUSINESS_RULE: Informe entre 1 e ${RULES.maxDonationQuantity} unidades.`);
      }
      if (!isDemo) {
        const donation = await api.createDonation(input);
        await refresh();
        return donation;
      }
      const donation: Donation = {
        id: localId("don"),
        protocol: protocol("DOA"),
        donorName: profile?.fullName ?? "Doador",
        status: "scheduled",
        createdAt: new Date().toISOString(),
        ...input,
      };
      patch({ donations: [donation, ...data.donations] });
      pushLocalNotification("Doação agendada", `Leve os itens ao ponto parceiro. Protocolo ${donation.protocol}.`, "success");
      return donation;
    });

  /** Triagem: aprovar, recusar ou enviar ao estoque. */
  const reviewDonation = (donationId: string, decision: "approve" | "reject" | "stock", note?: string) =>
    run(async () => {
      if (!isDemo) {
        await api.reviewDonation(donationId, decision, note);
        await refresh();
        return;
      }
      const donation = data.donations.find((d) => d.id === donationId);
      if (!donation) return;
      const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "stocked";
      const donations = data.donations.map((d) => (d.id === donationId ? { ...d, status, reviewNote: note ?? d.reviewNote } : d)) as Donation[];
      if (status !== "stocked") return patch({ donations });
      const existing = data.stock.some((s) => s.category === donation.category);
      const newStockItem: StockItemAdministrativeDetails = {
        id: localId("st"),
        category: donation.category,
        sizes: [donation.size],
        quantity: donation.quantity,
        condition: donation.condition,
        location: "Estoque A",
        school: "Todas",
        donorName: donation.donorName,
        receivedAt: new Date().toISOString(),
      };
      const stock = existing
        ? data.stock.map((s) =>
            s.category === donation.category
              ? { ...s, quantity: s.quantity + donation.quantity, sizes: s.sizes.includes(donation.size) ? s.sizes : [...s.sizes, donation.size] }
              : s,
          )
        : [...data.stock, newStockItem];
      const movement: StockMovement = {
        id: localId("mv"),
        label: `${categoryLabels[donation.category]} Tam. ${donation.size}`,
        type: "in",
        quantity: donation.quantity,
        from: "Triagem",
        to: "Estoque A",
        responsible: profile?.fullName ?? "Equipe",
        createdAt: new Date().toISOString(),
      };
      patch({ donations, stock, movements: [movement, ...data.movements] });
    });

  return { createDonation, reviewDonation };
}
