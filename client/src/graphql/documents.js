import { gql } from "@apollo/client";

// ── Fragments ──────────────────────────────────────────────────────────────
// Every project/client read and mutation shares one selection set so the
// normalised cache always has complete objects (needed for optimistic UI).

export const PROJECT_FIELDS = gql`
  fragment ProjectFields on Project {
    id
    name
    description
    status
    priority
    dueDate
    isOverdue
    createdAt
    updatedAt
    client {
      id
      name
      email
      phone
      company
      avatarUrl
      avatarThumbUrl
    }
    attachments {
      id
      name
      kind
      url
      thumbnailUrl
      format
      bytes
      width
      height
      createdAt
    }
  }
`;

export const CLIENT_FIELDS = gql`
  fragment ClientFields on Client {
    id
    name
    email
    phone
    company
    avatarUrl
    avatarThumbUrl
    avatarPublicId
    createdAt
    projectCount
    projects {
      id
      status
    }
  }
`;

// ── Queries ────────────────────────────────────────────────────────────────

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      ...ProjectFields
    }
  }
  ${PROJECT_FIELDS}
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      ...ProjectFields
    }
  }
  ${PROJECT_FIELDS}
`;

export const GET_CLIENTS = gql`
  query GetClients {
    clients {
      ...ClientFields
    }
  }
  ${CLIENT_FIELDS}
`;

export const GET_CLIENT = gql`
  query GetClient($id: ID!) {
    client(id: $id) {
      ...ClientFields
      projects {
        ...ProjectFields
      }
    }
  }
  ${CLIENT_FIELDS}
  ${PROJECT_FIELDS}
`;

export const GET_STATS = gql`
  query GetStats {
    stats {
      totalProjects
      totalClients
      overdue
      completionRate
      byStatus {
        status
        count
      }
    }
  }
`;

// ── Mutations ──────────────────────────────────────────────────────────────

export const ADD_PROJECT = gql`
  mutation AddProject($input: AddProjectInput!) {
    addProject(input: $input) {
      ...ProjectFields
    }
  }
  ${PROJECT_FIELDS}
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      ...ProjectFields
    }
  }
  ${PROJECT_FIELDS}
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
      id
    }
  }
`;

export const ADD_CLIENT = gql`
  mutation AddClient($input: ClientInput!) {
    addClient(input: $input) {
      ...ClientFields
    }
  }
  ${CLIENT_FIELDS}
`;

export const UPDATE_CLIENT = gql`
  mutation UpdateClient($id: ID!, $input: ClientInput!) {
    updateClient(id: $id, input: $input) {
      ...ClientFields
    }
  }
  ${CLIENT_FIELDS}
`;

export const DELETE_CLIENT = gql`
  mutation DeleteClient($id: ID!) {
    deleteClient(id: $id) {
      id
    }
  }
`;

export const ADD_ATTACHMENTS = gql`
  mutation AddAttachments($projectId: ID!, $attachments: [AttachmentInput!]!) {
    addAttachments(projectId: $projectId, attachments: $attachments) {
      ...ProjectFields
    }
  }
  ${PROJECT_FIELDS}
`;

export const REMOVE_ATTACHMENT = gql`
  mutation RemoveAttachment($projectId: ID!, $attachmentId: ID!) {
    removeAttachment(projectId: $projectId, attachmentId: $attachmentId) {
      ...ProjectFields
    }
  }
  ${PROJECT_FIELDS}
`;

// Active queries to refresh after any write, by operation name.
export const REFRESH_ALL = ["GetProjects", "GetProject", "GetClients", "GetClient", "GetStats"];
