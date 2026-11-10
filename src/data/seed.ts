/**
 * Dados do modo demonstração. Espelham o conteúdo de supabase/seed.sql,
 * permitindo testar todos os fluxos sem conexão com o banco.
 */
import type {
  AppNotification,
  CollectionPoint,
  Delivery,
  Donation,
  Enrollment,
  EnrollmentSubmission,
  PendingReviews,
  Profile,
  StockItemAdministrativeDetails,
  StockMovement,
  SupportRequest,
  UserRole,
  UserSettings,
} from "../domain/models";
import { REQUEST_STEPS } from "../domain/rules";

const daysAgo = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const inDays = (days: number, hour = 14) => daysAgo(-days, hour);

export const DEMO_PICKUP_CODE = "4827";

export const demoProfiles: Record<UserRole, Profile> = {
  student: {
    id: "demo-student",
    role: "student",
    status: "active",
    fullName: "Ana Carolina Santos",
    email: "ana.santos@example.com",
    phone: "11900000001",
    document: "52998224725",
    birthDate: "2012-04-18",
    postalCode: "02145010",
    address: "Rua das Palmeiras, 88 — Vila Nova",
  },
  donor: {
    id: "demo-donor",
    role: "donor",
    status: "active",
    fullName: "Marcos Silva",
    email: "marcos.silva@example.com",
    phone: "11900000002",
    document: "11144477735",
    donorKind: "individual",
    postalCode: "01310100",
    address: "Av. Paulista, 1000 — Bela Vista",
  },
  collector: {
    id: "demo-collector",
    role: "collector",
    status: "active",
    fullName: "Roberta Souza",
    email: "roberta.souza@example.com",
    phone: "11900000003",
  },
};

export const demoEnrollment: Enrollment = {
  schoolName: "EMEF João Paulo II",
  enrollmentNumber: "2024-00641",
  grade: "8º ano",
  validUntil: "dez 2026",
  status: "verified",
  hasCadUnico: true,
};

export const demoEnrollmentHistory: EnrollmentSubmission[] = [
  {
    ...demoEnrollment,
    id: "enr-demo-01",
    isActive: true,
    createdAt: daysAgo(45),
    documentUri: "demo://documents/matricula-declaracao.jpg",
  },
];

export const seedPoints: CollectionPoint[] = [
  {
    id: "pt-vila-nova",
    name: "Ponto Solidário Vila Nova",
    address: "Rua das Acácias, 234",
    district: "Vila Nova",
    distanceKm: 0.8,
    hours: "Seg–Sex 7h–18h",
    openNow: true,
    rating: 4.8,
    capacity: 85,
    latitude: -23.5489,
    longitude: -46.6388,
    imageKey: "pointA",
  },
  {
    id: "pt-esperanca",
    name: "ONG Esperança Viva",
    address: "Av. Brasil, 1.120",
    district: "Centro",
    distanceKm: 1.4,
    hours: "Seg–Sáb 8h–17h",
    openNow: true,
    rating: 4.9,
    capacity: 60,
    latitude: -23.5505,
    longitude: -46.6333,
    imageKey: "pointB",
  },
  {
    id: "pt-norte",
    name: "Centro Comunitário Norte",
    address: "Rua do Sol, 55",
    district: "Zona Norte",
    distanceKm: 3.2,
    hours: "Ter–Sáb 9h–16h",
    openNow: false,
    rating: 4.6,
    capacity: 40,
    latitude: -23.5,
    longitude: -46.62,
    imageKey: "pointC",
  },
];

export const seedStock: StockItemAdministrativeDetails[] = [
  { id: "st-camisa", category: "camisa", sizes: ["P", "M", "G", "GG"], quantity: 124, condition: "muito_bom", location: "Estoque A — Prateleira 03", school: "EMEF João Paulo II", donorName: "Marcos S.", receivedAt: daysAgo(6, 9) },
  { id: "st-calca", category: "calca", sizes: ["36", "38", "40", "42"], quantity: 87, condition: "bom", location: "Estoque A — Prateleira 05", school: "EMEF Central", donorName: "Maria F.", receivedAt: daysAgo(8) },
  { id: "st-shorts", category: "shorts", sizes: ["P", "M", "G"], quantity: 12, condition: "novo", location: "Estoque B — Prateleira 01", school: "EMEF Norte", donorName: "Roberto A.", receivedAt: daysAgo(3) },
  { id: "st-jaqueta", category: "jaqueta", sizes: ["M", "G"], quantity: 31, condition: "muito_bom", location: "Estoque B — Prateleira 02", school: "EMEF Central", donorName: "Carlos M.", receivedAt: daysAgo(2) },
  { id: "st-agasalho", category: "agasalho", sizes: ["P", "M", "G"], quantity: 18, condition: "bom", location: "Estoque A — Prateleira 07", school: "EMEF João Paulo II", donorName: "Lucia P.", receivedAt: daysAgo(5) },
  { id: "st-kit", category: "kit", sizes: ["Único"], quantity: 116, condition: "novo", location: "Estoque C — Prateleira 01", school: "Todas", donorName: "Papelaria Avenida", receivedAt: daysAgo(1) },
];

