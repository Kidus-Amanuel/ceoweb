import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LayoutState, ModuleType } from "@/types/layout";

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftSidebarOpen: true,
      rightSidebarOpen: false,
      leftSidebarWidth: 260,
      rightSidebarWidth: 320,
      currentModule: "dashboard",
      toggleLeftSidebar: () =>
        set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
      toggleRightSidebar: () =>
        set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
      setLeftSidebarWidth: (width) =>
        set({ leftSidebarWidth: Math.max(70, Math.min(400, width)) }),
      setRightSidebarWidth: (width) =>
        set({ rightSidebarWidth: Math.max(280, Math.min(500, width)) }),
      setCurrentModule: (module) => set({ currentModule: module }),
    }),
    {
      name: "ceo-layout-storage",
      partialize: (state) => ({
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        leftSidebarWidth: state.leftSidebarWidth,
        rightSidebarWidth: state.rightSidebarWidth,
        currentModule: state.currentModule,
      }),
    },
  ),
);
