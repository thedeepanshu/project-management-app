import { ArrowLeft } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import { LogoMark } from "../components/brand/Logo";
import { ButtonLink } from "../components/ui/Button";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

function LooseThread({ code, title, message }) {
  return (
    <div className="relative grid min-h-[70dvh] place-items-center overflow-hidden text-center">
      <div className="bg-weave absolute inset-0 [mask-image:radial-gradient(circle,black,transparent_65%)]" />
      <div className="relative">
        <LogoMark className="mx-auto mb-6 size-14 -rotate-12 opacity-90" />
        <p className="font-display text-8xl font-extrabold tracking-tighter text-gradient">{code}</p>
        <h1 className="mt-2 font-display text-2xl font-bold">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">{message}</p>
        <ButtonLink to="/" variant="secondary" className="mt-8">
          <ArrowLeft /> Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <LooseThread code="404" title="This thread leads nowhere" message="The page you’re looking for doesn’t exist or has moved." />
  );
}

export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  console.error(error);
  return (
    <LooseThread
      code="Oops"
      title="A thread snapped"
      message="Something unexpected went wrong while rendering this page. Try heading back to the dashboard."
    />
  );
}
