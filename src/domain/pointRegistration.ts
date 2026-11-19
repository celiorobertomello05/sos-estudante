/** Regras do cadastro de ponto de coleta. O servidor valida de novo (create_collection_point). */

export interface PointInput {
  name: string;
  address: string;
  district: string;
  hours: string;
  capacity: string;
}

export const POINT_LIMITS = {
  name: { min: 3, max: 80 },
  address: { min: 5, max: 150 },
  district: { min: 2, max: 60 },
  hours: { min: 3, max: 80 },
  capacity: { min: 1, max: 100 },
} as const;

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

export function cleanPointInput(input: PointInput): PointInput {
  return {
    name: clean(input.name),
    address: clean(input.address),
    district: clean(input.district),
    hours: clean(input.hours),
    capacity: input.capacity.trim(),
  };
}

function lengthIssue(label: string, value: string, limit: { min: number; max: number }) {
  return value.length < limit.min || value.length > limit.max ? `${label}: use de ${limit.min} a ${limit.max} caracteres.` : null;
}

/** Primeira falha encontrada, ou `null` quando o cadastro pode seguir. */
export function pointInputIssue(raw: PointInput): string | null {
  const input = cleanPointInput(raw);
  const capacity = Number(input.capacity);
  return (
    lengthIssue("Nome", input.name, POINT_LIMITS.name) ??
    lengthIssue("Endereço", input.address, POINT_LIMITS.address) ??
    lengthIssue("Bairro", input.district, POINT_LIMITS.district) ??
    lengthIssue("Horário", input.hours, POINT_LIMITS.hours) ??
    (!/^\d{1,3}$/.test(input.capacity) || capacity < POINT_LIMITS.capacity.min || capacity > POINT_LIMITS.capacity.max
      ? `Capacidade: informe um número de ${POINT_LIMITS.capacity.min} a ${POINT_LIMITS.capacity.max}.`
      : null)
  );
}

/** Texto enviado ao geocodificador do aparelho para achar as coordenadas do ponto. */
export function pointGeocodeQuery(input: Pick<PointInput, "address" | "district">): string {
  return `${clean(input.address)}, ${clean(input.district)}, Brasil`;
}
