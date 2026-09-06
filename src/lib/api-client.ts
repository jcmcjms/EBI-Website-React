import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./api-schema";
import { authStore } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

// Single in-flight refresh. All 401s during a refresh wait on this promise.
let refreshPromise: Promise<string | null> | null = null;

async function refresh(): Promise<string | null> {
  // The refresh endpoint reads the httpOnly cookie automatically.
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    authStore.setToken(null);
    return null;
  }
  const data = (await res.json()) as { accessToken: string };
  authStore.setToken(data.accessToken);
  return data.accessToken;
}

const authMiddleware: Middleware = {
  onRequest: async ({ request }) => {
    const token = authStore.getToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return { request };
  },
  onResponse: async ({ response, request }) => {
    if (response.status !== 401) return { response };

    // Don't retry auth endpoints (prevents loops)
    if (request.url.endsWith("/auth/refresh") || request.url.endsWith("/auth/login")) {
      return { response };
    }

    if (!refreshPromise) {
      refreshPromise = refresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (!newToken) {
      // Force redirect to login — handled at the route level via subscribe()
      return { response: new Response(JSON.stringify({ code: "session_expired" }), { status: 401 }) };
    }

    // Retry the original request with the new token
    request.headers.set("Authorization", `Bearer ${newToken}`);
    const retry = await fetch(request);
    return { response: retry };
  },
};

export const api = createClient<paths>({
  baseUrl: API_BASE,
  credentials: "include", // send httpOnly cookies
  headers: { "X-Requested-With": "XMLHttpRequest" }, // same-origin signal
});

api.use(authMiddleware);
