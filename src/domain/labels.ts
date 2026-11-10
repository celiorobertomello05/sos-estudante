import type {
  DonationStatus,
  ItemCategory,
  ItemCondition,
  MovementType,
  RequestStatus,
  UserRole,
} from "./models";

/** Identificadores semânticos usados pelos metadados do domínio. */
export type LabelTone = "brand" | "trust" | "amber" | "rose" | "purple" | "neutral";

export const roleLabels: Record<UserRole, { short: string; long: string; description: string }> = {
  student: {
    short: "Aluno",
    long: "Aluno ou responsável",
    description: "Solicite itens e agende sua retirada",
  },
  donor: { short: "Doador", long: "Doador", description: "Pessoa física ou empresa" },
  collector: {
    short: "Distribuidor",
    long: "Coletor e distribuidor",
    description: "Colete, organize e entregue doações",
  },
};

export const categoryLabels: Record<ItemCategory, string> = {
  camisa: "Camisa escolar",
  calca: "Calça escolar",
  agasalho: "Agasalho",
  kit: "Kit escolar",
  shorts: "Shorts",
  jaqueta: "Jaqueta",
};

export const conditionLabels: Record<ItemCondition, { label: string; hint: string }> = {
  novo: { label: "Novo", hint: "Sem uso" },
  muito_bom: { label: "Muito bom", hint: "Poucos sinais" },
  bom: { label: "Bom", hint: "Uso regular" },
};

export const requestStatusMeta: Record<RequestStatus, { label: string; tone: LabelTone }> = {
  in_review: { label: "Em análise", tone: "amber" },
  approved: { label: "Aprovada", tone: "trust" },
  separating: { label: "Separando itens", tone: "purple" },
  ready: { label: "Pronta para retirada", tone: "brand" },
  delivered: { label: "Retirada realizada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "rose" },
};

export const donationStatusMeta: Record<DonationStatus, { label: string; tone: LabelTone }> = {
  scheduled: { label: "Entrega agendada", tone: "amber" },
  received: { label: "Triagem pendente", tone: "amber" },
  approved: { label: "Aprovado", tone: "brand" },
  rejected: { label: "Recusado", tone: "rose" },
  stocked: { label: "No estoque", tone: "trust" },
};

export const movementMeta: Record<MovementType, { label: string; tone: LabelTone; sign: string }> = {
  in: { label: "Entrada", tone: "brand", sign: "+" },
  out: { label: "Saída", tone: "rose", sign: "−" },
  transfer: { label: "Transferência", tone: "trust", sign: "⇄ " },
  adjust: { label: "Ajuste", tone: "amber", sign: "±" },
};
