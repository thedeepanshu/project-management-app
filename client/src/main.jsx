import { ApolloProvider } from "@apollo/client/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, redirect } from "react-router";
import { RouterProvider } from "react-router/dom";

import { AppLayout } from "./components/layout/AppLayout";
import { WorkspaceProvider } from "./components/WorkspaceProvider";
import { apolloClient } from "./lib/apollo";
import NotFound, { RouteError } from "./pages/NotFound";
import "./index.css";

// Each page is code-split and only downloaded when first visited.
const page = (load) => async () => ({ Component: (await load()).default });

const router = createBrowserRouter([
  {
    element: (
      <WorkspaceProvider>
        <AppLayout />
      </WorkspaceProvider>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: page(() => import("./pages/Dashboard")) },
      { path: "projects", lazy: page(() => import("./pages/Projects")) },
      { path: "projects/:id", lazy: page(() => import("./pages/ProjectDetail")) },
      { path: "clients", lazy: page(() => import("./pages/Clients")) },
      { path: "clients/:id", lazy: page(() => import("./pages/ClientDetail")) },
      // Keep links from the previous version (/project/:id) working.
      { path: "project/:id", loader: ({ params }) => redirect(`/projects/${params.id}`) },
      { path: "*", Component: NotFound },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  </StrictMode>
);
