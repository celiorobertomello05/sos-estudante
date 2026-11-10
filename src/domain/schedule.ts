/**
 * Agendamento da entrega de doações no ponto parceiro.
 *
 * O horário do ponto é texto livre (`collection_points.hours`), por exemplo
 * "Seg–Sex 7h–18h" ou "Ter–Sáb 9h–16h". Quando o texto segue esse formato, os
 * dias e horários oferecidos respeitam o funcionamento; caso contrário, o app
 * mantém o comportamento anterior (segunda a sábado, todos os horários).
 * As datas usam o fuso do aparelho (antes `toISOString()` podia pular um dia).
 */

export interface OpeningHours {
  /** Dias da semana abertos, 0 = domingo. */
  days: number[];
  openHour: number;
  closeHour: number;
}

export const DONATION_SLOT_TIMES = ["09:00", "11:00", "14:00", "16:00"] as const;

const DAY_KEYS: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Interpreta "Seg–Sex 7h–18h" (também "Seg a Sex", "07:30–18h"). */
export function parseOpeningHours(text: string | null | undefined): OpeningHours | null {
  if (!text) return null;
  const value = normalize(text);
  const dayMatch = value.match(/\b(dom|seg|ter|qua|qui|sex|sab)\w*\s*(?:-|–|—|a|ate)\s*(dom|seg|ter|qua|qui|sex|sab)/);
  const hourMatch = value.match(/(\d{1,2})(?:h|:)(\d{2})?h?\s*(?:-|–|—|a|as|ate)\s*(\d{1,2})(?:h|:)?(\d{2})?/);
  if (!dayMatch || !hourMatch) return null;
  const start = DAY_KEYS[dayMatch[1]];
  const end = DAY_KEYS[dayMatch[2]];
  const days: number[] = [];
  for (let day = start; ; day = (day + 1) % 7) {
    days.push(day);
    if (day === end || days.length === 7) break;
  }
  const openHour = Number(hourMatch[1]) + Number(hourMatch[2] ?? 0) / 60;
  const closeHour = Number(hourMatch[3]) + Number(hourMatch[4] ?? 0) / 60;
  if (!(openHour >= 0 && closeHour <= 24 && openHour < closeHour)) return null;
  return { days, openHour, closeHour };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Data no fuso do aparelho, no formato AAAA-MM-DD. */
export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Horários de entrega dentro do funcionamento (início antes do fechamento menos 1h). */
export function slotTimesFor(hours: OpeningHours | null): string[] {
  if (!hours) return [...DONATION_SLOT_TIMES];
  return DONATION_SLOT_TIMES.filter((time) => {
    const [h, m] = time.split(":").map(Number);
    const start = h + m / 60;
    return start >= hours.openHour && start + 1 <= hours.closeHour;
  });
}

/** Próximos `count` dias (a partir de amanhã) em que o ponto abre. */
export function donationDays(now: Date, hours: OpeningHours | null, count = 5): Date[] {
  const openDays = hours?.days ?? [1, 2, 3, 4, 5, 6];
  const result: Date[] = [];
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; result.length < count && i < 60; i++) {
    date.setDate(date.getDate() + 1);
    if (openDays.includes(date.getDay())) result.push(new Date(date));
  }
  return result;
}
