import { useMutation } from "@apollo/client/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ADD_CLIENT, REFRESH_ALL, UPDATE_CLIENT } from "../../graphql/documents";
import { useForm } from "../../hooks/useForm";
import { discardUploads } from "../../lib/uploads";
import { validateClient } from "../../lib/validation";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { AvatarPicker } from "./AvatarPicker";

export function ClientForm({ client, onDone, onCancel }) {
  const isEdit = Boolean(client);
  const { values, errors, setField, setFields, handleSubmit, submitting } = useForm(
    {
      name: client?.name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      company: client?.company ?? "",
      avatarUrl: client?.avatarUrl ?? null,
      avatarPublicId: client?.avatarPublicId ?? null,
    },
    validateClient
  );
  const [photoBusy, setPhotoBusy] = useState(false);

  // Photos uploaded in this form but not saved yet are deleted when they're
  // replaced, or when the form closes without saving.
  const savedPhotoId = client?.avatarPublicId ?? null;
  const unsavedPhotoRef = useRef(null);
  const savedRef = useRef(false);
  useEffect(
    () => () => {
      if (!savedRef.current && unsavedPhotoRef.current) {
        discardUploads([{ publicId: unsavedPhotoRef.current, resourceType: "image" }]);
      }
    },
    []
  );

  function changePhoto(photo) {
    if (unsavedPhotoRef.current && unsavedPhotoRef.current !== photo.avatarPublicId) {
      discardUploads([{ publicId: unsavedPhotoRef.current, resourceType: "image" }]);
    }
    unsavedPhotoRef.current = photo.avatarPublicId && photo.avatarPublicId !== savedPhotoId ? photo.avatarPublicId : null;
    setFields(photo);
  }

  const [addClient] = useMutation(ADD_CLIENT, { refetchQueries: REFRESH_ALL });
  const [updateClient] = useMutation(UPDATE_CLIENT, { refetchQueries: REFRESH_ALL });

  const onSubmit = (event) => handleSubmit(async (form) => {
    const input = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim() || null,
      avatarUrl: form.avatarUrl,
      avatarPublicId: form.avatarPublicId,
    };
    if (isEdit) {
      const { data } = await updateClient({ variables: { id: client.id, input } });
      savedRef.current = true;
      toast.success("Client updated");
      onDone?.(data.updateClient);
    } else {
      const { data } = await addClient({ variables: { input } });
      savedRef.current = true;
      toast.success(`${data.addClient.name} added to your clients`);
      onDone?.(data.addClient);
    }
  })(event);

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => setField(field, e.target.value),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AvatarPicker
        name={values.name}
        value={{ avatarUrl: values.avatarUrl, avatarPublicId: values.avatarPublicId }}
        onChange={changePhoto}
        onBusyChange={setPhotoBusy}
        error={errors.avatarUrl}
      />
      <Field label="Full name" error={errors.name}>
        {(a11y) => <Input {...a11y} {...bind("name")} placeholder="Ada Lovelace" autoComplete="name" autoFocus />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" error={errors.email}>
          {(a11y) => (
            <Input {...a11y} {...bind("email")} type="email" placeholder="ada@studio.com" autoComplete="email" />
          )}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {(a11y) => <Input {...a11y} {...bind("phone")} type="tel" placeholder="+91 98765 43210" autoComplete="tel" />}
        </Field>
      </div>
      <Field label="Company" optional error={errors.company}>
        {(a11y) => <Input {...a11y} {...bind("company")} placeholder="Analytical Engines Ltd." autoComplete="organization" />}
      </Field>

      <div className="flex justify-end gap-2 pt-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" loading={submitting} disabled={photoBusy}>
          {isEdit ? "Save changes" : "Add client"}
        </Button>
      </div>
    </form>
  );
}
