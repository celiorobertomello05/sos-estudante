/** Leituras: tudo que o usuário logado pode ver (o RLS filtra no servidor). */
import type { AppNotification, CollectionPoint, Delivery, Donation, Enrollment, EnrollmentSubmission, PendingReviews, Profile, StockItem, StockMovement, SupportRequest, SupportTicket, UserSettings } from "../../domain/models";
import { findActiveEnrollment } from "../../domain/models";
import { PICKUP_CODE_MAX_ATTEMPTS } from "../../domain/rules";
import { requireSupabase } from "../../lib/supabase";
import { signedUrl } from "../storageService";
import type { ProfileRow, EnrollmentRow, CollectionPointRow, StockItemRow, DonationRow, RequestRow, DeliveryRow, StockMovementRow, NotificationRow, SettingsRow, TicketRow, PickupCodeRow, PendingEnrollmentRow, PendingCollectorRow } from "./rows";
import { PROFILE_COLUMNS, ENROLLMENT_COLUMNS, POINT_COLUMNS, STOCK_COLUMNS, DONATION_COLUMNS, REQUEST_COLUMNS, DELIVERY_COLUMNS, MOVEMENT_COLUMNS, NOTIFICATION_COLUMNS, TICKET_COLUMNS, SETTINGS_COLUMNS } from "./columns";
import { toProfile, toEnrollment, toPoint, toStock, toDonation, toRequest, toMovement, toNotification, toSettings } from "./mappers";
import { unwrap } from "./client";

export interface RemoteSnapshot {
  profile: Profile;
  enrollment: Enrollment | null;
  enrollmentHistory: EnrollmentSubmission[];
  points: CollectionPoint[];
  stock: StockItem[];
  donations: Donation[];
  requests: SupportRequest[];
  deliveries: Delivery[];
  movements: StockMovement[];
  notifications: AppNotification[];
  tickets: SupportTicket[];
  settings: UserSettings | null;
  pickupCodes: Record<string, string>;
  /** Pedidos cujo código foi bloqueado após 5 tentativas erradas. */
  lockedPickupCodes: string[];
}

/**
 * A equipe vê os registros de todos: carrega tudo que ainda exige
 * ação e só o histórico recente do que já terminou. Estudantes e doadores já
 * recebem só os próprios registros pelo RLS, e as regras de elegibilidade do
 * estudante precisam do histórico completo dele.
 */
export const TEAM_HISTORY_LIMIT = 100;

const byNewest = <T extends { created_at: string }>(rows: T[]) =>
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));

