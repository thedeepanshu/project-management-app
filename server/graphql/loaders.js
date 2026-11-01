import DataLoader from "dataloader";

import Client from "../models/Client.js";
import Project from "../models/Project.js";

// Per-request DataLoaders batch the "client of each project" and "projects of
// each client" lookups into one query each, avoiding N+1 round trips. They
// also filter by owner, so a nested field can never reach another user's data.
export function createLoaders(ownerId) {
  return {
    clientById: new DataLoader(async (ids) => {
      const clients = ownerId ? await Client.find({ _id: { $in: ids }, ownerId }) : [];
      const byId = new Map(clients.map((client) => [client.id, client]));
      return ids.map((id) => byId.get(id) ?? null);
    }),

    projectsByClientId: new DataLoader(async (clientIds) => {
      const projects = ownerId
        ? await Project.find({ clientId: { $in: clientIds }, ownerId }).sort({ createdAt: -1, _id: -1 })
        : [];
      const grouped = new Map(clientIds.map((id) => [id, []]));
      for (const project of projects) {
        grouped.get(project.clientId.toString())?.push(project);
      }
      return clientIds.map((id) => grouped.get(id));
    }),
  };
}
