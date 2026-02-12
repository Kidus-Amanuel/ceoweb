import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LayoutState, ModuleType } from "@/types/layout";

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftSidebarOpen: false,
      rightSidebarOpen: false,
      leftSidebarWidth: 260,
      rightSidebarWidth: 520,
      currentModule: "dashboard",
      toggleLeftSidebar: () =>
        set((state) => ({
          leftSidebarOpen: !state.leftSidebarOpen,
          rightSidebarOpen: !state.leftSidebarOpen
            ? false
            : state.rightSidebarOpen,
        })),
      toggleRightSidebar: () =>
        set((state) => ({
          rightSidebarOpen: !state.rightSidebarOpen,
          leftSidebarOpen: !state.rightSidebarOpen
            ? false
            : state.leftSidebarOpen,
        })),
      setLeftSidebarOpen: (open) =>
        set((state) => ({
          leftSidebarOpen: open,
          rightSidebarOpen: open ? false : state.rightSidebarOpen,
        })),
      setRightSidebarOpen: (open) =>
        set((state) => ({
          rightSidebarOpen: open,
          leftSidebarOpen: open ? false : state.leftSidebarOpen,
        })),
      setLeftSidebarWidth: (width) =>
        set({ leftSidebarWidth: Math.max(70, Math.min(400, width)) }),
      setRightSidebarWidth: (width) =>
        set({ rightSidebarWidth: Math.max(400, Math.min(1000, width)) }),
      setCurrentModule: (module) => set({ currentModule: module }),
    }),
    {
      name: "ceo-layout-storage-v2",
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
