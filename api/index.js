// Vercel Function serving the whole API: /api/* (auth, uploads, profile) and
// /graphql. vercel.json rewrites those paths here; the original URL is kept,
// so Express routes them as usual. The app and its database connection are
// built once per function instance and reused by later requests.
import { createApp } from "../server/app.js";

let appPromise = null;

export default async function handler(req, res) {
  appPromise ??= createApp().catch((error) => {
    appPromise = null; // e.g. Atlas briefly unreachable: let the next request retry
    throw error;
  });
  const app = await appPromise;
  return app(req, res);
}
