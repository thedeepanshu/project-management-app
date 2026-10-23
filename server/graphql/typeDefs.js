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

  type Client {
    id: ID!
    name: String!
    email: String!
    phone: String!
    company: String
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
  }
`;