async function loadTeamRequests() {
  const db = requireSupabase();
  const [open, closed] = await Promise.all([
    unwrap<RequestRow[]>(db.from("requests").select(REQUEST_COLUMNS).not("status", "in", "(delivered,cancelled)")),
    unwrap<RequestRow[]>(
      db
        .from("requests")
        .select(REQUEST_COLUMNS)
        .in("status", ["delivered", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(TEAM_HISTORY_LIMIT),
    ),
  ]);
  return byNewest([...open, ...closed]);
}

async function loadTeamDonations() {
  const db = requireSupabase();
  const [pending, done] = await Promise.all([
    unwrap<DonationRow[]>(db.from("donations").select(DONATION_COLUMNS).in("status", ["scheduled", "received", "approved"])),
    unwrap<DonationRow[]>(
      db
        .from("donations")
        .select(DONATION_COLUMNS)
        .in("status", ["rejected", "stocked"])
        .order("created_at", { ascending: false })
        .limit(TEAM_HISTORY_LIMIT),
    ),
  ]);
  return byNewest([...pending, ...done]);
}

/** Carrega tudo que o usuário logado pode ver (o RLS filtra no servidor). */
export async function loadSnapshot(userId: string): Promise<RemoteSnapshot> {
  const db = requireSupabase();
  const profileRow = await unwrap<ProfileRow>(
    db.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).single(),
  );
  if (!profileRow.role) throw new Error("BUSINESS_RULE: Conclua o cadastro escolhendo um perfil.");
  const profile = toProfile({ ...profileRow, role: profileRow.role });
  if (profileRow.avatar_path) {
    profile.avatarUri = await signedUrl("avatars", profileRow.avatar_path).catch(() => undefined);
  }
  const isCollector = profile.role === "collector";

  const [enrollmentRows, points, stock, donations, requests, deliveries, movements, notifications, tickets, settings, codes] =
    await Promise.all([
      unwrap<EnrollmentRow[]>(
        db.from("enrollments").select(ENROLLMENT_COLUMNS).eq("student_id", userId).order("created_at", { ascending: false }),
      ),
      unwrap<CollectionPointRow[]>(
        db.from("collection_points").select(POINT_COLUMNS).eq("is_active", true).order("distance_km"),
      ),
      unwrap<StockItemRow[]>(db.from("stock_items").select(STOCK_COLUMNS).order("category")),
      isCollector ? loadTeamDonations() : unwrap<DonationRow[]>(
        db.from("donations").select(DONATION_COLUMNS).order("created_at", { ascending: false }),
      ),
      isCollector ? loadTeamRequests() : unwrap<RequestRow[]>(
        db.from("requests").select(REQUEST_COLUMNS).order("created_at", { ascending: false }),
      ),
      unwrap<DeliveryRow[]>(
        isCollector
          ? db.from("deliveries").select(DELIVERY_COLUMNS).order("delivered_at", { ascending: false }).limit(TEAM_HISTORY_LIMIT)
          : db.from("deliveries").select(DELIVERY_COLUMNS),
      ),
      isCollector
        ? unwrap<StockMovementRow[]>(
            db.from("stock_movements").select(MOVEMENT_COLUMNS).order("created_at", { ascending: false }).limit(50),
          )
        : Promise.resolve([] as StockMovementRow[]),
      unwrap<NotificationRow[]>(
        db.from("notifications").select(NOTIFICATION_COLUMNS).order("created_at", { ascending: false }).limit(50),
      ),
      unwrap<TicketRow[]>(
        db.from("support_tickets").select(TICKET_COLUMNS).order("created_at", { ascending: false }),
      ),
      unwrap<SettingsRow | null>(
        db.from("user_settings").select(SETTINGS_COLUMNS).eq("user_id", userId).maybeSingle(),
      ),
      profile.role === "student"
        ? unwrap<PickupCodeRow[]>(db.from("pickup_codes").select("request_id, code, failed_attempts"))
        : Promise.resolve([] as PickupCodeRow[]),
    ]);

  const enrollmentHistory = enrollmentRows.map(toEnrollment);
  const enrollment = findActiveEnrollment(enrollmentHistory);

  return {
    profile,
    enrollment,
    enrollmentHistory,
    points: points.map(toPoint),
    stock: stock.map(toStock),
    donations: donations.map(toDonation),
    requests: requests.map(toRequest),
    deliveries: deliveries.map((d) => ({
      requestId: d.request_id,
      receiptNumber: d.receipt_number,
      photoUri: d.photo_path,
      signaturePath: d.signature_path,
      deliveredAt: d.delivered_at,
      collectorName: d.collector_name,
    })),
    movements: movements.map(toMovement),
    notifications: notifications.map(toNotification),
    tickets: tickets.map((t) => ({ id: t.id, protocol: t.protocol, subject: t.subject, message: t.message, createdAt: t.created_at })),
    settings: settings ? toSettings(settings) : null,
    pickupCodes: Object.fromEntries(codes.map((c) => [c.request_id, c.code])),
    lockedPickupCodes: codes.filter((c) => c.failed_attempts >= PICKUP_CODE_MAX_ATTEMPTS).map((c) => c.request_id),
  };
}


/** Pendências de revisão da equipe. As RPCs recusam quem não é coletor ativo. */
export async function loadPendingReviews(): Promise<PendingReviews> {
  const db = requireSupabase();
  const [enrollments, collectors] = await Promise.all([
    unwrap<PendingEnrollmentRow[]>(db.rpc("list_pending_enrollments")),
    unwrap<PendingCollectorRow[]>(db.rpc("list_pending_collectors")),
  ]);
  return {
    enrollments: (enrollments ?? []).map((r) => ({
      enrollmentId: r.enrollment_id,
      studentName: r.student_name,
      schoolName: r.school_name,
      enrollmentNumber: r.enrollment_number,
      grade: r.grade,
      validUntil: r.valid_until,
      submittedAt: r.submitted_at,
      documentPath: r.document_path,
      cadUnicoPath: r.cadunico_document_path,
      files: r.student_files ?? [],
    })),
    collectors: (collectors ?? []).map((r) => ({
      profileId: r.profile_id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone ?? undefined,
      createdAt: r.created_at,
      files: r.files ?? [],
    })),
  };
}
