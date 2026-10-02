import { describe, expect, it } from "vitest";
import { inspectJpeg } from "@/lib/jpeg";
import { jpegBytes } from "../support/jpeg-fixtures";

describe("inspectJpeg (RF-05 / AC-5)", () => {
  it("accepts a clean JPEG", () => {
    expect(inspectJpeg(jpegBytes())).toEqual({ isJpeg: true, hasMetadata: false });
  });

  it("flags EXIF (APP1) metadata", () => {
    expect(inspectJpeg(jpegBytes({ exif: true }))).toEqual({ isJpeg: true, hasMetadata: true });
  });

  it("rejects non-JPEG content", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(inspectJpeg(png).isJpeg).toBe(false);
    expect(inspectJpeg(new Uint8Array()).isJpeg).toBe(false);
  });

  it("rejects truncated or corrupt segments", () => {
    const bytes = jpegBytes().slice(0, 6);
    expect(inspectJpeg(bytes).isJpeg).toBe(false);
  });
});
