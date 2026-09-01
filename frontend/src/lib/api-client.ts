/**
 * Shared low-level HTTP boundary for the real Laravel backend (AUTH-001
 * §23-25). First-party session-cookie authentication (Laravel Sanctum SPA
 * mode, DECISIONS.md ADR-020) — every request carries `credentials:
 * "include"` so the browser sends/receives the session and XSRF-TOKEN
 * cookies; no token is ever read, stored, or forwarded from application
 * code (CLAUDE.md §10/§25: no LocalStorage auth, no fake JWT).
 *
 * This is deliberately the ONE place that knows the API origin, the error
 * envelope shape, and the CSRF handshake — future modules build their own
 * `features/<module>/api.ts` on top of `apiFetch`, the same pattern
 * `features/auth/api.ts` establishes, rather than scattering `fetch(...)`
 * calls through components (task §23).
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

const XSRF_COOKIE_NAME = "XSRF-TOKEN";
const XSRF_HEADER_NAME = "X-XSRF-TOKEN";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Thrown for every non-2xx response. Carries the backend's stable error
 * code (CLAUDE.md §54) so callers can branch on `code` rather than parsing
 * `message` (which may change wording/translation over time).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? {};
  }
}

/** Thrown when the network request itself fails (offline, DNS, CORS, backend down). */
export class ApiUnavailableError extends Error {
  constructor() {
    super("The server could not be reached.");
    this.name = "ApiUnavailableError";
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Sanctum SPA authentication requires a `GET /sanctum/csrf-cookie` call
 * before any stateful mutating request so the browser holds a valid
 * XSRF-TOKEN cookie to echo back as a header (AUTH-001 §11). Only fetched
 * when the cookie is missing — cheap, idempotent, never on every request.
 */
async function ensureCsrfCookie(): Promise<void> {
  if (readCookie(XSRF_COOKIE_NAME)) return;

  try {
    await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include" });
  } catch {
    // Swallowed deliberately: the subsequent real request will fail with
    // a normal ApiUnavailableError/419-style rejection, which callers
    // already handle — no need to surface this preparatory call's own
    // network error separately.
  }
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}

/**
 * Core request function. Always sends/receives cookies, always parses the
 * `{data}`/`{error}` envelope (Spec #5 §11), never stores anything beyond
 * the current call.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = options.method ?? "GET";

  if (!SAFE_METHODS.has(method)) {
    await ensureCsrfCookie();
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const xsrfToken = readCookie(XSRF_COOKIE_NAME);
  if (xsrfToken) {
    headers[XSRF_HEADER_NAME] = xsrfToken;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiUnavailableError();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody: ApiErrorBody = payload?.error ?? {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred.",
    };
    throw new ApiError(response.status, errorBody);
  }

  return payload?.data as T;
}
