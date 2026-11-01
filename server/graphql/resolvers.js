import mongoose from "mongoose";

import Client from "../models/Client.js";
import Project, { MAX_ATTACHMENTS } from "../models/Project.js";
import { destroyAsset, isOwnAsset, transformUrl, uploadsEnabled, userFolder } from "../services/cloudinary.js";
import { assertObjectId, badInput, notFound, safe, unauthenticated } from "./errors.js";

// Every query and mutation is scoped to the signed-in user: records are always
// looked up as { _id, ownerId }, so another user's id behaves exactly like an
// id that doesn't exist (no way to probe for other people's data).

const NEWEST_FIRST = { createdAt: -1, _id: -1 };

const DOCUMENT_FORMATS = new Set([
  "doc", "docx", "odt", "rtf", "txt", "md", "pages",
  "xls", "xlsx", "ods", "csv", "numbers",
  "ppt", "pptx", "odp", "key",
]);

/** Wraps a root resolver: requires a session and passes the owner id along. */
function authed(resolver) {
  return safe((parent, args, context, info) => {
    if (!context.user) throw unauthenticated();
    return resolver(parent, args, { ...context, ownerId: context.user.id }, info);
  });
}

function attachmentKind({ resourceType, format, name }) {
  if (resourceType === "video") return "VIDEO";
  if (resourceType === "image") return format === "pdf" ? "PDF" : "IMAGE";
  const extension = (format || name.split(".").pop() || "").toLowerCase();
  return DOCUMENT_FORMATS.has(extension) ? "DOCUMENT" : "OTHER";
}

// Accepts only metadata for files the user uploaded into their own Cloudinary
// folder, and enforces the per-project file limit.
function assertUploadedFiles(files, existingCount, ownerId) {
  if (files.length === 0) return;
  if (!uploadsEnabled) throw badInput("File uploads aren't configured on this server.");
  if (existingCount + files.length > MAX_ATTACHMENTS) {
    throw badInput(`A project can have at most ${MAX_ATTACHMENTS} files.`, {
      attachments: `At most ${MAX_ATTACHMENTS} files`,
    });
  }
  const folder = userFolder(ownerId, "attachment");
  for (const file of files) {
    if (!isOwnAsset(file, folder)) {
      throw badInput(`“${file.name}” wasn't uploaded through Twillboard. Please upload it again.`);
    }
  }
}

function destroyProjectFiles(project) {
  return Promise.all(project.attachments.map((file) => destroyAsset(file.publicId, file.resourceType)));
}

// Validates client photo fields: an uploaded avatar must be in the user's own
// Cloudinary folder; anything else is treated as an external image URL.
function normalizeAvatar(input, ownerId) {
  if (!("avatarUrl" in input) && !("avatarPublicId" in input)) return input;
  const avatarUrl = input.avatarUrl?.trim() || null;
  const avatarPublicId = input.avatarPublicId || null;
  if (avatarPublicId && !isOwnAsset({ url: avatarUrl, publicId: avatarPublicId }, userFolder(ownerId, "avatar"))) {
    throw badInput("The uploaded photo couldn't be verified. Please upload it again.", {
      avatarUrl: "Upload the photo again",
    });
  }
  return { ...input, avatarUrl, avatarPublicId };
}

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDueDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badInput("Due date is not a valid date", { dueDate: "Invalid date" });
  }
  return date;
}

// Documents created before timestamps were enabled fall back to the ObjectId's
// embedded creation time.
function createdAtOf(doc) {
  return doc.createdAt ?? doc._id.getTimestamp();
}

async function assertClientExists(clientId, ownerId) {
  assertObjectId(clientId, "clientId");
  if (!(await Client.exists({ _id: clientId, ownerId }))) {
    throw badInput("The selected client no longer exists", {
      clientId: "Client not found",
    });
  }
}

async function findOwnedOrThrow(Model, id, ownerId, entity) {
  assertObjectId(id);
  const doc = await Model.findOne({ _id: id, ownerId });
  if (!doc) throw notFound(entity);
  return doc;
}

