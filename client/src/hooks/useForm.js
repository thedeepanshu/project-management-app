import { useState } from "react";
import { toast } from "sonner";

import { parseApolloError } from "../lib/validation";

// Small form helper: client-side validation (live after the first submit),
// a submitting flag, and server field errors mapped back onto the inputs.
export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /** Updates several fields at once (one render, no stale values). */
  function setFields(patch) {
    const next = { ...values, ...patch };
    setValues(next);
    if (submitted) {
      setErrors(validate(next));
    } else if (Object.keys(patch).some((field) => errors[field])) {
      setErrors((prev) => {
        const remaining = { ...prev };
        for (const field of Object.keys(patch)) delete remaining[field];
        return remaining;
      });
    }
  }

  function setField(field, value) {
    setFields({ [field]: value });
  }

  const handleSubmit = (onValid) => async (event) => {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await onValid(values);
    } catch (error) {
      const { message, fields } = parseApolloError(error);
      setErrors(fields);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return { values, errors, setField, setFields, handleSubmit, submitting };
}
