import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export type LocalEvidenceFile = {
  uri: string;
  fileName: string;
  mimeType?: string;
  kind: "image" | "video" | "document";
};

export type StoredEvidenceFile = {
  url: string;
  fileName: string;
  mimeType: string;
  kind: "image" | "video" | "document";
};

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

function guessKind(mimeType: string, fileName: string): StoredEvidenceFile["kind"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  const lower = fileName.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|heic)$/.test(lower)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return "video";
  return "document";
}

export async function uploadReportEvidence(
  reportId: string,
  files: LocalEvidenceFile[]
): Promise<StoredEvidenceFile[]> {
  if (files.length === 0) return [];

  const uploaded: StoredEvidenceFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const blob = await uriToBlob(file.uri);
    const mimeType = file.mimeType ?? blob.type ?? "application/octet-stream";
    const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `citizenReports/${reportId}/${i}_${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: mimeType });
    const url = await getDownloadURL(storageRef);
    uploaded.push({
      url,
      fileName: file.fileName,
      mimeType,
      kind: file.kind ?? guessKind(mimeType, file.fileName),
    });
  }

  return uploaded;
}
