import type { Donation } from "./models";

export function monthlyDonationSeries(
  donations: readonly Pick<Donation, "createdAt" | "quantity">[],
  now: Date,
) {
  return Array.from({ length: 7 }, (_, index) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (6 - index), 1));
    const label = month
      .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
      .replace(".", "");
    const value = donations.reduce((total, donation) => {
      const createdAt = new Date(donation.createdAt);
      const sameMonth =
        createdAt.getUTCFullYear() === month.getUTCFullYear() &&
        createdAt.getUTCMonth() === month.getUTCMonth();
      return sameMonth ? total + donation.quantity : total;
    }, 0);

    return {
      month: label.charAt(0).toUpperCase() + label.slice(1),
      value,
    };
  });
}
