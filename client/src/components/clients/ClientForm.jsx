import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { ADD_CLIENT, REFRESH_ALL, UPDATE_CLIENT } from "../../graphql/documents";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { ModalFooter } from "../ui/Modal";
import { AvatarPicker } from "./AvatarPicker";
import { useClientDraft } from "./useClientDraft";

/** The client's photo and contact fields, bound to a `useClientDraft()`. */
export function ClientFields({ draft }) {
  const { values, errors, setField } = draft;
  const bind = (field) => ({
    value: values[field],
    onChange: (e) => setField(field, e.target.value),
  });

  return (
    <>
      <AvatarPicker
        name={values.name}
        value={{ avatarUrl: values.avatarUrl, avatarPublicId: values.avatarPublicId }}
        onChange={draft.changePhoto}
        onBusyChange={draft.setPhotoBusy}
        error={errors.avatarUrl}
      />
      <Field label="Full name" error={errors.name}>
        {(a11y) => <Input {...a11y} {...bind("name")} placeholder="Ada Lovelace" autoComplete="name" data-autofocus />}
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
    </>
  );
}

/** Edits a client (or adds one in a single step; the "New client" dialog uses NewClientWizard). */
export function ClientForm({ client, onDone, onCancel }) {
  const draft = useClientDraft(client);
  const [updateClient] = useMutation(UPDATE_CLIENT, { refetchQueries: REFRESH_ALL });
  const [addClient] = useMutation(ADD_CLIENT, { refetchQueries: REFRESH_ALL });
  const isEdit = Boolean(client);

  const onSubmit = draft.handleSubmit(async () => {
    const input = draft.toInput();
    if (isEdit) {
      const { data } = await updateClient({ variables: { id: client.id, input } });
      draft.markSaved();
      toast.success("Client updated");
      onDone?.(data.updateClient);
    } else {
      const { data } = await addClient({ variables: { input } });
      draft.markSaved();
      toast.success(`${data.addClient.name} added to your clients`);
      onDone?.(data.addClient);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ClientFields draft={draft} />
      <ModalFooter className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" loading={draft.submitting} disabled={draft.photoBusy}>
          {isEdit ? "Save changes" : "Add client"}
        </Button>
      </ModalFooter>
    </form>
  );
}
