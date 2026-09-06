import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { authStore } from "@/lib/auth";

type AuthState =
  | { status: "idle" }
  | { status: "authenticated"; email: string }
  | { status: "unauthenticated" };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "idle" });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.GET("/api/users/me");
      if (res.error) return null;
      return res.data;
    },
    // Only run when we have a token; otherwise short-circuit.
    enabled: authStore.getToken() !== null,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.isLoading) return;
    setState(
      meQuery.data ? { status: "authenticated", email: meQuery.data.user.email }
                  : { status: "unauthenticated" }
    );
  }, [meQuery.data, meQuery.isLoading]);

  // If a refresh fails mid-session (e.g., password change elsewhere), force logout.
  useEffect(() => {
    return authStore.subscribe((token) => {
      if (token === null) setState({ status: "unauthenticated" });
    });
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await api.POST("/api/auth/login", { body: creds });
      if (res.error) throw new Error("Invalid credentials");
      authStore.setToken(res.data.accessToken);
      return res.data;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.POST("/api/auth/revoke");
      authStore.setToken(null);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        state,
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
