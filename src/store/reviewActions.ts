import { enrollmentReviewIssue } from "../domain/rules";
import * as api from "../services/dataService";
import { signedUrl } from "../services/storageService";
import type { StoreCore } from "./core";

/** Revisão pela equipe: matrículas, coletores e documentos. */
export function createReviewActions(core: StoreCore) {
  const { reviews, setReviews, run, isDemo, ensureActiveAccount } = core;

  const loadReviews = () =>
    run(async () => {
      ensureActiveAccount();
      const next = isDemo ? reviews : await api.loadPendingReviews();
      setReviews(next);
      return next;
    });

  const reviewEnrollment = (enrollmentId: string, decision: "verify" | "reject", note: string) =>
    run(async () => {
      ensureActiveAccount();
      const target = reviews.enrollments.find((item) => item.enrollmentId === enrollmentId);
      if (!target) throw new Error("BUSINESS_RULE: Esta matrícula já foi revisada.");
      const issue = enrollmentReviewIssue(decision, target, note);
      if (issue) throw new Error(`BUSINESS_RULE: ${issue}`);
      if (!isDemo) {
        await api.reviewEnrollment(enrollmentId, decision, note.trim());
        setReviews(await api.loadPendingReviews());
        return;
      }
      setReviews({ ...reviews, enrollments: reviews.enrollments.filter((item) => item.enrollmentId !== enrollmentId) });
    });

  const reviewCollector = (profileId: string, decision: "approve" | "reject") =>
    run(async () => {
      ensureActiveAccount();
      if (!isDemo) {
        await api.reviewCollector(profileId, decision);
        setReviews(await api.loadPendingReviews());
        return;
      }
      setReviews({ ...reviews, collectors: reviews.collectors.filter((item) => item.profileId !== profileId) });
    });

  /** Link temporário (1 hora) para a equipe abrir um documento em revisão. */
  const openReviewDocument = (path: string) =>
    run(async () => {
      if (isDemo) throw new Error("BUSINESS_RULE: Documentos não estão disponíveis no modo demonstração.");
      return signedUrl("documents", path);
    });

  return { loadReviews, reviewEnrollment, reviewCollector, openReviewDocument };
}
