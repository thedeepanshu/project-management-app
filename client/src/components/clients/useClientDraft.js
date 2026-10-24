import { useEffect, useRef, useState } from "react";

import { useForm } from "../../hooks/useForm";
import { discardUploads } from "../../lib/uploads";
import { validateClient } from "../../lib/validation";

/**
 * A client's form state. A photo uploaded here but never saved is deleted when
 * it's replaced, or when the form closes without `markSaved()` being called.
 */
export function useClientDraft(client) {
  const form = useForm(
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
    form.setFields(photo);
  }

  const { values } = form;
  return {
    ...form,
    photoBusy,
    setPhotoBusy,
    changePhoto,
    markSaved: () => {
      savedRef.current = true;
    },
    toInput: () => ({
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      company: values.company.trim() || null,
      avatarUrl: values.avatarUrl,
      avatarPublicId: values.avatarPublicId,
    }),
  };
}
