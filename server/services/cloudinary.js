import { v2 as cloudinary } from "cloudinary";

import env from "../config/env.js";

// The SDK reads CLOUDINARY_URL from the environment by itself.
export const uploadsEnabled = Boolean(env.cloudinaryUrl);
const config = uploadsEnabled ? cloudinary.config() : {};

// attachment = project files, avatar = client photos, profile = the user's own photo.
const FOLDER_NAMES = { attachment: "attachments", avatar: "avatars", profile: "profile" };
export const PURPOSES = Object.keys(FOLDER_NAMES);

/** Each user's files live in their own folder, e.g. twillboard/users/<id>/attachments. */
export function userFolder(userId, purpose) {
  if (!/^[A-Za-z0-9_-]+$/.test(userId) || !PURPOSES.includes(purpose)) throw new Error("Invalid upload folder");
  return `twillboard/users/${userId}/${FOLDER_NAMES[purpose]}`;
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
    resourceType: purpose === "attachment" ? "auto" : "image", // photos must be images
  };
}

const RESOURCE_TYPES = ["image", "video", "raw"];
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * True when `publicId` is in `folder` and `url` is that very file, as Cloudinary
 * returns it after an upload: .../<cloud>/<resourceType>/upload/v<version>/<publicId>.<ext>
 * Checking them separately would let a valid id be paired with someone else's URL.
 */
export function isOwnAsset({ url, publicId, resourceType = "image" }, folder) {
  if (!uploadsEnabled || typeof url !== "string" || typeof publicId !== "string") return false;
  if (!publicId.startsWith(`${folder}/`) || publicId.includes("..")) return false;
  if (!RESOURCE_TYPES.includes(resourceType)) return false;
  const expected = new RegExp(
    `^https://res\\.cloudinary\\.com/${escapeRegExp(config.cloud_name)}/${resourceType}/upload/(v\\d+/)?` +
      `${escapeRegExp(publicId)}(\\.[A-Za-z0-9]+)?$`
  );
  return expected.test(url);
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

/** Deletes every image in a folder made by userFolder(). Best effort, like destroyAsset. */
export async function destroyFolder(folder) {
  if (!uploadsEnabled || !/^twillboard\/users\/[A-Za-z0-9_-]+\/[a-z]+$/.test(folder)) return;
  try {
    await cloudinary.api.delete_resources_by_prefix(`${folder}/`, { resource_type: "image", invalidate: true });
  } catch (error) {
    console.warn(`⚠ Couldn't delete Cloudinary folder ${folder}: ${error.error?.message ?? error.message}`);
  }
}

/** Inserts a delivery transformation into a Cloudinary URL, optionally changing the extension. */
export function transformUrl(url, transformation, extension) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const transformed = url.replace("/upload/", `/upload/${transformation}/`);
  return extension ? transformed.replace(/\.[a-z0-9]+$/i, `.${extension}`) : transformed;
}
