import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ApiUnavailableError, apiFetch } from "./api-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  document.cookie = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  });
});

describe("apiFetch", () => {
  it("returns the unwrapped `data` payload on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: { id: "user-1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ id: string }>("/api/v1/auth/me");

    expect(result).toEqual({ id: "user-1" });
  });

  it("sends credentials: include on every request (first-party session cookie auth)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/v1/auth/me");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws ApiError carrying the backend's stable error code on a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/v1/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("throws ApiError instances that are instanceof ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(422, { error: { code: "VALIDATION_ERROR", message: "Invalid." } })));

    try {
      await apiFetch("/api/v1/auth/login", { method: "POST", body: {} });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
    }
  });

  it("throws ApiUnavailableError when the network request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiFetch("/api/v1/auth/me")).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("fetches the CSRF cookie before a mutating request when none is present yet", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/sanctum/csrf-cookie")) {
        document.cookie = "XSRF-TOKEN=fresh-token-value";
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(jsonResponse(200, { data: null }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/v1/auth/login", { method: "POST", body: { email: "a@b.com", password: "x" } });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/sanctum/csrf-cookie"), expect.anything());
  });

  it("never fetches the CSRF cookie for safe (GET) requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/v1/auth/me");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("echoes the XSRF-TOKEN cookie back as the X-XSRF-TOKEN header once present", async () => {
    document.cookie = "XSRF-TOKEN=already-set-token";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/v1/auth/logout", { method: "POST" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["X-XSRF-TOKEN"]).toBe("already-set-token");
  });
});
