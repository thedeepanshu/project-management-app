// Local / single-server entry point: `npm run dev` and `npm start`.
// (On Vercel, api/index.js serves the same app as a function instead.)
import { styleText } from "node:util";

import { createApp } from "./app.js";
import { enabledProviders } from "./auth/auth.js";
import { disconnectDB } from "./config/db.js";
import env from "./config/env.js";
import { uploadsEnabled } from "./services/cloudinary.js";
import { emailMode, verifyEmailTransport } from "./services/mailer.js";

const app = await createApp();

const server = app.listen(env.port, () => {
  console.log(styleText("magenta", `✔ API ready at http://localhost:${env.port}/graphql`));
  console.log(`✔ Auth: email + password${enabledProviders.length ? `, ${enabledProviders.join(", ")}` : " (no social providers configured)"}`);
  console.log(`✔ Email: ${emailMode}`);
  verifyEmailTransport();
  console.log(uploadsEnabled ? "✔ Uploads: Cloudinary" : "○ Uploads: off (set CLOUDINARY_URL to enable)");
});

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close();
  await disconnectDB();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
