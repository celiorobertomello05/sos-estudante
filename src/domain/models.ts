/**
 * Modelos de domínio do SOS Estudante.
 * Fluxo: Doação → Ponto parceiro → Triagem → Estoque → Solicitação →
 * Separação → Distribuição → Entrega com código de verificação.
 */

export type UserRole = "student" | "donor" | "collector";
export type AccountStatus = "active" | "pending" | "blocked";
export type DonorKind = "individual" | "company";

export type ItemCategory = "camisa" | "calca" | "agasalho" | "kit" | "shorts" | "jaqueta";
export type ItemCondition = "novo" | "muito_bom" | "bom";

export type DonationStatus = "scheduled" | "received" | "approved" | "rejected" | "stocked";

export type RequestStatus =
  | "in_review"
  | "approved"
  | "separating"
  | "ready"
  | "delivered"
  | "cancelled";

export type MovementType = "in" | "out" | "transfer" | "adjust";

export interface Profile {
  id: string;
  role: UserRole;
  status: AccountStatus;
  fullName: string;
  email: string;
  phone?: string;
  document?: string;
  /** Número do RG (pessoa física). */
  rg?: string;
  birthDate?: string;
  donorKind?: DonorKind;
  postalCode?: string;
  address?: string;
  avatarUri?: string;
}

export interface Enrollment {
  schoolName: string;
  enrollmentNumber: string;
  grade: string;
  validUntil: string;
  status: "pending" | "verified" | "rejected";
  documentUri?: string;
  /** Folha resumo do CadÚnico anexada a esta submissão. */
  hasCadUnico?: boolean;
  /** Imagem local do CadÚnico escolhida antes do envio. */
  cadUnicoUri?: string;
  /** Motivo informado pela equipe ao recusar. */
  reviewNote?: string;
}

/** Matrícula aguardando validação pela equipe. */
export interface PendingEnrollmentReview {
  enrollmentId: string;
  studentName: string;
  schoolName: string;
  enrollmentNumber: string;
  grade: string;
  validUntil: string;
  submittedAt: string;
  documentPath: string | null;
  cadUnicoPath: string | null;
  /** Todos os arquivos do estudante no bucket privado `documents`. */
  files: string[];
}

/** Cadastro de coletor aguardando aprovação pela equipe. */
export interface PendingCollectorReview {
  profileId: string;
  fullName: string;
  email: string;
  phone?: string;
  createdAt: string;
  files: string[];
}

export interface PendingReviews {
  enrollments: PendingEnrollmentReview[];
  collectors: PendingCollectorReview[];
}

export interface EnrollmentSubmission extends Enrollment {
  id: string;
  isActive: boolean;
  createdAt: string;
}

export function findActiveEnrollment(
  submissions: readonly EnrollmentSubmission[],
): EnrollmentSubmission | null {
  return submissions.find((submission) => submission.isActive) ?? null;
}

export interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  district: string;
  distanceKm: number;
  hours: string;
  openNow: boolean;
  rating: number;
  capacity: number;
  latitude: number;
  longitude: number;
  imageKey: ImageKey;
}

export interface StockItem {
  id: string;
  category: ItemCategory;
  sizes: string[];
  quantity: number;
  condition: ItemCondition;
}

/** Detalhes internos disponíveis apenas em fixtures demo ou backend autorizado. */
export interface StockItemAdministrativeDetails extends StockItem {
  location: string;
  school: string;
  donorName: string;
  receivedAt: string;
}

export function hasStockItemAdministrativeDetails(
  item: StockItem,
): item is StockItemAdministrativeDetails {
  return (
    "location" in item &&
    typeof item.location === "string" &&
    "school" in item &&
    typeof item.school === "string" &&
    "donorName" in item &&
    typeof item.donorName === "string" &&
    "receivedAt" in item &&
    typeof item.receivedAt === "string"
  );
}

export interface Donation {
  id: string;
  protocol: string;
  donorName: string;
  category: ItemCategory;
  size: string;
  quantity: number;
  condition: ItemCondition;
  pointId: string;
  scheduledFor: string;
  status: DonationStatus;
  reviewNote?: string;
  createdAt: string;
}

export interface RequestItem {
  category: ItemCategory;
  size: string;
  quantityRequested: number;
  quantityApproved: number;
}

export interface TimelineEntry {
  label: string;
  at?: string;
}

export interface SupportRequest {
  id: string;
  protocol: string;
  studentName: string;
  schoolName: string;
  contactMasked: string;
  items: RequestItem[];
  status: RequestStatus;
  pointId: string;
  pickupAt: string;
  createdAt: string;
  notes?: string;
  timeline: TimelineEntry[];
}

export interface Delivery {
  requestId: string;
  receiptNumber: string;
  photoUri: string;
  signaturePath: string;
  deliveredAt: string;
  collectorName: string;
}

export interface StockMovement {
  id: string;
  label: string;
  type: MovementType;
  quantity: number;
  from: string;
  to: string;
  responsible: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  kind: "success" | "info" | "reminder";
  createdAt: string;
  read: boolean;
}

export interface SupportTicket {
  id: string;
  protocol: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface UserSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  pickupReminders: boolean;
  campaignUpdates: boolean;
  shareLocation: boolean;
  largeText: boolean;
  reduceMotion: boolean;
}

export type ImageKey =
  | "camisa"
  | "calca"
  | "agasalho"
  | "kit"
  | "shorts"
  | "jaqueta"
  | "pointA"
  | "pointB"
  | "pointC"
  | "map";
