import { waitUntil } from "@vercel/functions";
import nodemailer from "nodemailer";
import { styleText } from "node:util";

import env from "../config/env.js";

// Sends transactional email through Gmail (SMTP + app password). Without SMTP
// credentials in development, emails are printed to the terminal instead, so
// sign-up and password reset can be tested locally with no setup.

const transport =
  env.smtp.user && env.smtp.pass
    ? nodemailer.createTransport({ service: "gmail", auth: { user: env.smtp.user, pass: env.smtp.pass } })
    : null;

export const emailMode = transport ? `Gmail (${env.smtp.user})` : "console (development)";
/** True when emails are printed to the terminal instead of sent (development only). */
export const emailToConsole = !transport;
const from = env.smtp.from ?? (env.smtp.user ? `Twillboard <${env.smtp.user}>` : "Twillboard <no-reply@localhost>");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/** A simple, email-client-safe layout: one card, one button, a plain link fallback. */
function layout({ preheader, heading, intro, buttonLabel, url, outro }) {
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html><body style="margin:0;background:#f7f5f2;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1b1a1f">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;border:1px solid #e9e5df;padding:32px">
<tr><td style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#5b45f0">Twillboard</td></tr>
<tr><td style="padding-top:20px;font-size:22px;font-weight:700">${escapeHtml(heading)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#4a4752">${intro}</td></tr>
${url ? `<tr><td style="padding-top:24px"><a href="${safeUrl}" style="display:inline-block;background:#5b45f0;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">${escapeHtml(buttonLabel)}</a></td></tr>
<tr><td style="padding-top:20px;font-size:12px;line-height:1.6;color:#8a8690">Or paste this link into your browser:<br><a href="${safeUrl}" style="color:#5b45f0;word-break:break-all">${safeUrl}</a></td></tr>` : ""}
<tr><td style="padding-top:20px;font-size:13px;line-height:1.6;color:#8a8690">${outro}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, "", intro.replace(/<[^>]+>/g, ""), url ? `\n${buttonLabel}: ${url}` : "", "", outro.replace(/<[^>]+>/g, "")].join("\n");
  return { html, text };
}

async function send({ to, subject, ...content }) {
  const { html, text } = layout(content);
  if (!transport) {
    console.log(
      styleText("cyan", `\n✉ Email (not sent: SMTP not configured)\n  To: ${to}\n  Subject: ${subject}`) +
        (content.url ? `\n  Link: ${content.url}\n` : "\n")
    );
    return;
  }
  await transport.sendMail({ from, to, subject, html, text });
}

/**
 * Fire-and-forget: the HTTP response never waits on (or reveals) email delivery,
 * so response timing can't be used to tell whether an account exists.
 */
function dispatch(message) {
  // On Vercel, waitUntil keeps the function alive until the email is sent;
  // elsewhere it's a no-op and the promise simply runs on.
  const sending = send(message).catch((error) => {
    console.error(`✖ Email to ${message.to} failed: ${error.message.split("\n")[0]}`);
    if (error.responseCode === 535) {
      console.error("  Gmail rejected SMTP_USER/SMTP_PASS. SMTP_PASS must be a 16-letter app password");
      console.error("  (https://myaccount.google.com/apppasswords), not your normal Gmail password.");
    }
    // In development, never leave the developer without the link.
    if (!env.isProduction && message.url) {
      console.log(styleText("cyan", `  Link (printed because sending failed): ${message.url}\n`));
    }
  });
  waitUntil(sending);
}

/** Checks the Gmail login at startup, so a bad password shows up immediately. */
export async function verifyEmailTransport() {
  if (!transport) return;
  try {
    await transport.verify();
  } catch (error) {
    console.error(styleText("red", `✖ Email: Gmail rejected the login for ${env.smtp.user}.`));
    console.error("  SMTP_PASS must be a 16-letter app password from https://myaccount.google.com/apppasswords");
    console.error("  (needs 2-Step Verification), not your normal Gmail password." + (env.isProduction ? "" : " Links will be printed here meanwhile."));
    if (error.responseCode !== 535) console.error(`  Details: ${error.message.split("\n")[0]}`);
  }
}

const firstName = (user) => escapeHtml(user.name?.split(" ")[0] || "there");

export function sendVerificationEmail(user, url) {
  dispatch({
    to: user.email,
    subject: "Verify your email for Twillboard",
    preheader: "Confirm your email address to finish setting up your account.",
    heading: "Confirm your email",
    intro: `Hi ${firstName(user)}, thanks for signing up. Confirm this is your email address to start using Twillboard.`,
    buttonLabel: "Verify email",
    url,
    outro: "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
  });
}

export function sendPasswordResetEmail(user, url) {
  dispatch({
    to: user.email,
    subject: "Reset your Twillboard password",
    preheader: "Use this link to choose a new password.",
    heading: "Reset your password",
    intro: `Hi ${firstName(user)}, we received a request to reset your password. Choose a new one with the button below.`,
    buttonLabel: "Choose a new password",
    url,
    outro:
      "This link expires in 30 minutes and can only be used once. If you didn't ask for this, ignore this email; your password won't change.",
  });
}

export function sendExistingAccountEmail(user) {
  dispatch({
    to: user.email,
    subject: "Someone tried to sign up with your email",
    preheader: "You already have a Twillboard account.",
    heading: "You already have an account",
    intro: `Hi ${firstName(user)}, someone just tried to create a Twillboard account with this email. You already have one, so nothing was changed.`,
    buttonLabel: "Sign in",
    url: `${env.appUrl}/sign-in`,
    outro: "If this was you, sign in instead (or reset your password). If it wasn't, no action is needed.",
  });
}
