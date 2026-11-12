import "server-only";
import { MEDIA_MAX_BYTES } from "@/components/admin/media/types";

// What may enter the media library. The type of an upload is decided by its
// first bytes, never by its name or by the type the browser claims: a page
// named "photo.png" that is really HTML must never be stored, and a PNG
// named "scan.pdf" is stored as the image it is.
//
// Accepted:
// - images: JPEG, PNG, WebP, GIF, with the pixel size read from their own
//   headers (an image whose size cannot be read is refused as broken);
// - PDF;
// - office documents: the ZIP-based docx / xlsx / pptx (ZIP signature, the
//   matching extension and the package parts of that format) and the legacy
//   OLE doc / xls / ppt (OLE signature and the matching extension).
// Everything else is refused: SVG (it can carry script), HTML, scripts,
// plain archives, executables, anything unknown.

export type UploadKind = "image" | "file";

export type InspectedUpload = {
  ok: true;
  kind: UploadKind;
  contentType: string;
  // Without the dot, lower case ("jpg", "docx").
  extension: string;
  width: number | null;
  height: number | null;
};

export type RefusedUpload = { ok: false; reason: "empty" | "too-large" | "type" };

type Detected = Omit<InspectedUpload, "ok">;

const OOXML = {
  docx: { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", part: "word/" },
  xlsx: { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", part: "xl/" },
  pptx: { contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", part: "ppt/" },
} as const;

const OLE = {
  doc: "application/msword",
  xls: "application/vnd.ms-excel",
  ppt: "application/vnd.ms-powerpoint",
} as const;

// The extension a stored file of a content type carries (used when staff
// rename a file: the extension always follows the real type).
const EXTENSION_OF_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  [OOXML.docx.contentType]: "docx",
  [OOXML.xlsx.contentType]: "xlsx",
  [OOXML.pptx.contentType]: "pptx",
  [OLE.doc]: "doc",
  [OLE.xls]: "xls",
  [OLE.ppt]: "ppt",
};

export function extensionForType(contentType: string): string | null {
  return EXTENSION_OF_TYPE[contentType] ?? null;
}

// --- byte helpers --------------------------------------------------------------

function hasBytes(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function u16be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u24le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function u32be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) >>> 0) + ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]);
}

function image(contentType: string, extension: string, width: number, height: number): Detected {
  return { kind: "image", contentType, extension, width, height };
}

// --- images --------------------------------------------------------------------

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

// The first chunk of a PNG is always IHDR: width and height, 4 bytes each.
function png(bytes: Uint8Array): Detected | null {
  if (!hasBytes(bytes, PNG_SIGNATURE)) return null;
  if (ascii(bytes, 12, 4) !== "IHDR" || bytes.length < 24) return image("image/png", "png", 0, 0);
  return image("image/png", "png", u32be(bytes, 16), u32be(bytes, 20));
}

// The logical screen of a GIF: width and height, 2 bytes each, little endian.
function gif(bytes: Uint8Array): Detected | null {
  const head = ascii(bytes, 0, 6);
  if (head !== "GIF87a" && head !== "GIF89a") return null;
  if (bytes.length < 10) return image("image/gif", "gif", 0, 0);
  return image("image/gif", "gif", u16le(bytes, 6), u16le(bytes, 8));
}

