/** Colunas lidas em cada consulta (só o que o app usa; o GRANT mínimo do banco depende disso). */


export const PROFILE_COLUMNS =
  "id, role, status, full_name, email, phone, document, rg, birth_date, donor_kind, postal_code, address, avatar_path";
export const ENROLLMENT_COLUMNS =
  "id, school_name, enrollment_number, grade, valid_until, status, is_active, created_at, cadunico_document_path, review_note";
export const POINT_COLUMNS =
  "id, name, address, district, distance_km, hours, open_now, rating, capacity, latitude, longitude, image_key";
export const STOCK_COLUMNS = "id, category, sizes, quantity, condition";
export const DONATION_COLUMNS =
  "id, protocol, donor_name, category, size, quantity, condition, point_id, scheduled_for, status, review_note, created_at";
export const REQUEST_COLUMNS =
  "id, protocol, student_name, school_name, contact_masked, status, point_id, pickup_at, created_at, notes, request_items(category, size, quantity_requested, quantity_approved), request_events(label, created_at)";
export const DELIVERY_COLUMNS =
  "request_id, receipt_number, photo_path, signature_path, delivered_at, collector_name";
export const MOVEMENT_COLUMNS =
  "id, label, type, quantity, from_location, to_location, responsible_name, created_at";
export const NOTIFICATION_COLUMNS = "id, title, body, kind, read_at, created_at";
export const TICKET_COLUMNS = "id, protocol, subject, message, created_at";
export const SETTINGS_COLUMNS =
  "push_enabled, email_enabled, pickup_reminders, campaign_updates, share_location, large_text, reduce_motion";
