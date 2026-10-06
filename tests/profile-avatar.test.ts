import { describe, expect, it } from "vitest";

import {
  profileAvatarFormat,
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_AVATAR_MIME_TYPES,
} from "@/lib/settings/avatar";
import { isUndefinedColumn } from "@/lib/db/schema-drift";
import { profileAvatarSchema } from "@/lib/validation";

describe("profile avatar boundary", () => {
  it("recognizes an unapplied avatar-column migration without treating other errors as schema drift", () => {
    expect(isUndefinedColumn({ code: "42703" })).toBe(true);
    // A write naming the missing column fails in PostgREST's schema cache.
    expect(isUndefinedColumn({ code: "PGRST204" })).toBe(true);
    expect(isUndefinedColumn({ code: "PGRST116" })).toBe(false);
    expect(isUndefinedColumn(null)).toBe(false);
  });

  it("recognizes only the supported image signatures", () => {
    expect(
      profileAvatarFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
    ).toEqual({ extension: "jpg", mimeType: "image/jpeg" });
    expect(
      profileAvatarFormat(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toEqual({ extension: "png", mimeType: "image/png" });

    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(profileAvatarFormat(webp)).toEqual({
      extension: "webp",
      mimeType: "image/webp",
    });
    expect(
      profileAvatarFormat(new Uint8Array([0x3c, 0x73, 0x76, 0x67])),
    ).toBeNull();
  });

  it("keeps the accepted MIME types and size limit in one schema", () => {
    expect(PROFILE_AVATAR_MIME_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(PROFILE_AVATAR_MAX_BYTES).toBe(3 * 1024 * 1024);

    const file = new File(
      [new Uint8Array([0xff, 0xd8, 0xff])],
      "avatar.jpg",
      { type: "image/jpeg" },
    );
    expect(profileAvatarSchema.safeParse({ avatar: file }).success).toBe(true);
    const missing = profileAvatarSchema.safeParse({ avatar: null });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error.issues[0]?.message).toBe("Selecione uma foto.");
    expect(
      profileAvatarSchema.safeParse({
        avatar: new File(["svg"], "avatar.svg", { type: "image/svg+xml" }),
      }).success,
    ).toBe(false);
  });
});