// A WebP is a RIFF container; its first chunk says which of the three
// bitstreams follows, and each keeps the size in its own way.
function webp(bytes: Uint8Array): Detected | null {
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const chunk = ascii(bytes, 12, 4);
  // Lossy: a 3-byte frame tag, the start code 9d 01 2a, then 14-bit sizes.
  if (chunk === "VP8 " && bytes.length >= 30 && hasBytes(bytes, [0x9d, 0x01, 0x2a], 23)) {
    return image("image/webp", "webp", u16le(bytes, 26) & 0x3fff, u16le(bytes, 28) & 0x3fff);
  }
  // Lossless: the signature byte 2f, then (width - 1) and (height - 1) in
  // 14 bits each.
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;
    return image("image/webp", "webp", (bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  // Extended: flags, 3 reserved bytes, then (width - 1) and (height - 1)
  // in 24 bits each.
  if (chunk === "VP8X" && bytes.length >= 30) {
    return image("image/webp", "webp", u24le(bytes, 24) + 1, u24le(bytes, 27) + 1);
  }
  return image("image/webp", "webp", 0, 0);
}

// Start-of-frame markers carry the size: c0..cf except c4 (Huffman
// tables), c8 (reserved) and cc (arithmetic coding conditions).
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

// A JPEG is a run of segments (ff <marker> <2-byte length> ...). The size
// is in the first start-of-frame segment, after any number of APPn (EXIF,
// ICC profiles), tables and comments, which are skipped by their length.
function jpeg(bytes: Uint8Array): Detected | null {
  if (!hasBytes(bytes, [0xff, 0xd8, 0xff])) return null;
  const broken = image("image/jpeg", "jpg", 0, 0);
  let at = 2;
  while (at + 1 < bytes.length) {
    if (bytes[at] !== 0xff) return broken;
    // Any number of ff fill bytes may precede a marker.
    while (at + 1 < bytes.length && bytes[at + 1] === 0xff) at += 1;
    const marker = bytes[at + 1];
    at += 2;
    // Markers without a segment.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    // End of image, or the scan data began before any frame header.
    if (marker === 0xd9 || marker === 0xda) return broken;
    if (at + 1 >= bytes.length) return broken;
    const length = u16be(bytes, at);
    if (length < 2) return broken;
    if (isStartOfFrame(marker)) {
      // length (2), precision (1), height (2), width (2).
      if (at + 6 >= bytes.length) return broken;
      return image("image/jpeg", "jpg", u16be(bytes, at + 5), u16be(bytes, at + 3));
    }
    at += length;
  }
  return broken;
}

// --- documents -------------------------------------------------------------------

function pdf(bytes: Uint8Array): Detected | null {
  if (ascii(bytes, 0, 5) !== "%PDF-") return null;
  return { kind: "file", contentType: "application/pdf", extension: "pdf", width: null, height: null };
}

function asBuffer(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

// A docx / xlsx / pptx is a ZIP package. Besides the signature and the
// extension, the package must hold its content-type list and the folder of
// its format (the entry names are stored in plain ASCII), so a plain
// archive renamed to .docx is refused.
function officeZip(bytes: Uint8Array, extension: string): Detected | null {
  if (!hasBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) return null;
  if (!(extension in OOXML)) return null;
  const format = OOXML[extension as keyof typeof OOXML];
  const buffer = asBuffer(bytes);
  if (!buffer.includes("[Content_Types].xml", 0, "latin1") || !buffer.includes(format.part, 0, "latin1")) return null;
  return { kind: "file", contentType: format.contentType, extension, width: null, height: null };
}

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

function officeOle(bytes: Uint8Array, extension: string): Detected | null {
  if (!hasBytes(bytes, OLE_SIGNATURE)) return null;
  if (!(extension in OLE)) return null;
  return { kind: "file", contentType: OLE[extension as keyof typeof OLE], extension, width: null, height: null };
}

// --- names -----------------------------------------------------------------------

function baseName(filename: string): string {
  const parts = filename.split(/[\\/]/);
  return (parts[parts.length - 1] ?? "").normalize("NFC");
}

// The extension the uploader gave the file, lower case, without the dot
// ("" when there is none).
export function extensionOf(filename: string): string {
  const name = baseName(filename);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

// The name a file is stored and downloaded under: letters of any script
// (Cyrillic included), digits, dots, dashes, underscores and spaces; any
// other character becomes "_". The extension is always the one of the
// detected type ("scan.pdf" holding a PNG is stored as "scan.png").
export function storedFilename(filename: string, extension: string): string {
  const name = baseName(filename);
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 && /^[A-Za-z0-9]{1,8}$/.test(name.slice(dot + 1)) ? name.slice(0, dot) : name;
  const clean = stem
    .replace(/[^\p{L}\p{M}\p{N}._ -]+/gu, "_")
    .replace(/ {2,}/g, " ")
    .replace(/_{2,}/g, "_")
    .replace(/^[ ._-]+|[ ._-]+$/g, "")
    .slice(0, 150)
    .replace(/[ ._-]+$/g, "");
  return `${clean || "file"}.${extension}`;
}

// --- the check ---------------------------------------------------------------------

export function inspectUpload(bytes: Uint8Array, filename: string): InspectedUpload | RefusedUpload {
  if (bytes.byteLength === 0) return { ok: false, reason: "empty" };
  if (bytes.byteLength > MEDIA_MAX_BYTES) return { ok: false, reason: "too-large" };

  const extension = extensionOf(filename);
  const detected =
    png(bytes) ?? jpeg(bytes) ?? gif(bytes) ?? webp(bytes) ?? pdf(bytes) ?? officeZip(bytes, extension) ?? officeOle(bytes, extension);
  if (!detected) return { ok: false, reason: "type" };
  // An image whose headers do not give a size is broken or forged.
  if (detected.kind === "image" && !((detected.width ?? 0) > 0 && (detected.height ?? 0) > 0)) {
    return { ok: false, reason: "type" };
  }
  return { ok: true, ...detected };
}
