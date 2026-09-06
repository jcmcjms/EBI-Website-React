type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();
let accessToken: string | null = null;

export const authStore = {
  getToken: () => accessToken,
  setToken: (token: string | null) => {
    accessToken = token;
    listeners.forEach((l) => l(token));
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
