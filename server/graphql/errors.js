import { GraphQLError } from "graphql";
import mongoose from "mongoose";

// Errors thrown as GraphQLError reach the client as-is. Anything else is masked
// by Yoga in production ("Unexpected error."), so internals never leak.

export function badInput(message, fields) {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT", ...(fields && { fields }) },
  });
}

export function unauthenticated() {
  return new GraphQLError("Please sign in to continue.", {
    extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
  });
}

export function notFound(entity) {
  return new GraphQLError(`${entity} not found`, {
    extensions: { code: "NOT_FOUND" },
  });
}

export function assertObjectId(id, label = "id") {
  if (!mongoose.isValidObjectId(id)) {
    throw badInput(`Invalid ${label}`, { [label]: `Invalid ${label}` });
  }
}

// Translate Mongoose / MongoDB failures into user-facing GraphQL errors.
export function toGraphQLError(error) {
  if (error instanceof GraphQLError) return error;

  if (error instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(
      Object.entries(error.errors).map(([path, err]) => [path, err.message])
    );
    return badInput(Object.values(fields)[0] ?? "Invalid input", fields);
  }

  if (error instanceof mongoose.Error.CastError) {
    return badInput(`Invalid value for ${error.path}`, {
      [error.path]: `Invalid value for ${error.path}`,
    });
  }

  if (error?.code === 11000) {
    // Compound keys include ownerId; report the field the user actually typed.
    const field = Object.keys(error.keyValue ?? {}).find((key) => key !== "ownerId") ?? "field";
    return badInput(`A record with this ${field} already exists`, {
      [field]: `This ${field} is already in use`,
    });
  }

  return error;
}

// Wraps a resolver so every thrown error goes through toGraphQLError.
export function safe(resolver) {
  return async (...args) => {
    try {
      return await resolver(...args);
    } catch (error) {
      throw toGraphQLError(error);
    }
  };
}
