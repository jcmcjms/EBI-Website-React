import { describe, expect, it, beforeAll } from "vitest";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { uploadImage, MediaUploadError, getMediaUrl } from "@/src/lib/media/service";

/**
 * Pipeline smoke tests for the media service.
 *
 * These exercise the full upload path (validation → sharp encode → DB
 * write) against the seeded SQLite database. We look up the seeded
 * admin user's id in `beforeAll` so each test can attribute uploads
 * to a real User (the schema has a foreign-key constraint on
 * MediaAsset.uploadedById).
 */

const prisma = new PrismaClient();
let ACTOR_ID = "";

beforeAll(async () => {
  const admin = await prisma.user.findFirst({
    where: { email: "admin@ebi.local" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error(
      "Seed user 'admin@ebi.local' not found. Run `npm run db:seed` first.",
    );
  }
  ACTOR_ID = admin.id;
});

async function makeJpeg(): Promise<Buffer> {
  return sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 32, g: 64, b: 96 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function makePng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 0, g: 128, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

async function makeSvg(): Promise<Buffer> {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
  );
}

describe("media service", () => {
  it("uploads a JPEG and emits webp + avif + jpeg variants", async () => {
    const buf = await makeJpeg();
    const asset = await uploadImage({
      buffer: buf,
      mimeType: "image/jpeg",
      altText: "test jpeg",
      uploadedById: ACTOR_ID,
      originalName: "test.jpg",
    });

    expect(asset.id).toBeTruthy();
    expect(asset.mimeType).toBe("image/jpeg");
    expect(asset.width).toBe(800);
    expect(asset.height).toBe(600);
    expect(asset.variants.length).toBe(3);

    const formats = asset.variants.map((v) => v.format).sort();
    expect(formats).toEqual(["avif", "jpeg", "webp"]);
  });

  it("uploads a PNG (magic bytes override the mimeType hint)", async () => {
    const buf = await makePng();
    // Lie about the mime — server should still detect PNG from bytes.
    const asset = await uploadImage({
      buffer: buf,
      mimeType: "image/jpeg",
      altText: "test png",
      uploadedById: ACTOR_ID,
      originalName: "fake.jpg",
    });

    expect(asset.mimeType).toBe("image/png");
  });

  it("rejects SVG outright", async () => {
    const buf = await makeSvg();
    await expect(
      uploadImage({
        buffer: buf,
        mimeType: "image/svg+xml",
        altText: "svg test",
        uploadedById: ACTOR_ID,
      }),
    ).rejects.toMatchObject({
      name: "MediaUploadError",
      code: "UNSUPPORTED_TYPE",
    });
  });

  it("rejects empty altText", async () => {
    const buf = await makeJpeg();
    await expect(
      uploadImage({
        buffer: buf,
        mimeType: "image/jpeg",
        altText: "   ",
        uploadedById: ACTOR_ID,
      }),
    ).rejects.toBeInstanceOf(MediaUploadError);
  });

  it("rejects payloads exceeding the size cap", async () => {
    const buf = await makeJpeg();
    await expect(
      uploadImage(
        {
          buffer: buf,
          mimeType: "image/jpeg",
          altText: "too big",
          uploadedById: ACTOR_ID,
        },
        { maxBytes: 100 }, // 100-byte cap
      ),
    ).rejects.toMatchObject({ code: "TOO_LARGE" });
  });
});

describe("getMediaUrl", () => {
  it("returns same-origin path when MEDIA_BASE_URL is empty", () => {
    const prev = process.env.MEDIA_BASE_URL;
    delete process.env.MEDIA_BASE_URL;
    try {
      expect(getMediaUrl("abc/photo.jpg")).toBe("/media/abc/photo.jpg");
    } finally {
      if (prev !== undefined) process.env.MEDIA_BASE_URL = prev;
    }
  });

  it("prefixes MEDIA_BASE_URL when set", () => {
    const prev = process.env.MEDIA_BASE_URL;
    process.env.MEDIA_BASE_URL = "https://media.example.com";
    try {
      expect(getMediaUrl("abc/photo.jpg")).toBe(
        "https://media.example.com/media/abc/photo.jpg",
      );
    } finally {
      if (prev !== undefined) process.env.MEDIA_BASE_URL = prev;
      else delete process.env.MEDIA_BASE_URL;
    }
  });
});