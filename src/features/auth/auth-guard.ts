import { redirect } from "@tanstack/react-router";
import { authStore } from "@/lib/auth";

export const requireAuth = async () => {
  // Server: never trust — redirect to login.
  if (typeof window === "undefined") throw redirect({ to: "/login" });
  // Client: check the in-memory token.
  if (!authStore.getToken()) throw redirect({ to: "/login" });
};
