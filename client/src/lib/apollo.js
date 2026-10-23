import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: import.meta.env.VITE_GRAPHQL_URL ?? "/graphql" }),
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