export const seedDonations: Donation[] = [
  { id: "don-1", protocol: "DOA-2024-1847", donorName: "Carlos Mendes", category: "camisa", size: "G", quantity: 3, condition: "muito_bom", pointId: "pt-vila-nova", scheduledFor: daysAgo(0, 9), status: "received", createdAt: daysAgo(2) },
  { id: "don-2", protocol: "DOA-2024-1851", donorName: "Maria Fernanda", category: "kit", size: "Único", quantity: 2, condition: "novo", pointId: "pt-esperanca", scheduledFor: daysAgo(0, 8), status: "received", createdAt: daysAgo(1) },
  { id: "don-3", protocol: "DOA-2024-1853", donorName: "Roberto Alves", category: "calca", size: "38", quantity: 4, condition: "bom", pointId: "pt-norte", scheduledFor: daysAgo(1, 15), status: "received", createdAt: daysAgo(3) },
  { id: "don-4", protocol: "DOA-2024-1790", donorName: "Marcos Silva", category: "agasalho", size: "M", quantity: 5, condition: "muito_bom", pointId: "pt-vila-nova", scheduledFor: daysAgo(12), status: "stocked", createdAt: daysAgo(14) },
  { id: "don-5", protocol: "DOA-2024-1866", donorName: "Marcos Silva", category: "camisa", size: "M", quantity: 6, condition: "muito_bom", pointId: "pt-vila-nova", scheduledFor: inDays(2, 10), status: "scheduled", createdAt: daysAgo(0) },
];

const timeline = (labels: readonly string[], done: number) =>
  labels.map((label, i) => ({ label, at: i < done ? daysAgo(labels.length - i, 9 + i) : undefined }));

export const seedRequests: SupportRequest[] = [
  { id: "req-0291", protocol: "SOL-2024-0291", studentName: "Ana Carolina Santos", schoolName: "EMEF João Paulo II", contactMasked: "(**) *****-**01", items: [{ category: "camisa", size: "M", quantityRequested: 2, quantityApproved: 2 }, { category: "kit", size: "Único", quantityRequested: 1, quantityApproved: 1 }], status: "ready", pointId: "pt-vila-nova", pickupAt: inDays(1, 14), createdAt: daysAgo(4), timeline: timeline(REQUEST_STEPS, 5) },
  { id: "req-0244", protocol: "SOL-2024-0244", studentName: "Ana Carolina Santos", schoolName: "EMEF João Paulo II", contactMasked: "(**) *****-**01", items: [{ category: "calca", size: "38", quantityRequested: 1, quantityApproved: 1 }, { category: "jaqueta", size: "G", quantityRequested: 1, quantityApproved: 1 }], status: "delivered", pointId: "pt-norte", pickupAt: daysAgo(10), createdAt: daysAgo(14), timeline: timeline(REQUEST_STEPS, 6) },
  { id: "req-0198", protocol: "SOL-2024-0198", studentName: "Ana Carolina Santos", schoolName: "EMEF João Paulo II", contactMasked: "(**) *****-**01", items: [{ category: "kit", size: "Único", quantityRequested: 1, quantityApproved: 1 }], status: "approved", pointId: "pt-vila-nova", pickupAt: inDays(4), createdAt: daysAgo(2), timeline: timeline(REQUEST_STEPS, 2) },
  { id: "req-0310", protocol: "SOL-2024-0310", studentName: "Marcos Oliveira", schoolName: "EMEF João Paulo II", contactMasked: "(**) *****-**42", items: [{ category: "camisa", size: "M", quantityRequested: 2, quantityApproved: 2 }, { category: "kit", size: "Único", quantityRequested: 1, quantityApproved: 1 }], status: "ready", pointId: "pt-vila-nova", pickupAt: inDays(0, 14), createdAt: daysAgo(3), timeline: timeline(REQUEST_STEPS, 5) },
  { id: "req-0312", protocol: "SOL-2024-0312", studentName: "Beatriz Lima", schoolName: "EMEF Central", contactMasked: "(**) *****-**18", items: [{ category: "calca", size: "36", quantityRequested: 1, quantityApproved: 1 }, { category: "shorts", size: "P", quantityRequested: 1, quantityApproved: 1 }], status: "separating", pointId: "pt-norte", pickupAt: inDays(0, 15), createdAt: daysAgo(2), timeline: timeline(REQUEST_STEPS, 3) },
  { id: "req-0315", protocol: "SOL-2024-0315", studentName: "Pedro Costa", schoolName: "EMEF Norte", contactMasked: "(**) *****-**07", items: [{ category: "agasalho", size: "M", quantityRequested: 1, quantityApproved: 0 }], status: "in_review", pointId: "pt-esperanca", pickupAt: inDays(3), createdAt: daysAgo(1), timeline: timeline(REQUEST_STEPS, 1) },
];

