import type { Enrollment, EnrollmentSubmission, SupportTicket, UserSettings } from "../domain/models";
import * as api from "../services/dataService";
import { saveSettings } from "../services/preferencesService";
import { uploadFile } from "../services/storageService";
import { localId, protocol } from "../utils/format";
import type { StoreCore } from "./core";

/** Conta, ajuda e configurações. */
export function createAccountActions(core: StoreCore) {
  const { mode, profile, setProfile, data, settings, setSettings, patch, run, refresh, isDemo } = core;

  const openTicket = (subject: string, message: string) =>
    run(async () => {
      if (!isDemo) {
        const p = await api.openSupportTicket(subject, message);
        await refresh();
        return p;
      }
      const ticket: SupportTicket = { id: localId("tk"), protocol: protocol("SUP"), subject, message, createdAt: new Date().toISOString() };
      patch({ tickets: [ticket, ...data.tickets] });
      return ticket.protocol;
    });

  const markAllRead = () =>
    run(async () => {
      if (!isDemo) await api.markNotificationsRead();
      patch({ notifications: data.notifications.map((n) => ({ ...n, read: true })) });
    });

  const updateSettings = (changes: Partial<UserSettings>) =>
    run(async () => {
      const next = { ...settings, ...changes };
      setSettings(next);
      await saveSettings(next);
      if (mode === "online" && profile) await api.saveSettings(profile.id, next);
    });

  const updateProfile = (fields: { fullName: string; phone: string; postalCode: string; address: string }, avatarUri?: string) =>
    run(async () => {
      if (!profile) return;
      if (mode === "online") {
        const avatarPath = avatarUri ? await uploadFile("avatars", `${profile.id}/avatar.jpg`, avatarUri, "image/jpeg") : undefined;
        await api.updateProfile(profile.id, { ...fields, avatarPath });
        return refresh();
      }
      setProfile({ ...profile, ...fields, avatarUri: avatarUri ?? profile.avatarUri });
    });

  const saveEnrollment = (enrollment: Enrollment, documentUri?: string, cadUnicoUri?: string) =>
    run(async () => {
      if (!profile) return;
      if (!cadUnicoUri && !data.enrollment?.hasCadUnico) {
        throw new Error("BUSINESS_RULE: Anexe a folha resumo do CadÚnico.");
      }
      if (mode === "online") {
        const path = documentUri
          ? await uploadFile("documents", `${profile.id}/matricula-${Date.now()}.jpg`, documentUri, "image/jpeg")
          : undefined;
        const cadUnicoPath = cadUnicoUri
          ? await uploadFile("documents", `${profile.id}/cadunico-${Date.now()}.jpg`, cadUnicoUri, "image/jpeg")
          : undefined;
        await api.saveEnrollment(profile.id, enrollment, path, cadUnicoPath);
        return refresh();
      }
      const submittedAt = new Date().toISOString();
      const submission: EnrollmentSubmission = {
        ...enrollment,
        id: localId("enr"),
        status: "verified",
        documentUri,
        hasCadUnico: true,
        isActive: true,
        createdAt: submittedAt,
      };
      patch({
        enrollment: submission,
        enrollmentHistory: [
          submission,
          ...data.enrollmentHistory.map((item) => ({ ...item, isActive: false })),
        ],
      });
    });

  return { openTicket, markAllRead, updateSettings, updateProfile, saveEnrollment };
}
