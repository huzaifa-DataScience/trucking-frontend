/**
 * HTTP client – single instance used by all API modules.
 * Centralizes fetch, error handling, base URL, and JWT (Bearer) token.
 */
 
import { getAccessToken } from "@/lib/auth/store";
import { getApiUrl } from "./config";

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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
    if (response.status === 403) {
      // 403 Forbidden = not admin, redirect to dashboard
      if (typeof window !== "undefined") window.location.href = "/job";
      throw new ApiError("Access denied. Admin role required.", 403, "FORBIDDEN", body);
    }
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
 * GET request without Authorization (for public endpoints, e.g. GET /siteline/status).
 * On 401, throws ApiError but does NOT clear auth or redirect (so the page can show a message).
 */
export async function getPublic<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = getApiUrl(path, params);
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
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
      : typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : response.statusText;
    throw new ApiError(
      response.status === 401 ? "Not authorized. Please log in to view billing." : msg,
      response.status,
      undefined,
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
      headers: authHeaders(),
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new ApiError(
        `Cannot connect to backend at ${url}. Is the backend running?`,
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
  const response = await fetch(url, { method: "GET", headers: authHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || response.statusText, response.status);
  }
  return response.blob();
}

/**
 * POST request with JSON body.
 */
export async function post<T>(
  path: string,
  body: unknown
): Promise<T> {
  const url = getApiUrl(path);
  const response = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

/**
 * PATCH request with JSON body.
 */
export async function patch<T>(
  path: string,
  body: unknown
): Promise<T> {
  const url = getApiUrl(path);
  const response = await fetch(url, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

/**
 * DELETE request with optional JSON body.
 */
export async function del<T>(
  path: string,
  body?: unknown
): Promise<T> {
  const url = getApiUrl(path);
  const response = await fetch(url, {
    method: "DELETE",
    headers: { ...authHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return handleResponse<T>(response);
}
