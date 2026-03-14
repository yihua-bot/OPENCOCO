"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Storyboard providers ──────────────────────────────────────────────────────
export type StoryboardProvider = "claude" | "openai" | "gemini" | "deepseek" | "qwen" | "custom";

export const STORYBOARD_PROVIDERS: { value: StoryboardProvider; label: string }[] = [
  { value: "claude",   label: "Claude (Anthropic)" },
  { value: "openai",   label: "GPT-4o (OpenAI)" },
  { value: "gemini",   label: "Gemini (Google)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen",     label: "Qwen (阿里云)" },
  { value: "custom",   label: "自定义 Base URL" },
];

export const STORYBOARD_MODELS: Record<StoryboardProvider, string[]> = {
  claude:   ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  openai:   ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o3-mini"],
  gemini:   ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  qwen:     ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
  custom:   [],
};

// ── Video providers ───────────────────────────────────────────────────────────
export type VideoProvider = "kling" | "runway" | "pika" | "sora" | "jimeng" | "custom";

export const VIDEO_PROVIDERS: { value: VideoProvider; label: string }[] = [
  { value: "kling",  label: "Kling (快手)" },
  { value: "runway", label: "Runway" },
  { value: "pika",   label: "Pika" },
  { value: "sora",   label: "Sora (OpenAI)" },
  { value: "jimeng", label: "即梦 (字节跳动)" },
  { value: "custom", label: "自定义" },
];

// ── Entry shapes ──────────────────────────────────────────────────────────────
export interface StoryboardEntry {
  id: string;
  provider: StoryboardProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  fallbacks?: { provider: StoryboardProvider; apiKey: string; model: string; baseUrl?: string }[];
}

export interface VideoEntry {
  id: string;
  provider: VideoProvider;
  apiKey: string;
  apiSecret?: string;
  baseUrl?: string;
}

// ── Image providers ───────────────────────────────────────────────────────────
export type ImageProvider = "mock" | "openai" | "replicate" | "custom";

export const IMAGE_PROVIDERS: { value: ImageProvider; label: string }[] = [
  { value: "mock",      label: "Mock (免费占位图)" },
  { value: "openai",    label: "DALL-E 3 (OpenAI)" },
  { value: "replicate", label: "FLUX (Replicate)" },
  { value: "custom",    label: "自定义" },
];

export interface ImageEntry {
  id: string;
  provider: ImageProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// ── Store ─────────────────────────────────────────────────────────────────────
interface ApiKeyStore {
  sbEntries: StoryboardEntry[];
  sbActiveId: string | null;
  vidEntries: VideoEntry[];
  vidActiveId: string | null;
  imgEntries: ImageEntry[];
  imgActiveId: string | null;

  addSbEntry: (e: Omit<StoryboardEntry, "id">) => void;
  updateSbEntry: (id: string, patch: Partial<Omit<StoryboardEntry, "id">>) => void;
  deleteSbEntry: (id: string) => void;
  setSbActive: (id: string) => void;

  addVidEntry: (e: Omit<VideoEntry, "id">) => void;
  updateVidEntry: (id: string, patch: Partial<Omit<VideoEntry, "id">>) => void;
  deleteVidEntry: (id: string) => void;
  setVidActive: (id: string) => void;

  addImgEntry: (e: Omit<ImageEntry, "id">) => void;
  updateImgEntry: (id: string, patch: Partial<Omit<ImageEntry, "id">>) => void;
  deleteImgEntry: (id: string) => void;
  setImgActive: (id: string) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useApiKeyStore = create<ApiKeyStore>()(
  persist(
    (set) => ({
      sbEntries: [],
      sbActiveId: null,
      vidEntries: [],
      vidActiveId: null,
      imgEntries: [],
      imgActiveId: null,

      addSbEntry: (e) => {
        const id = uid();
        set((s) => ({ sbEntries: [...s.sbEntries, { ...e, id }], sbActiveId: s.sbActiveId ?? id }));
      },
      updateSbEntry: (id, patch) =>
        set((s) => ({ sbEntries: s.sbEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteSbEntry: (id) =>
        set((s) => {
          const entries = s.sbEntries.filter((e) => e.id !== id);
          return { sbEntries: entries, sbActiveId: s.sbActiveId === id ? (entries[0]?.id ?? null) : s.sbActiveId };
        }),
      setSbActive: (id) => set({ sbActiveId: id }),

      addVidEntry: (e) => {
        const id = uid();
        set((s) => ({ vidEntries: [...s.vidEntries, { ...e, id }], vidActiveId: s.vidActiveId ?? id }));
      },
      updateVidEntry: (id, patch) =>
        set((s) => ({ vidEntries: s.vidEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteVidEntry: (id) =>
        set((s) => {
          const entries = s.vidEntries.filter((e) => e.id !== id);
          return { vidEntries: entries, vidActiveId: s.vidActiveId === id ? (entries[0]?.id ?? null) : s.vidActiveId };
        }),
      setVidActive: (id) => set({ vidActiveId: id }),

      addImgEntry: (e) => {
        const id = uid();
        set((s) => ({ imgEntries: [...s.imgEntries, { ...e, id }], imgActiveId: s.imgActiveId ?? id }));
      },
      updateImgEntry: (id, patch) =>
        set((s) => ({ imgEntries: s.imgEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteImgEntry: (id) =>
        set((s) => {
          const entries = s.imgEntries.filter((e) => e.id !== id);
          return { imgEntries: entries, imgActiveId: s.imgActiveId === id ? (entries[0]?.id ?? null) : s.imgActiveId };
        }),
      setImgActive: (id) => set({ imgActiveId: id }),
    }),
    {
      name: "coco-api-keys",
      version: 3,
      migrate: () => ({
        sbEntries: [],
        sbActiveId: null,
        vidEntries: [],
        vidActiveId: null,
        imgEntries: [],
        imgActiveId: null,
      }),
    }
  )
);
