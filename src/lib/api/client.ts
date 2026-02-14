/**
 * HTTP client – single instance used by all API modules.
 * Centralizes fetch, error handling, and base URL.
 */

import { getApiUrl } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text || response.statusText };
  }

  if (!response.ok) {
    const msg = typeof body === "object" && body !== null && "message" in body
      ? String((body as { message: unknown }).message)
      : response.statusText;
    throw new ApiError(
      msg,
      response.status,
      typeof body === "object" && body !== null && "code" in body ? String((body as { code: unknown }).code) : undefined,
      body
    );
  }

  return body as T;
}

/**
 * GET request. Query params with value "all", "", or undefined are omitted.
 */
export async function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = getApiUrl(path, params);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new ApiError(
        `Cannot connect to backend at ${url}. Is the backend running on port 3000?`,
        0,
        "CONNECTION_REFUSED",
        { url, originalError: error.message }
      );
    }
    throw error;
  }
}

/**
 * GET request that returns a blob (e.g. Excel export).
 */
export async function getBlob(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<Blob> {
  const url = getApiUrl(path, params);
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || response.statusText, response.status);
  }
  return response.blob();
}
