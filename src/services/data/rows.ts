/** Formato das linhas do Supabase (snake_case), como o PostgREST devolve. */
import type { AccountStatus, AppNotification, DonationStatus, DonorKind, Enrollment, ImageKey, ItemCategory, ItemCondition, MovementType, Profile, RequestStatus } from "../../domain/models";

export interface ProfileRow {
  id: string;
  role: Profile["role"] | null;
  status: AccountStatus;
  full_name: string;
  email: string;
  phone: string | null;
  document: string | null;
  rg: string | null;
  birth_date: string | null;
  donor_kind: DonorKind | null;
  postal_code: string | null;
  address: string | null;
  avatar_path: string | null;
}

export interface EnrollmentRow {
  id: string;
  school_name: string;
  enrollment_number: string;
  grade: string;
  valid_until: string;
  status: Enrollment["status"];
  is_active: boolean;
  created_at: string;
  cadunico_document_path: string | null;
  review_note: string | null;
}

export interface CollectionPointRow {
  id: string;
  name: string;
  address: string;
  district: string;
  distance_km: number | string;
  hours: string;
  open_now: boolean;
  rating: number | string;
  capacity: number;
  latitude: number;
  longitude: number;
  image_key: ImageKey;
}

export interface StockItemRow {
  id: string;
  category: ItemCategory;
  sizes: string[];
  quantity: number;
  condition: ItemCondition;
}

export interface DonationRow {
  id: string;
  protocol: string;
  donor_name: string;
  category: ItemCategory;
  size: string;
  quantity: number;
  condition: ItemCondition;
  point_id: string;
  scheduled_for: string;
  status: DonationStatus;
  review_note: string | null;
  created_at: string;
}

export interface RequestItemRow {
  category: ItemCategory;
  size: string;
  quantity_requested: number;
  quantity_approved: number;
}

export interface RequestEventRow {
  label: string;
  created_at: string;
}

export interface RequestRow {
  id: string;
  protocol: string;
  student_name: string;
  school_name: string;
  contact_masked: string;
  status: RequestStatus;
  point_id: string;
  pickup_at: string;
  created_at: string;
  notes: string | null;
  request_items: RequestItemRow[] | null;
  request_events: RequestEventRow[] | null;
}

export interface DeliveryRow {
  request_id: string;
  receipt_number: string;
  photo_path: string;
  signature_path: string;
  delivered_at: string;
  collector_name: string;
}

export interface StockMovementRow {
  id: string;
  label: string;
  type: MovementType;
  quantity: number;
  from_location: string;
  to_location: string;
  responsible_name: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  kind: AppNotification["kind"];
  read_at: string | null;
  created_at: string;
}

export interface SettingsRow {
  push_enabled: boolean;
  email_enabled: boolean;
  pickup_reminders: boolean;
  campaign_updates: boolean;
  share_location: boolean;
  large_text: boolean;
  reduce_motion: boolean;
}

export interface TicketRow {
  id: string;
  protocol: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface PickupCodeRow {
  request_id: string;
  code: string;
  failed_attempts: number;
}

export interface IdRow {
  id: string;
}

export interface ProtocolRow {
  protocol: string;
}


export interface PendingEnrollmentRow {
  enrollment_id: string;
  student_name: string;
  school_name: string;
  enrollment_number: string;
  grade: string;
  valid_until: string;
  document_path: string | null;
  cadunico_document_path: string | null;
  submitted_at: string;
  student_files: string[] | null;
}

export interface PendingCollectorRow {
  profile_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  files: string[] | null;
}
