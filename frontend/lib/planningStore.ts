"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Storyboard, Shot } from "./api";

export type EditorMode = "chat" | "planning" | "generating" | "composing" | "done";

interface PlanningStore {
  mode: EditorMode;
  storyboard: Storyboard | null;
  projectId: string | null;
  setMode: (mode: EditorMode) => void;
  setStoryboard: (sb: Storyboard) => void;
  updateShot: (shotId: string, patch: Partial<Shot>) => void;
  refreshStoryboard: (sb: Storyboard) => void;
  clearPlanning: () => void;
}

export const usePlanningStore = create<PlanningStore>()(
  persist(
    (set) => ({
      mode: "chat",
      storyboard: null,
      projectId: null,

      setMode: (mode) => set({ mode }),

      setStoryboard: (storyboard) => set({ storyboard, mode: "planning", projectId: storyboard.project_id }),

      updateShot: (shotId, patch) =>
        set((state) => {
          if (!state.storyboard) return state;
          return {
            storyboard: {
              ...state.storyboard,
              shots: state.storyboard.shots.map((s) =>
                s.id === shotId ? { ...s, ...patch } : s
              ),
            },
          };
        }),

      refreshStoryboard: (sb) => set({ storyboard: sb }),

      clearPlanning: () => set({ mode: "chat", storyboard: null, projectId: null }),
    }),
    {
      name: "coco-planning",
      // Only persist mode and storyboard, not functions
      partialize: (state) => ({
        mode: state.mode,
        storyboard: state.storyboard,
        projectId: state.projectId,
      }),
    }
  )
);

