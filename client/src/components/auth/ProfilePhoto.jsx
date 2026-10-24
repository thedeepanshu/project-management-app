import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAppConfig } from "../../hooks/useAppConfig";
import { postJSON } from "../../lib/api";
import { authClient } from "../../lib/authClient";
import { photoThumb } from "../../lib/images";
import { AVATAR_ACCEPT, formatBytes, uploadFile } from "../../lib/uploads";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

const MAX_BYTES = 5 * 1024 * 1024;

/** The signed-in user's own photo: upload from the device or remove (no links). */
export function ProfilePhoto({ user }) {
  const { uploads } = useAppConfig();
  const { refetch } = authClient.useSession();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [removing, setRemoving] = useState(false);
  const busy = progress !== null || removing;

  async function choose(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file (PNG, JPG, WebP, GIF or AVIF).");
    if (file.size > MAX_BYTES) return toast.error(`That photo is ${formatBytes(file.size)}; the limit is 5 MB.`);

    setProgress(0);
    try {
      const uploaded = await uploadFile(file, "profile", { onProgress: setProgress });
      await postJSON("/api/profile/photo", { url: uploaded.url, publicId: uploaded.publicId });
      await refetch();
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error.message ?? "Couldn't update your photo. Please try again.");
    } finally {
      setProgress(null);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      await postJSON("/api/profile/photo", null, { method: "DELETE" });
      await refetch();
      toast.success("Profile photo removed");
    } catch (error) {
      toast.error(error.message ?? "Couldn't remove your photo.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={user.name || user.email} src={photoThumb(user.image)} size="xl" />
        {progress !== null && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-xs font-semibold text-white">
            {Math.round(progress * 100)}%
          </span>
        )}
      </div>
      {uploads.enabled ? (
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              <Camera /> {user.image ? "Change photo" : "Upload photo"}
            </Button>
            {user.image && (
              <Button variant="ghost" size="sm" onClick={remove} loading={removing} disabled={busy} className="hover:bg-red-500/10 hover:text-red-600">
                <Trash2 /> Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-subtle">PNG, JPG, WebP, GIF or AVIF, up to 5 MB.</p>
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      ) : (
        <p className="text-xs text-subtle">Photo uploads aren't configured on this server.</p>
      )}
    </div>
  );
}
