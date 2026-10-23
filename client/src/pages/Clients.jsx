import { useQuery } from "@apollo/client/react";
import { Search, SearchX, UserPlus, Users } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { ClientCard } from "../components/clients/ClientCard";
import { DeleteClientDialog } from "../components/clients/DeleteClientDialog";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/States";
import { useWorkspace } from "../context/workspace";
import { GET_CLIENTS } from "../graphql/documents";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { pluralize } from "../lib/format";

export default function Clients() {
  useDocumentTitle("Clients");
  const { newClient, editClient } = useWorkspace();
  const { data, loading, error, refetch } = useQuery(GET_CLIENTS);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [toDelete, setToDelete] = useState(null);

  const all = data?.clients ?? [];
  const filtered = all.filter((client) =>
    [client.name, client.email, client.company, client.phone]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(deferredQuery))
  );

  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Clients"
        actions={
          <Button variant="brand" onClick={newClient}>
            <UserPlus /> New client
          </Button>
        }
      >
        {data ? `${pluralize(all.length, "client")} you’re weaving with.` : "Loading your clients…"}
      </PageHeader>

      {all.length > 0 && (
        <label className="relative mb-6 block max-w-md">
          <span className="sr-only">Search clients</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, company, email…"
            className="h-10 w-full rounded-xl bg-surface pr-3 pl-10 text-sm shadow-soft ring-1 ring-line transition placeholder:text-subtle focus:ring-2 focus:ring-loom-500 focus:outline-none"
          />
        </label>
      )}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          action={
            <Button variant="brand" onClick={newClient}>
              <UserPlus /> Add your first client
            </Button>
          }
        >
          Clients are the people you build for. Add one to start creating projects.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="No matching clients">
          No client matches “{query}”.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client, index) => (
            <div key={client.id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <ClientCard client={client} onEdit={editClient} onDelete={setToDelete} />
            </div>
          ))}
        </div>
      )}

      <DeleteClientDialog client={toDelete} onClose={() => setToDelete(null)} />
    </>
  );
}
