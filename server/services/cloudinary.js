import { v2 as cloudinary } from "cloudinary";

import env from "../config/env.js";

// The SDK reads CLOUDINARY_URL from the environment by itself.
export const uploadsEnabled = Boolean(env.cloudinaryUrl);
const config = uploadsEnabled ? cloudinary.config() : {};

export const PURPOSES = ["attachment", "avatar"];

/** Each user's files live in their own folder, e.g. twillboard/users/<id>/attachments. */
export function userFolder(userId, purpose) {
  if (!/^[A-Za-z0-9_-]+$/.test(userId) || !PURPOSES.includes(purpose)) throw new Error("Invalid upload folder");
  return `twillboard/users/${userId}/${purpose === "avatar" ? "avatars" : "attachments"}`;
}

// Free-plan per-file limits, also enforced in the browser before uploading.
export const MAX_BYTES = { image: 10 * 1024 ** 2, video: 100 * 1024 ** 2, raw: 10 * 1024 ** 2 };

/**
 * Signs a direct browser → Cloudinary upload into the user's own folder. The
 * browser must send exactly these params (timestamp, folder) with the file, so
 * it can't upload anywhere else, and the signature expires after an hour.
 */
export function signUpload(purpose, userId) {
  const folder = userFolder(userId, purpose);
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, config.api_secret);
  return {
    cloudName: config.cloud_name,
    apiKey: config.api_key,
    timestamp,
    folder,
    signature,
    resourceType: purpose === "avatar" ? "image" : "auto",
  };
}

/** True when the URL and public id point at a file we uploaded into `folder`. */
export function isOwnAsset({ url, publicId }, folder) {
  return (
    uploadsEnabled &&
    typeof url === "string" &&
    url.startsWith(`https://res.cloudinary.com/${config.cloud_name}/`) &&
    typeof publicId === "string" &&
    publicId.startsWith(`${folder}/`)
  );
}

/** Deletes a file from Cloudinary. Best effort: a failure is logged, never thrown. */
export async function destroyAsset(publicId, resourceType = "image") {
  if (!uploadsEnabled || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (error) {
    console.warn(`⚠ Couldn't delete Cloudinary asset ${publicId}: ${error.message}`);
  }
}

/** Inserts a delivery transformation into a Cloudinary URL, optionally changing the extension. */
export function transformUrl(url, transformation, extension) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const transformed = url.replace("/upload/", `/upload/${transformation}/`);
  return extension ? transformed.replace(/\.[a-z0-9]+$/i, `.${extension}`) : transformed;
}
