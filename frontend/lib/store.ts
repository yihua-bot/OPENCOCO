"use client";
import { create } from "zustand";
import { api, User } from "./api";

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  setToken: (token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("coco_token") : null,
  loading: false,

  setToken: (token) => {
    localStorage.setItem("coco_token", token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem("coco_token");
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    set({ loading: true });
    try {
      const user = await api.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
