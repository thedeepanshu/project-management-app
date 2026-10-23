export const typeDefs = /* GraphQL */ `
  "Lifecycle stage of a project."
  enum ProjectStatus {
    NOT_STARTED
    IN_PROGRESS
    COMPLETED
  }

  enum ProjectPriority {
    LOW
    MEDIUM
    HIGH
  }

  enum AttachmentKind {
    IMAGE
    VIDEO
    PDF
    DOCUMENT
    OTHER
  }

  type Attachment {
    id: ID!
    name: String!
    kind: AttachmentKind!
    "Original file URL."
    url: String!
    "Small preview image (images, videos and PDFs), or null."
    thumbnailUrl: String
    format: String
    bytes: Int!
    width: Int
    height: Int
    createdAt: String!
  }

  type Client {
    id: ID!
    name: String!
    email: String!
    phone: String!
    company: String
    "Client photo: an uploaded image or an external image URL."
    avatarUrl: String
    "Square, face-cropped version of avatarUrl for display (same as avatarUrl for external URLs)."
    avatarThumbUrl: String
    avatarPublicId: String
    projects: [Project!]!
    projectCount: Int!
    "ISO-8601 timestamp."
    createdAt: String!
  }

  type Project {
    id: ID!
    name: String!
    description: String!
    status: ProjectStatus!
    priority: ProjectPriority!
    "ISO-8601 date, or null when no deadline is set."
    dueDate: String
    "True when the due date has passed and the project is not completed."
    isOverdue: Boolean!
    client: Client
    attachments: [Attachment!]!
    createdAt: String!
    updatedAt: String!
  }

  type StatusCount {
    status: ProjectStatus!
    count: Int!
  }

  type Stats {
    totalProjects: Int!
    totalClients: Int!
    byStatus: [StatusCount!]!
    overdue: Int!
    "Share of projects completed, from 0 to 1."
    completionRate: Float!
  }

  type Query {
    clients: [Client!]!
    client(id: ID!): Client
    projects(status: ProjectStatus, clientId: ID): [Project!]!
    project(id: ID!): Project
    stats: Stats!
  }

  input ClientInput {
    name: String!
    email: String!
    phone: String!
    company: String
    "Pass null to remove the photo."
    avatarUrl: String
    "Set when avatarUrl is an image uploaded through /api/uploads."
    avatarPublicId: String
  }

  "Metadata Cloudinary returns after a direct upload."
  input AttachmentInput {
    url: String!
    publicId: String!
    resourceType: String!
    format: String
    name: String!
    bytes: Int!
    width: Int
    height: Int
  }

  input AddProjectInput {
    name: String!
    description: String!
    status: ProjectStatus = NOT_STARTED
    priority: ProjectPriority = MEDIUM
    "YYYY-MM-DD or ISO-8601."
    dueDate: String
    clientId: ID!
  }

  "Only the fields you pass are changed. Pass dueDate: null to clear the deadline."
  input UpdateProjectInput {
    name: String
    description: String
    status: ProjectStatus
    priority: ProjectPriority
    dueDate: String
    clientId: ID
  }

  type Mutation {
    addClient(input: ClientInput!): Client!
    updateClient(id: ID!, input: ClientInput!): Client!
    "Deletes the client and all of their projects."
    deleteClient(id: ID!): Client!
    addProject(input: AddProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Project!
    "Saves files already uploaded to Cloudinary onto a project."
    addAttachments(projectId: ID!, attachments: [AttachmentInput!]!): Project!
    "Removes a file from the project and deletes it from storage."
    removeAttachment(projectId: ID!, attachmentId: ID!): Project!
  }
`;
