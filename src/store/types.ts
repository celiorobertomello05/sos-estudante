import { DEMO_PICKUP_CODE, demoEnrollment, demoEnrollmentHistory, demoProfiles, seedDeliveries, seedDonations, seedMovements, seedNotifications, seedPoints, seedRequests, seedStock } from "../data/seed";
import type { AppNotification, CollectionPoint, Delivery, Donation, Enrollment, EnrollmentSubmission, PendingReviews, StockItem, StockMovement, SupportRequest, SupportTicket, UserRole } from "../domain/models";

/** Tipos e estados iniciais do store. */
export type Mode = "signedOut" | "demo" | "online";
export type LocationStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

export interface DataState {
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
  pickupCodes: Record<string, string>;
  lockedPickupCodes: string[];
}

export const demoData = (role: UserRole): DataState => ({
  enrollment: role === "student" ? demoEnrollment : null,
  enrollmentHistory: role === "student" ? demoEnrollmentHistory : [],
  points: seedPoints,
  stock: seedStock,
  donations: role === "donor" ? seedDonations.filter((d) => d.donorName === "Marcos Silva") : seedDonations,
  requests:
    role === "student"
      ? seedRequests.filter((r) => r.studentName === demoProfiles.student.fullName)
      : role === "collector"
        ? seedRequests
        : [],
  deliveries: seedDeliveries,
  movements: role === "collector" ? seedMovements : [],
  notifications: seedNotifications,
  tickets: [],
  pickupCodes: role === "student" ? { "req-0291": DEMO_PICKUP_CODE } : {},
  lockedPickupCodes: [],
});

export const emptyData: DataState = {
  enrollment: null,
  enrollmentHistory: [],
  points: [],
  stock: [],
  donations: [],
  requests: [],
  deliveries: [],
  movements: [],
  notifications: [],
  tickets: [],
  pickupCodes: {},
  lockedPickupCodes: [],
};

export const emptyReviews: PendingReviews = { enrollments: [], collectors: [] };

export interface Result<T = void> {
  ok: boolean;
  error?: string;
  value?: T;
}
