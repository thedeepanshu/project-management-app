import { LoaderCircle } from "lucide-react";
import { Link } from "react-router";

import { buttonClasses } from "./buttonClasses";

export function Button({ variant, size, className, loading = false, disabled = false, children, ...props }) {
  return (
    <button
      type="button"
      className={buttonClasses({ variant, size, className })}
      {...props}
      disabled={loading || disabled}
    >
      {loading && <LoaderCircle className="animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...props }) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