export const seedDeliveries: Delivery[] = [
  {
    requestId: "req-0244",
    receiptNumber: "ENT-2024-0244",
    photoUri: "demo://delivery-proofs/req-0244/itens.jpg",
    signaturePath: "demo://delivery-proofs/req-0244/assinatura.svg",
    deliveredAt: daysAgo(1, 14),
    collectorName: "Roberta Souza",
  },
];

export const seedMovements: StockMovement[] = [
  { id: "mv-1", label: "Camisa Tam. M", type: "in", quantity: 5, from: "Triagem", to: "Estoque A", responsible: "Roberta S.", createdAt: daysAgo(0, 9) },
  { id: "mv-2", label: "Kit Escolar", type: "out", quantity: 3, from: "Estoque B", to: "Distribuição", responsible: "Carlos M.", createdAt: daysAgo(0, 8) },
  { id: "mv-3", label: "Calça Tam. 38", type: "transfer", quantity: 2, from: "Estoque A", to: "Estoque B", responsible: "Marina F.", createdAt: daysAgo(1, 16) },
  { id: "mv-4", label: "Shorts Tam. P", type: "in", quantity: 8, from: "Coleta Norte", to: "Estoque A", responsible: "Roberta S.", createdAt: daysAgo(1, 14) },
];

export const seedNotifications: AppNotification[] = [
  { id: "nt-1", title: "Pedido aprovado!", body: "Sua solicitação SOL-2024-0291 foi aprovada e está em preparação.", kind: "success", createdAt: new Date().toISOString(), read: false },
  { id: "nt-2", title: "Kit pronto para retirada", body: "Seu kit está pronto no Ponto Solidário Vila Nova — Balcão de atendimento.", kind: "info", createdAt: daysAgo(0, new Date().getHours() - 2), read: false },
  { id: "nt-3", title: "Lembrete de retirada", body: "Você tem um kit aguardando retirada. Confirme o horário agendado.", kind: "reminder", createdAt: daysAgo(1), read: true },
];

export const defaultSettings: UserSettings = {
  pushEnabled: true,
  emailEnabled: true,
  pickupReminders: true,
  campaignUpdates: false,
  shareLocation: true,
  largeText: false,
  reduceMotion: false,
};

export const monthlyDonations = [
  { month: "Jul", value: 82 },
  { month: "Ago", value: 96 },
  { month: "Set", value: 104 },
  { month: "Out", value: 121 },
  { month: "Nov", value: 98 },
  { month: "Dez", value: 135 },
  { month: "Jan", value: 142 },
];

/** Pendências de revisão da equipe no modo demonstração. */
export const demoPendingReviews: PendingReviews = {
  enrollments: [
    {
      enrollmentId: "enr-demo-review-1",
      studentName: "Pedro Costa",
      schoolName: "EMEF Norte",
      enrollmentNumber: "2024-01177",
      grade: "6º ano",
      validUntil: "dez 2026",
      submittedAt: daysAgo(1),
      documentPath: "demo/matricula-1.jpg",
      cadUnicoPath: "demo/cadunico-1.jpg",
      files: ["demo/0-documento-com-foto.jpg", "demo/cadunico-1.jpg", "demo/matricula-1.jpg"],
    },
  ],
  collectors: [
    {
      profileId: "col-demo-review-1",
      fullName: "Lucas Pereira",
      email: "lucas.pereira@example.com",
      phone: "11900000004",
      createdAt: daysAgo(2),
      files: ["demo/0-documento-com-foto.jpg", "demo/1-cnh-categoria-b.jpg"],
    },
  ],
};
