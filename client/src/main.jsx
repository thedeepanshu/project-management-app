import { ApolloProvider } from "@apollo/client/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, redirect } from "react-router";
import { RouterProvider } from "react-router/dom";

import { AuthLayout } from "./components/auth/AuthLayout";
import { GuestOnly, RequireAuth, Splash } from "./components/auth/RouteGuards";
import { AppLayout } from "./components/layout/AppLayout";
import { WorkspaceProvider } from "./components/WorkspaceProvider";
import { apolloClient } from "./lib/apollo";
import NotFound, { RouteError } from "./pages/NotFound";
import "./index.css";

// Each page is code-split and only downloaded when first visited.
const page = (load) => async () => ({ Component: (await load()).default });

const router = createBrowserRouter([
  // Public: sign in, sign up and password recovery. Signed-in users skip these.
  {
    element: <AuthLayout />,
    errorElement: <RouteError />,
    HydrateFallback: Splash,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: "sign-in", lazy: page(() => import("./pages/auth/SignIn")) },
          { path: "sign-up", lazy: page(() => import("./pages/auth/SignUp")) },
          { path: "forgot-password", lazy: page(() => import("./pages/auth/ForgotPassword")) },
          { path: "check-email", lazy: page(() => import("./pages/auth/CheckEmail")) },
        ],
      },
      // Reachable either way: the link comes from an email.
      { path: "reset-password", lazy: page(() => import("./pages/auth/ResetPassword")) },
    ],
  },
  // Public either way (Google's consent screen links here).
  {
    path: "privacy",
    lazy: page(() => import("./pages/Privacy")),
    errorElement: <RouteError />,
    HydrateFallback: Splash,
  },
  // The app: requires a session.
  {
    element: (
      <RequireAuth>
        <WorkspaceProvider>
          <AppLayout />
        </WorkspaceProvider>
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    HydrateFallback: Splash,
    children: [
      { index: true, lazy: page(() => import("./pages/Dashboard")) },
      { path: "projects", lazy: page(() => import("./pages/Projects")) },
      { path: "projects/:id", lazy: page(() => import("./pages/ProjectDetail")) },
      { path: "clients", lazy: page(() => import("./pages/Clients")) },
      { path: "clients/:id", lazy: page(() => import("./pages/ClientDetail")) },
      { path: "account", lazy: page(() => import("./pages/Account")) },
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
