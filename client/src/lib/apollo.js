import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";

// If the session ends (expired, signed out elsewhere, password reset), send the
// user to sign in and bring them back to where they were afterwards.
const sessionLink = new ErrorLink(({ error }) => {
  const unauthenticated =
    CombinedGraphQLErrors.is(error) && error.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED");
  if (unauthenticated && !window.location.pathname.startsWith("/sign-in")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/sign-in?next=${next}&expired=1`);
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([
    sessionLink,
    new HttpLink({ uri: import.meta.env.VITE_GRAPHQL_URL ?? "/graphql", credentials: "same-origin" }),
  ]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Lists are always replaced wholesale by the server's answer.
          projects: { merge: false },
          clients: { merge: false },
        },
      },
      Client: {
        fields: {
          projects: { merge: false },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});
