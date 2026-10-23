import { CombinedGraphQLErrors } from "@apollo/client/errors";

// Mirrors the server's Mongoose rules so users get instant feedback; the
// server stays the source of truth and its field errors are merged in too.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().-]{7,20}$/;

function lengthError(value, label, min, max) {
  const length = value.trim().length;
  if (length === 0) return `${label} is required`;
  if (length < min) return `${label} must be at least ${min} characters`;
  if (length > max) return `${label} must be at most ${max} characters`;
  return null;
}

function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateClient({ name, email, phone, company }) {
  return compact({
    name: lengthError(name, "Name", 2, 80),
    email: !email.trim()
      ? "Email is required"
      : !EMAIL.test(email.trim())
        ? "Please enter a valid email address"
        : null,
    phone: !phone.trim()
      ? "Phone number is required"
      : !PHONE.test(phone.trim()) || phone.replace(/\D/g, "").length < 7
        ? "Please enter a valid phone number"
        : null,
    company: company.trim().length > 80 ? "Company must be at most 80 characters" : null,
  });
}

export function validateProject({ name, description, clientId }) {
  return compact({
    name: lengthError(name, "Project name", 2, 100),
    description: lengthError(description, "Description", 1, 2000),
    clientId: clientId ? null : "Please choose a client",
  });
}

/** Extracts a user-facing message and per-field errors from an Apollo error. */
export function parseApolloError(error) {
  if (CombinedGraphQLErrors.is(error)) {
    const fields = Object.assign({}, ...error.errors.map((e) => e.extensions?.fields ?? {}));
    return { message: error.errors[0]?.message ?? "Something went wrong", fields };
  }
  return {
    message: "Can't reach the server. Check that the API is running and try again.",
    fields: {},
  };
}
