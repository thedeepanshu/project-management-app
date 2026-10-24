/**
 * Square, face-centred thumbnail for a profile photo. Cloudinary uploads are
 * resized on the fly; photos from Google/GitHub/Microsoft are used as-is.
 */
export function photoThumb(url, size = 160) {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_fill,g_face,w_${size},h_${size},q_auto,f_auto/`);
}
