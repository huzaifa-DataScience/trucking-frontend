/**
 * Daily Work & Time Reports — upload, AI extraction and review checks.
 * Backend: /daily-reports (originals in private file storage; nothing persisted to SQL yet).
 */
import { ApiError, getBlob, get, post } from "@/lib/api/client";
import { getApiUrl } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/store";

export type FieldType = "text" | "time" | "number" | "yesno" | "choice" | "multi";
export type FieldStatus = "value" | "empty" | "unreadable" | "not_applicable" | "conflict" | "invalid";
export type FieldValue = string | number | string[] | null;

export type FieldDef = {
  key: string;
  label: string;
  section: string;
  type: FieldType;
  options?: string[];
  unit?: "LF" | "EA";
  sensitive?: boolean;
};

export type DailyReportTemplate = {
  version: string;
  sections: { id: string; label: string }[];
  fields: FieldDef[];
  systems: { code: string; label: string }[];
  rules: { discrepancyToleranceMinutes: number; maxShiftMinutes: number; lowConfidence: number };
  providerConfigured: boolean;
  maxUploadBytes: number;
};

export type ExtractedField = {
  key: string;
  value: FieldValue;
  raw: unknown;
  status: FieldStatus;
  confidence: number | null;
  note?: string;
};

export type ReviewIssue = {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
  fields: string[];
};

export type TimeSummary = {
  shiftMinutes: number | null;
  lunchMinutes: number | null;
  calculatedMinutes: number | null;
  reportedMinutes: number | null;
  discrepancyMinutes: number | null;
  overnight: boolean;
  allocatedMinutes: number | null;
  unallocatedMinutes: number | null;
};

export type ReviewResult = { workDate: string | null; time: TimeSummary; issues: ReviewIssue[] };

export type DocumentMeta = {
  id: string;
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "application/pdf";
  sizeBytes: number;
  uploadedAt: string;
};

export type ExtractionResult = {
  document: DocumentMeta;
  duplicate: boolean;
  extraction:
    | {
        status: "complete";
        provider: string;
        model: string;
        templateVersion: string;
        durationMs: number;
        fields: ExtractedField[];
        review: ReviewResult;
      }
    | { status: "failed"; code: string; message: string };
};

export function getDailyReportTemplate(): Promise<DailyReportTemplate> {
  return get<DailyReportTemplate>("/daily-reports/template");
}

/**
 * Upload one report and wait for extraction. XHR so the caller can show upload progress;
 * `onUploaded` fires when the bytes are sent and the server starts extracting.
 */
export function uploadDailyReport(
  file: File,
  handlers: { onProgress?: (fraction: number) => void; onUploaded?: () => void; signal?: AbortSignal } = {}
): Promise<ExtractionResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", getApiUrl("/daily-reports/uploads"));
    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) handlers.onProgress?.(e.loaded / e.total);
    };
    xhr.upload.onload = () => handlers.onUploaded?.();
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* keep null */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body as ExtractionResult);
        return;
      }
      const msg = (body as { message?: string | string[] } | null)?.message;
      reject(new ApiError((Array.isArray(msg) ? msg.join(" ") : msg) || "Upload failed", xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Could not reach the server. Check your connection and try again.", 0));
    xhr.onabort = () => reject(new ApiError("Upload cancelled", 0, "ABORTED"));
    handlers.signal?.addEventListener("abort", () => xhr.abort());
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export function reextractDailyReport(documentId: string): Promise<ExtractionResult> {
  return post<ExtractionResult>(`/daily-reports/documents/${encodeURIComponent(documentId)}/extract`, {});
}

export function getDailyReportDocument(documentId: string): Promise<Blob> {
  return getBlob(`/daily-reports/documents/${encodeURIComponent(documentId)}`);
}

export function validateDailyReport(
  fields: ExtractedField[],
  corrections: Record<string, FieldValue>
): Promise<{ fields: ExtractedField[]; review: ReviewResult }> {
  return post("/daily-reports/validate", { fields, corrections });
}