export const resolvers = {
  // Map GraphQL enum names to the strings stored in MongoDB.
  ProjectStatus: {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  },
  ProjectPriority: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
  },

  Attachment: {
    kind: attachmentKind,
    thumbnailUrl: (file) => {
      const kind = attachmentKind(file);
      if (kind === "IMAGE") return transformUrl(file.url, "c_fill,w_480,h_320,q_auto,f_auto");
      if (kind === "PDF") return transformUrl(file.url, "c_fill,w_480,h_320,pg_1,q_auto", "jpg");
      if (kind === "VIDEO") return transformUrl(file.url, "c_fill,w_480,h_320,so_0,q_auto", "jpg");
      return null;
    },
    createdAt: (file) => createdAtOf(file).toISOString(),
  },

  Client: {
    avatarThumbUrl: (client) =>
      client.avatarUrl ? transformUrl(client.avatarUrl, "c_fill,g_face,w_160,h_160,q_auto,f_auto") : null,
    projects: (client, _args, { loaders }) => loaders.projectsByClientId.load(client.id),
    projectCount: async (client, _args, { loaders }) =>
      (await loaders.projectsByClientId.load(client.id)).length,
    createdAt: (client) => createdAtOf(client).toISOString(),
  },

  Project: {
    priority: (project) => project.priority ?? "Medium",
    dueDate: (project) => project.dueDate?.toISOString() ?? null,
    isOverdue: (project) =>
      Boolean(project.dueDate) &&
      project.status !== "Completed" &&
      project.dueDate < startOfTodayUTC(),
    client: (project, _args, { loaders }) =>
      project.clientId ? loaders.clientById.load(project.clientId.toString()) : null,
    createdAt: (project) => createdAtOf(project).toISOString(),
    updatedAt: (project) => (project.updatedAt ?? createdAtOf(project)).toISOString(),
  },

  Query: {
    clients: authed((_parent, _args, { ownerId }) => Client.find({ ownerId }).sort({ name: 1 })),

    client: authed((_parent, { id }, { ownerId }) => {
      assertObjectId(id);
      return Client.findOne({ _id: id, ownerId });
    }),

    projects: authed((_parent, { status, clientId }, { ownerId }) => {
      const filter = { ownerId };
      if (status) filter.status = status;
      if (clientId) {
        assertObjectId(clientId, "clientId");
        filter.clientId = clientId;
      }
      return Project.find(filter).sort(NEWEST_FIRST);
    }),

    project: authed((_parent, { id }, { ownerId }) => {
      assertObjectId(id);
      return Project.findOne({ _id: id, ownerId });
    }),

    stats: authed(async (_parent, _args, { ownerId }) => {
      const [totalClients, statusGroups, overdue] = await Promise.all([
        Client.countDocuments({ ownerId }),
        Project.aggregate([{ $match: { ownerId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        Project.countDocuments({
          ownerId,
          status: { $ne: "Completed" },
          dueDate: { $lt: startOfTodayUTC() },
        }),
      ]);

      const counts = Object.fromEntries(statusGroups.map((g) => [g._id, g.count]));
      const byStatus = ["Not Started", "In Progress", "Completed"].map((status) => ({
        status,
        count: counts[status] ?? 0,
      }));
      const totalProjects = byStatus.reduce((sum, s) => sum + s.count, 0);

      return {
        totalProjects,
        totalClients,
        byStatus,
        overdue,
        completionRate: totalProjects ? (counts["Completed"] ?? 0) / totalProjects : 0,
      };
    }),
  },

  Mutation: {
    addClient: authed((_parent, { input }, { ownerId }) =>
      Client.create({ ...normalizeAvatar(input, ownerId), ownerId })
    ),

    updateClient: authed(async (_parent, { id, input }, { ownerId }) => {
      const client = await findOwnedOrThrow(Client, id, ownerId, "Client");
      const previousPhoto = client.avatarPublicId;
      client.set(normalizeAvatar(input, ownerId));
      await client.save();
      // The old uploaded photo is no longer used once a new one (or none) is saved.
      if (previousPhoto && previousPhoto !== client.avatarPublicId) await destroyAsset(previousPhoto);
      return client;
    }),

    deleteClient: authed(async (_parent, { id }, { ownerId }) => {
      const client = await findOwnedOrThrow(Client, id, ownerId, "Client");
      const projects = await Project.find({ clientId: client._id, ownerId });
      // Remove the client's projects first so no project is ever left orphaned.
      await Project.deleteMany({ clientId: client._id, ownerId });
      await client.deleteOne();
      await Promise.all([...projects.map(destroyProjectFiles), destroyAsset(client.avatarPublicId)]);
      return client;
    }),

    addProject: authed(async (_parent, { input }, { ownerId }) => {
      await assertClientExists(input.clientId, ownerId);
      const attachments = input.attachments ?? [];
      assertUploadedFiles(attachments, 0, ownerId);
      return Project.create({ ...input, ownerId, attachments, dueDate: parseDueDate(input.dueDate) });
    }),

    updateProject: authed(async (_parent, { id, input }, { ownerId }) => {
      const project = await findOwnedOrThrow(Project, id, ownerId, "Project");

      if (input.clientId) await assertClientExists(input.clientId, ownerId);

      const { dueDate, addAttachments = [], removeAttachmentIds = [], ...rest } = input;
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined && value !== null) project.set(key, value);
      }
      if ("dueDate" in input) project.dueDate = parseDueDate(dueDate) ?? undefined;

      // Remove first so a swap (remove one, add one) isn't blocked by the file limit.
      const removed = [];
      for (const attachmentId of removeAttachmentIds ?? []) {
        assertObjectId(attachmentId, "attachmentId");
        const file = project.attachments.id(attachmentId);
        if (file) {
          removed.push({ publicId: file.publicId, resourceType: file.resourceType });
          file.deleteOne();
        }
      }
      assertUploadedFiles(addAttachments ?? [], project.attachments.length, ownerId);
      project.attachments.push(...(addAttachments ?? []));

      await project.save();
      await Promise.all(removed.map((file) => destroyAsset(file.publicId, file.resourceType)));
      return project;
    }),

    deleteProject: authed(async (_parent, { id }, { ownerId }) => {
      const project = await findOwnedOrThrow(Project, id, ownerId, "Project");
      await project.deleteOne();
      await destroyProjectFiles(project);
      return project;
    }),

    addAttachments: authed(async (_parent, { projectId, attachments }, { ownerId }) => {
      const project = await findOwnedOrThrow(Project, projectId, ownerId, "Project");
      assertUploadedFiles(attachments, project.attachments.length, ownerId);

      project.attachments.push(...attachments);
      return project.save();
    }),

    removeAttachment: authed(async (_parent, { projectId, attachmentId }, { ownerId }) => {
      const project = await findOwnedOrThrow(Project, projectId, ownerId, "Project");
      assertObjectId(attachmentId, "attachmentId");
      const file = project.attachments.id(attachmentId);
      if (!file) throw notFound("Attachment");

      file.deleteOne();
      await project.save();
      await destroyAsset(file.publicId, file.resourceType);
      return project;
    }),

    discardUploads: authed(async (_parent, { files }, { ownerId }) => {
      // Only files in the user's own folders that none of their records use,
      // so this can never remove a file that's saved or belongs to someone else.
      const attachmentFolder = `${userFolder(ownerId, "attachment")}/`;
      const avatarFolder = `${userFolder(ownerId, "avatar")}/`;
      const profileFolder = `${userFolder(ownerId, "profile")}/`;
      await Promise.all(
        files.slice(0, 50).map(async ({ publicId, resourceType }) => {
          if (!["image", "video", "raw"].includes(resourceType)) return;
          if (publicId.startsWith(attachmentFolder)) {
            if (!(await Project.exists({ ownerId, "attachments.publicId": publicId }))) {
              await destroyAsset(publicId, resourceType);
            }
          } else if (publicId.startsWith(avatarFolder)) {
            if (!(await Client.exists({ ownerId, avatarPublicId: publicId }))) await destroyAsset(publicId, "image");
          } else if (publicId.startsWith(profileFolder)) {
            // A profile photo that was uploaded but never saved on the account.
            const user = await mongoose.connection.db
              .collection("user")
              .findOne({ _id: new mongoose.Types.ObjectId(ownerId) }, { projection: { imagePublicId: 1 } });
            if (user?.imagePublicId !== publicId) await destroyAsset(publicId, "image");
          }
        })
      );
      return true;
    }),
  },
};
