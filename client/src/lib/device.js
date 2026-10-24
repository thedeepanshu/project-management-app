// Turns a user-agent string into "Chrome on Windows" for the sessions list.
// Best effort only: it's a hint for the user, never used for security decisions.
export function describeDevice(userAgent = "") {
  const ua = userAgent || "";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : null;
  const os =
    /Windows/.test(ua) ? "Windows"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : null;
  const mobile = /Mobile|iPhone|Android/.test(ua);
  if (!browser && !os) return { label: "Unknown device", mobile };
  return { label: [browser ?? "Browser", os && `on ${os}`].filter(Boolean).join(" "), mobile };
}
