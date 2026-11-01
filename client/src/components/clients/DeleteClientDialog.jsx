import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { DELETE_CLIENT, REFRESH_ALL } from "../../graphql/documents";
import { pluralize } from "../../lib/format";
import { parseApolloError } from "../../lib/validation";
import { ConfirmDialog } from "../ui/ConfirmDialog";

export function DeleteClientDialog({ client, onClose, onDeleted }) {
  const [deleteClient] = useMutation(DELETE_CLIENT, {
    refetchQueries: REFRESH_ALL.filter((name) => name !== "GetClient"),
  });

  async function handleDelete() {
    try {
      await deleteClient({
        variables: { id: client.id },
        update(cache) {
          // The server also deletes their projects; drop them from the cache too.
          for (const project of client.projects) cache.evict({ id: cache.identify(project) });
          cache.evict({ id: cache.identify(client) });
          cache.gc();
        },
      });
      toast.success(`${client.name} deleted`);
      onDeleted?.();
    } catch (error) {
      toast.error(parseApolloError(error).message);
      throw error;
    }
  }

  return (
    <ConfirmDialog
      open={Boolean(client)}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Delete this client?"
      confirmLabel="Delete client"
      confirmText={client?.name}
    >
      {client && (
        <>
          <strong className="text-ink">{client.name}</strong>
          {client.projectCount > 0 ? (
            <>
              {" "}and <strong className="text-red-600 dark:text-red-400">{pluralize(client.projectCount, "project")}</strong>{" "}
              will be permanently deleted.
            </>
          ) : (
            " will be permanently deleted."
          )}{" "}
          This can’t be undone.
        </>
      )}
    </ConfirmDialog>
  );
}
