export type ModuleType =
  | "dashboard"
  | "fleet"
  | "crm"
  | "inventory"
  | "hrm"
  | "settings";

export interface AIInsight {
  id: string;
  type: "prediction" | "alert" | "recommendation" | "forecast";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
}

export interface LayoutState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  currentModule: ModuleType;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setCurrentModule: (module: ModuleType) => void;
}
