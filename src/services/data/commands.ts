/** Escritas: sempre por RPC, que valida papel, status e regras no servidor. */
import type { DonorKind, Enrollment, ItemCategory, ItemCondition, MovementType, RequestItem, RequestStatus, UserSettings } from "../../domain/models";
import { requireSupabase } from "../../lib/supabase";
import type { DonationRow, IdRow, ProtocolRow } from "./rows";
import { toDonation } from "./mappers";
import { unwrap } from "./client";

export async function createDonation(input: {
  category: ItemCategory;
  size: string;
  quantity: number;
  condition: ItemCondition;
  pointId: string;
  scheduledFor: string;
}) {
  const row = await unwrap<DonationRow>(
    requireSupabase().rpc("create_donation", {
      p_category: input.category,
      p_size: input.size,
      p_quantity: input.quantity,
      p_condition: input.condition,
      p_point_id: input.pointId,
      p_scheduled_for: input.scheduledFor,
    }),
  );
  return toDonation(row);
}

export async function reviewDonation(donationId: string, decision: "approve" | "reject" | "stock", note?: string) {
  await unwrap(requireSupabase().rpc("review_donation", { p_donation_id: donationId, p_decision: decision, p_note: note ?? null }));
}

export async function createRequest(items: RequestItem[], pointId: string, notes: string) {
  const row = await unwrap<IdRow>(
    requireSupabase().rpc("create_request", {
      p_items: items.map((i) => ({ category: i.category, size: i.size, quantity: i.quantityRequested })),
      p_point_id: pointId,
      p_notes: notes || null,
    }),
  );
  return row.id;
}

export async function updateRequestStatus(requestId: string, status: RequestStatus) {
  await unwrap(requireSupabase().rpc("advance_request", { p_request_id: requestId, p_status: status }));
}

export async function cancelRequest(requestId: string) {
  await unwrap(requireSupabase().rpc("cancel_request", { p_request_id: requestId }));
}

export async function confirmDelivery(requestId: string, code: string, photoPath: string, signaturePath: string) {
  const result = await unwrap<string>(
    requireSupabase().rpc("confirm_delivery", {
      p_request_id: requestId,
      p_code: code,
      p_photo_path: photoPath,
      p_signature_path: signaturePath,
    }),
  );
  if (result === "invalid") throw new Error("PICKUP_CODE_INVALID");
  if (result === "locked") {
    throw new Error("BUSINESS_RULE: Código bloqueado após 5 tentativas. Peça ao estudante para gerar um novo código no app.");
  }
}

export async function registerMovement(input: {
  stockItemId: string | null;
  label: string;
  type: MovementType;
  quantity: number;
  from: string;
  to: string;
}) {
  await unwrap(
    requireSupabase().rpc("register_stock_movement", {
      p_stock_item_id: input.stockItemId,
      p_label: input.label,
      p_type: input.type,
      p_quantity: input.quantity,
      p_from: input.from,
      p_to: input.to,
    }),
  );
}

export async function regeneratePickupCode(requestId: string) {
  await unwrap(requireSupabase().rpc("regenerate_pickup_code", { p_request_id: requestId }));
}

export async function openSupportTicket(subject: string, message: string) {
  const row = await unwrap<ProtocolRow>(
    requireSupabase().rpc("open_support_ticket", { p_subject: subject, p_message: message }),
  );
  return row.protocol;
}

export async function markNotificationsRead() {
  await unwrap(requireSupabase().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null));
}

export async function saveSettings(userId: string, s: UserSettings) {
  await unwrap(
    requireSupabase().from("user_settings").upsert({
      user_id: userId,
      push_enabled: s.pushEnabled,
      email_enabled: s.emailEnabled,
      pickup_reminders: s.pickupReminders,
      campaign_updates: s.campaignUpdates,
      share_location: s.shareLocation,
      large_text: s.largeText,
      reduce_motion: s.reduceMotion,
    }),
  );
}

/** Atualiza apenas campos pessoais. Papel e status são bloqueados no banco. */
export async function updateProfile(
  userId: string,
  fields: { fullName: string; phone: string; postalCode: string; address: string; avatarPath?: string },
) {
  await unwrap(
    requireSupabase()
      .from("profiles")
      .update({
        full_name: fields.fullName,
        phone: fields.phone,
        postal_code: fields.postalCode,
        address: fields.address,
        ...(fields.avatarPath ? { avatar_path: fields.avatarPath } : {}),
      })
      .eq("id", userId),
  );
}

/** Completa o cadastro de quem entrou pelo Google (uma única vez; validado no servidor). */
export async function completeProfile(fields: {
  fullName: string;
  document: string;
  rg?: string;
  birthDate?: string;
  donorKind?: DonorKind;
  phone: string;
  postalCode: string;
  address: string;
}) {
  await unwrap(
    requireSupabase().rpc("complete_profile", {
      p_full_name: fields.fullName,
      p_document: fields.document,
      p_rg: fields.rg ?? null,
      p_birth_date: fields.birthDate ?? null,
      p_donor_kind: fields.donorKind ?? null,
      p_phone: fields.phone,
      p_postal_code: fields.postalCode,
      p_address: fields.address,
    }),
  );
}

export async function saveEnrollment(userId: string, e: Enrollment, documentPath?: string, cadUnicoPath?: string) {
  await unwrap(
    requireSupabase().rpc("submit_enrollment", {
      p_school_name: e.schoolName,
      p_enrollment_number: e.enrollmentNumber,
      p_grade: e.grade,
      p_valid_until: e.validUntil,
      p_document_path: documentPath ?? null,
      p_cadunico_document_path: cadUnicoPath ?? null,
    }),
  );
  return userId;
}

export async function reviewEnrollment(enrollmentId: string, decision: "verify" | "reject", note: string) {
  await unwrap(
    requireSupabase().rpc("review_enrollment", {
      p_enrollment_id: enrollmentId,
      p_decision: decision,
      p_note: note || null,
    }),
  );
}

export async function reviewCollector(profileId: string, decision: "approve" | "reject") {
  await unwrap(requireSupabase().rpc("review_collector", { p_profile_id: profileId, p_decision: decision }));
}
