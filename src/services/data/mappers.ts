/** Conversão linha do banco → modelo do domínio. */
import type { AppNotification, CollectionPoint, Donation, EnrollmentSubmission, ItemCategory, Profile, StockItem, StockMovement, SupportRequest, UserSettings } from "../../domain/models";
import { categoryLabels } from "../../domain/labels";
import { REQUEST_STEPS } from "../../domain/rules";
import type { ProfileRow, EnrollmentRow, CollectionPointRow, StockItemRow, DonationRow, RequestRow, StockMovementRow, NotificationRow, SettingsRow } from "./rows";

export const toProfile = (r: ProfileRow & { role: Profile["role"] }): Profile => ({
  id: r.id,
  role: r.role,
  status: r.status,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone ?? undefined,
  document: r.document ?? undefined,
  rg: r.rg ?? undefined,
  birthDate: r.birth_date ?? undefined,
  donorKind: r.donor_kind ?? undefined,
  postalCode: r.postal_code ?? undefined,
  address: r.address ?? undefined,
});

export const toEnrollment = (r: EnrollmentRow): EnrollmentSubmission => ({
  id: r.id,
  schoolName: r.school_name,
  enrollmentNumber: r.enrollment_number,
  grade: r.grade,
  validUntil: r.valid_until,
  status: r.status,
  isActive: r.is_active,
  createdAt: r.created_at,
  hasCadUnico: Boolean(r.cadunico_document_path),
  reviewNote: r.review_note ?? undefined,
});

export const toPoint = (r: CollectionPointRow): CollectionPoint => ({
  id: r.id,
  name: r.name,
  address: r.address,
  district: r.district,
  distanceKm: Number(r.distance_km ?? 0),
  hours: r.hours,
  openNow: r.open_now,
  rating: Number(r.rating),
  capacity: r.capacity,
  latitude: r.latitude,
  longitude: r.longitude,
  imageKey: r.image_key,
});

export const toStock = (r: StockItemRow): StockItem => ({
  id: r.id,
  category: r.category,
  sizes: r.sizes ?? [],
  quantity: r.quantity,
  condition: r.condition,
});

export const toDonation = (r: DonationRow): Donation => ({
  id: r.id,
  protocol: r.protocol,
  donorName: r.donor_name,
  category: r.category,
  size: r.size,
  quantity: r.quantity,
  condition: r.condition,
  pointId: r.point_id,
  scheduledFor: r.scheduled_for,
  status: r.status,
  reviewNote: r.review_note ?? undefined,
  createdAt: r.created_at,
});

export const toRequest = (r: RequestRow): SupportRequest => ({
  id: r.id,
  protocol: r.protocol,
  studentName: r.student_name,
  schoolName: r.school_name,
  contactMasked: r.contact_masked,
  status: r.status,
  pointId: r.point_id,
  pickupAt: r.pickup_at,
  createdAt: r.created_at,
  notes: r.notes ?? undefined,
  items: (r.request_items ?? []).map((i) => ({
    category: i.category,
    size: i.size,
    quantityRequested: i.quantity_requested,
    quantityApproved: i.quantity_approved,
  })),
  // Todas as etapas aparecem; as concluídas recebem a data do evento.
  timeline: REQUEST_STEPS.map((label) => ({
    label,
    at: (r.request_events ?? []).find((e) => e.label === label)?.created_at,
  })),
});

export const toMovement = (r: StockMovementRow): StockMovement => ({
  id: r.id,
  label: String(r.label).replace(/^(\w+)/, (key: string) => categoryLabels[key as ItemCategory] ?? key),
  type: r.type,
  quantity: r.quantity,
  from: r.from_location,
  to: r.to_location,
  responsible: r.responsible_name,
  createdAt: r.created_at,
});

export const toNotification = (r: NotificationRow): AppNotification => ({
  id: r.id,
  title: r.title,
  body: r.body,
  kind: r.kind,
  createdAt: r.created_at,
  read: Boolean(r.read_at),
});

export const toSettings = (r: SettingsRow): UserSettings => ({
  pushEnabled: r.push_enabled,
  emailEnabled: r.email_enabled,
  pickupReminders: r.pickup_reminders,
  campaignUpdates: r.campaign_updates,
  shareLocation: r.share_location,
  largeText: r.large_text,
  reduceMotion: r.reduce_motion,
});
