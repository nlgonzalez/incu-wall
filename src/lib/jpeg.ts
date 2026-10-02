export interface JpegInspection {
  isJpeg: boolean;
  /** True when an APP1 segment (EXIF or XMP — where GPS lives) is present. */
  hasMetadata: boolean;
}

const SOI = 0xd8;
const SOS = 0xda;
const EOI = 0xd9;
const APP1 = 0xe1;

/**
 * Walks JPEG marker segments up to the start of scan. Used server-side to reject uploads
 * that still carry EXIF/XMP metadata (defence in depth for client-side stripping).
 */
export function inspectJpeg(bytes: Uint8Array): JpegInspection {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== SOI) {
    return { isJpeg: false, hasMetadata: false };
  }

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return { isJpeg: false, hasMetadata: false };
    const marker = bytes[offset + 1]!;
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === SOS || marker === EOI) return { isJpeg: true, hasMetadata: false };
    // Standalone markers without a length field.
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }
    if (marker === APP1) return { isJpeg: true, hasMetadata: true };
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (length < 2) return { isJpeg: false, hasMetadata: false };
    offset += 2 + length;
  }
  return { isJpeg: false, hasMetadata: false };
}
