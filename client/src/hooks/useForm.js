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

  function setField(field, value) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted) {
      setErrors(validate(next));
    } else if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
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

  return { values, errors, setField, handleSubmit, submitting };
}
