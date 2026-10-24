import Client from "../models/Client.js";
import Project from "../models/Project.js";
import { destroyAsset } from "../services/cloudinary.js";

/** Deletes every project, client and stored file owned by a user. */
export async function deleteAllUserData(ownerId) {
  const [projects, clients] = await Promise.all([
    Project.find({ ownerId }, { attachments: 1 }).lean(),
    Client.find({ ownerId }, { avatarPublicId: 1 }).lean(),
  ]);
  await Promise.all([Project.deleteMany({ ownerId }), Client.deleteMany({ ownerId })]);
  await Promise.all([
    ...projects.flatMap((project) => project.attachments.map((file) => destroyAsset(file.publicId, file.resourceType))),
    ...clients.map((client) => destroyAsset(client.avatarPublicId)),
  ]);
}
