import { createContext, useContext } from "react";

export const WorkspaceContext = createContext(null);

/** Opens the global create/edit dialogs for projects and clients. */
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return context;
}
