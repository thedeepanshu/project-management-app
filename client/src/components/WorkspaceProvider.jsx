import { useEffect, useMemo, useState } from "react";

import { WorkspaceContext } from "../context/workspace";
import { ClientForm } from "./clients/ClientForm";
import { NewClientWizard } from "./clients/NewClientWizard";
import { ProjectForm } from "./projects/ProjectForm";
import { Modal } from "./ui/Modal";

const CLOSED = { open: false };

function isTyping(target) {
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// Owns the create/edit dialogs so any page (or keyboard shortcut) can open them.
export function WorkspaceProvider({ children }) {
  const [projectModal, setProjectModal] = useState(CLOSED);
  const [clientModal, setClientModal] = useState(CLOSED);

  const actions = useMemo(
    () => ({
      newProject: (defaults = {}) => setProjectModal({ open: true, ...defaults }),
      editProject: (project) => setProjectModal({ open: true, project }),
      newClient: () => setClientModal({ open: true }),
      editClient: (client) => setClientModal({ open: true, client }),
    }),
    []
  );

  // Shortcuts: N → new project, C → new client.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector("dialog[open]")) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        actions.newProject();
      } else if (key === "c") {
        event.preventDefault();
        actions.newClient();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions]);

  const closeProject = () => setProjectModal(CLOSED);
  const closeClient = () => setClientModal(CLOSED);

  return (
    <WorkspaceContext value={actions}>
      {children}

      <Modal
        open={projectModal.open}
        onClose={closeProject}
        title={projectModal.project ? "Edit project" : "New project"}
        description={projectModal.project ? "Update the details below." : "Set the scope, the client and the deadline."}
      >
        <ProjectForm
          project={projectModal.project}
          defaultClientId={projectModal.clientId}
          defaultStatus={projectModal.status}
          onDone={closeProject}
          onCancel={closeProject}
          onNewClient={() => {
            closeProject();
            actions.newClient();
          }}
        />
      </Modal>

      <Modal
        open={clientModal.open}
        onClose={closeClient}
        title={clientModal.client ? "Edit client" : "New client"}
        description={clientModal.client ? "Keep their contact details current." : "Who are you building for? Add their first project too, if you like."}
      >
        {clientModal.client ? (
          <ClientForm client={clientModal.client} onDone={closeClient} onCancel={closeClient} />
        ) : (
          <NewClientWizard onDone={closeClient} onCancel={closeClient} />
        )}
      </Modal>
    </WorkspaceContext>
  );
}
