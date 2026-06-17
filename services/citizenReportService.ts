import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import type { ForwardOfficeId, ReportCategory } from "../constants/citizenReportConfig";
import { REPORT_CATEGORY_LABELS } from "../constants/citizenReportConfig";
import type { LocalEvidenceFile, StoredEvidenceFile } from "./reportEvidenceUpload";
import { uploadReportEvidence } from "./reportEvidenceUpload";
import { db } from "./firebase";

export type ReportLocation = {
  latitude: number;
  longitude: number;
  address: string;
  mapsLink: string;
};

export type CitizenReportPayload = {
  category: ReportCategory;
  uid: string;
  reportedBy: string;
  contactNumber: string;
  details: Record<string, string>;
  location: ReportLocation;
  evidenceFiles?: LocalEvidenceFile[];
};

export async function submitCitizenReport(payload: CitizenReportPayload): Promise<string> {
  const reportRef = await addDoc(collection(db, "citizenReports"), {
    category: payload.category,
    categoryLabel: REPORT_CATEGORY_LABELS[payload.category],
    uid: payload.uid,
    reportedBy: payload.reportedBy,
    contactNumber: payload.contactNumber,
    details: payload.details,
    location: payload.location,
    attachments: [] as StoredEvidenceFile[],
    status: "pending",
    forwardedTo: [],
    rejectReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  let attachments: StoredEvidenceFile[] = [];
  if (payload.evidenceFiles && payload.evidenceFiles.length > 0) {
    try {
      attachments = await uploadReportEvidence(reportRef.id, payload.evidenceFiles);
      await updateDoc(doc(db, "citizenReports", reportRef.id), {
        attachments,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Evidence upload failed:", e);
    }
  }

  const summary =
    payload.details.description ||
    payload.details.symptoms ||
    payload.details.incidentPlace ||
    payload.details.lastSeenPlace ||
    "New report submitted";

  const attachNote = attachments.length > 0 ? ` (${attachments.length} attachment(s))` : "";

  await addDoc(collection(db, "notifications"), {
    type: "citizenReport",
    reportId: reportRef.id,
    reportCategory: payload.category,
    title: `📋 ${REPORT_CATEGORY_LABELS[payload.category]}`,
    body: `${payload.reportedBy}: ${String(summary).slice(0, 100)}${attachNote} — ${payload.location.address}`,
    reportedBy: payload.reportedBy,
    reportedByUid: payload.uid,
    contactNumber: payload.contactNumber,
    location: payload.location,
    read: false,
    createdAt: serverTimestamp(),
  });

  return reportRef.id;
}

export async function rejectCitizenReport(
  reportId: string,
  operatorUid: string,
  operatorName: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, "citizenReports", reportId), {
    status: "rejected",
    rejectReason: reason,
    rejectedByUid: operatorUid,
    rejectedByName: operatorName,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function forwardCitizenReport(
  reportId: string,
  offices: { id: ForwardOfficeId; label: string }[],
  operatorUid: string,
  operatorName: string,
  reportSummary?: string
): Promise<void> {
  const forwardedTo = offices.map((o) => ({
    office: o.id,
    officeLabel: o.label,
    forwardedAt: serverTimestamp(),
    forwardedByUid: operatorUid,
    forwardedByName: operatorName,
  }));

  await updateDoc(doc(db, "citizenReports", reportId), {
    status: "forwarded",
    forwardedTo,
    forwardedAt: serverTimestamp(),
    forwardedByUid: operatorUid,
    forwardedByName: operatorName,
    updatedAt: serverTimestamp(),
  });

  const officeList = offices.map((o) => o.label).join(", ");
  await addDoc(collection(db, "notifications"), {
    type: "reportForwarded",
    reportId,
    title: "📤 Report forwarded to institutions",
    body: `Forwarded to: ${officeList}.${reportSummary ? ` Report: ${reportSummary.slice(0, 80)}` : ""}`,
    forwardedOffices: offices.map((o) => o.id),
    read: false,
    createdAt: serverTimestamp(),
  });
}
