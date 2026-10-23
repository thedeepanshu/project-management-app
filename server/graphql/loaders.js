import DataLoader from "dataloader";

import Client from "../models/Client.js";
import Project from "../models/Project.js";

// Per-request DataLoaders batch the "client of each project" and "projects of
// each client" lookups into one query each, avoiding N+1 round trips.
export function createLoaders() {
  return {
    clientById: new DataLoader(async (ids) => {
      const clients = await Client.find({ _id: { $in: ids } });
      const byId = new Map(clients.map((client) => [client.id, client]));
      return ids.map((id) => byId.get(id) ?? null);
    }),

    projectsByClientId: new DataLoader(async (clientIds) => {
      const projects = await Project.find({ clientId: { $in: clientIds } }).sort({
        createdAt: -1,
        _id: -1,
      });
      const grouped = new Map(clientIds.map((id) => [id, []]));
      for (const project of projects) {
        grouped.get(project.clientId.toString())?.push(project);
      }
      return clientIds.map((id) => grouped.get(id));
    }),
  };
}
