export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const PROFILE_AVATAR_MAX_BYTES = 3 * 1024 * 1024;

export const PROFILE_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProfileAvatarMimeType = (typeof PROFILE_AVATAR_MIME_TYPES)[number];

export type ProfileAvatarFormat = {
  extension: "jpg" | "png" | "webp";
  mimeType: ProfileAvatarMimeType;
};

/**
 * Identifies the bytes, not only the browser-provided MIME type. The upload
 * action still validates the MIME type at the form boundary, but this check
 * prevents a renamed SVG, HTML file, or other content from being stored as an
 * image.
 */
export function profileAvatarFormat(
  bytes: Uint8Array,
): ProfileAvatarFormat | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", mimeType: "image/png" };
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }

  return null;
}
