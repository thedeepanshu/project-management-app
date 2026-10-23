import Client from "../models/Client.js";
import Project, { MAX_ATTACHMENTS } from "../models/Project.js";
import { destroyAsset, FOLDERS, isOwnAsset, transformUrl, uploadsEnabled } from "../services/cloudinary.js";
import { assertObjectId, badInput, notFound, safe } from "./errors.js";

const NEWEST_FIRST = { createdAt: -1, _id: -1 };

const DOCUMENT_FORMATS = new Set([
  "doc", "docx", "odt", "rtf", "txt", "md", "pages",
  "xls", "xlsx", "ods", "csv", "numbers",
  "ppt", "pptx", "odp", "key",
]);

function attachmentKind({ resourceType, format, name }) {
  if (resourceType === "video") return "VIDEO";
  if (resourceType === "image") return format === "pdf" ? "PDF" : "IMAGE";
  const extension = (format || name.split(".").pop() || "").toLowerCase();
  return DOCUMENT_FORMATS.has(extension) ? "DOCUMENT" : "OTHER";
}

function destroyProjectFiles(project) {
  return Promise.all(project.attachments.map((file) => destroyAsset(file.publicId, file.resourceType)));
}

// Validates client photo fields: an uploaded avatar must be one of our own
// Cloudinary files; anything else is treated as an external image URL.
function normalizeAvatar(input) {
  if (!("avatarUrl" in input) && !("avatarPublicId" in input)) return input;
  const avatarUrl = input.avatarUrl?.trim() || null;
  const avatarPublicId = input.avatarPublicId || null;
  if (avatarPublicId && !isOwnAsset({ url: avatarUrl, publicId: avatarPublicId }, FOLDERS.avatar)) {
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

async function assertClientExists(clientId) {
  assertObjectId(clientId, "clientId");
  if (!(await Client.exists({ _id: clientId }))) {
    throw badInput("The selected client no longer exists", {
      clientId: "Client not found",
    });
  }
}

async function findOrThrow(Model, id, entity) {
  assertObjectId(id);
  const doc = await Model.findById(id);
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
    clients: safe(() => Client.find().sort({ name: 1 })),

    client: safe((_parent, { id }) => {
      assertObjectId(id);
      return Client.findById(id);
    }),

    projects: safe((_parent, { status, clientId }) => {
      const filter = {};
      if (status) filter.status = status;
      if (clientId) {
        assertObjectId(clientId, "clientId");
        filter.clientId = clientId;
      }
      return Project.find(filter).sort(NEWEST_FIRST);
    }),

    project: safe((_parent, { id }) => {
      assertObjectId(id);
      return Project.findById(id);
    }),

    stats: safe(async () => {
      const [totalClients, statusGroups, overdue] = await Promise.all([
        Client.countDocuments(),
        Project.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Project.countDocuments({
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
    addClient: safe((_parent, { input }) => Client.create(normalizeAvatar(input))),

    updateClient: safe(async (_parent, { id, input }) => {
      const client = await findOrThrow(Client, id, "Client");
      const previousPhoto = client.avatarPublicId;
      client.set(normalizeAvatar(input));
      await client.save();
      // The old uploaded photo is no longer used once a new one (or none) is saved.
      if (previousPhoto && previousPhoto !== client.avatarPublicId) await destroyAsset(previousPhoto);
      return client;
    }),

    deleteClient: safe(async (_parent, { id }) => {
      const client = await findOrThrow(Client, id, "Client");
      const projects = await Project.find({ clientId: client._id });
      // Remove the client's projects first so no project is ever left orphaned.
      await Project.deleteMany({ clientId: client._id });
      await client.deleteOne();
      await Promise.all([...projects.map(destroyProjectFiles), destroyAsset(client.avatarPublicId)]);
      return client;
    }),

    addProject: safe(async (_parent, { input }) => {
      await assertClientExists(input.clientId);
      return Project.create({ ...input, dueDate: parseDueDate(input.dueDate) });
    }),

    updateProject: safe(async (_parent, { id, input }) => {
      const project = await findOrThrow(Project, id, "Project");

      if (input.clientId) await assertClientExists(input.clientId);

      const { dueDate, ...rest } = input;
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined && value !== null) project.set(key, value);
      }
      if ("dueDate" in input) project.dueDate = parseDueDate(dueDate) ?? undefined;

      return project.save();
    }),

    deleteProject: safe(async (_parent, { id }) => {
      const project = await findOrThrow(Project, id, "Project");
      await project.deleteOne();
      await destroyProjectFiles(project);
      return project;
    }),

    addAttachments: safe(async (_parent, { projectId, attachments }) => {
      if (!uploadsEnabled) throw badInput("File uploads aren't configured on this server.");
      const project = await findOrThrow(Project, projectId, "Project");

      if (project.attachments.length + attachments.length > MAX_ATTACHMENTS) {
        throw badInput(
          `A project can have at most ${MAX_ATTACHMENTS} files (this one has ${project.attachments.length}).`
        );
      }
      for (const file of attachments) {
        if (!isOwnAsset(file, FOLDERS.attachment) || !["image", "video", "raw"].includes(file.resourceType)) {
          throw badInput(`“${file.name}” wasn't uploaded through Twillboard. Please upload it again.`);
        }
      }

      project.attachments.push(...attachments);
      return project.save();
    }),

    removeAttachment: safe(async (_parent, { projectId, attachmentId }) => {
      const project = await findOrThrow(Project, projectId, "Project");
      assertObjectId(attachmentId, "attachmentId");
      const file = project.attachments.id(attachmentId);
      if (!file) throw notFound("Attachment");

      file.deleteOne();
      await project.save();
      await destroyAsset(file.publicId, file.resourceType);
      return project;
    }),
  },
};
