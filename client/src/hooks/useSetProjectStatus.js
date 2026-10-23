import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { UPDATE_PROJECT } from "../graphql/documents";
import { STATUS } from "../lib/meta";
import { parseApolloError } from "../lib/validation";

/** Changes a project's status with an optimistic update (instant UI, rolled back on error). */
export function useSetProjectStatus() {
  const [updateProject] = useMutation(UPDATE_PROJECT);

  return async function setStatus(project, status) {
    if (project.status === status) return;
    try {
      await updateProject({
        variables: { id: project.id, input: { status } },
        optimisticResponse: {
          updateProject: {
            ...project,
            status,
            isOverdue: status === "COMPLETED" ? false : project.isOverdue,
          },
        },
        refetchQueries: ["GetStats", "GetClients", "GetClient"],
      });
      toast.success(`“${project.name}” moved to ${STATUS[status].label}`);
    } catch (error) {
      toast.error(parseApolloError(error).message);
    }
  };
}
