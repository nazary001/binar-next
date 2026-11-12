import "server-only";
import { createHash } from "node:crypto";
import { Binary } from "mongodb";
import { publicMediaUrl, type MediaDto } from "@/components/admin/media/types";
import { collection, type MediaDoc } from "../db/collections";
import { newId } from "../ids";

// Uploaded files live in MongoDB: the description in `media`, the bytes in
// `media_blobs` under the same id. An upload is capped at 4 MB (a Vercel
// function accepts 4.5 MB), far below the 16 MB limit of a document, so one
// document per file is enough and a read is one round trip.
//
// A "public" file is served to anyone by GET /api/media/<id>. A "private"
// one (an order document, a locked material) leaves the server only through
// a route that has checked the caller and then calls `mediaResponse`.
// Validation of what may be uploaded (size, real type) is not here: see
// media/validate.ts; this file only stores what it is given.

export type NewMedia = {
  kind: MediaDoc["kind"];
  filename: string;
  contentType: string;
  width: number | null;
  height: number | null;
  folder: string;
  access: MediaDoc["access"];
  alt: string;
  createdBy: string | null;
};

export function sha256Of(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function toMediaDto(doc: MediaDoc): MediaDto {
  return {
    id: doc._id,
    kind: doc.kind,
    filename: doc.filename,
    contentType: doc.contentType,
    size: doc.size,
    width: doc.width,
    height: doc.height,
    folder: doc.folder,
    access: doc.access,
    alt: doc.alt,
    url: doc.access === "public" ? publicMediaUrl(doc._id) : null,
    adminUrl: `/api/admin/media/${doc._id}/file`,
    createdAt: doc.createdAt.toISOString(),
    createdBy: doc.createdBy,
  };
}

// Stores a file. The same bytes uploaded again into the same folder with
// the same access are not stored twice: the existing record is returned.
export async function saveMedia(bytes: Uint8Array, input: NewMedia): Promise<MediaDoc> {
  const media = await collection("media");
  const sha256 = sha256Of(bytes);
  const existing = await media.findOne({ sha256, folder: input.folder, access: input.access });
  if (existing) return existing;

  const doc: MediaDoc = {
    _id: newId("m"),
    kind: input.kind,
    filename: input.filename.slice(0, 200),
    contentType: input.contentType,
    size: bytes.byteLength,
    width: input.width,
    height: input.height,
    folder: input.folder,
    access: input.access,
    alt: input.alt.slice(0, 300),
    sha256,
    createdAt: new Date(),
    createdBy: input.createdBy,
  };
  const blobs = await collection("mediaBlobs");
  await blobs.insertOne({ _id: doc._id, data: new Binary(Buffer.from(bytes)) });
  try {
    await media.insertOne(doc);
  } catch (error) {
    await blobs.deleteOne({ _id: doc._id });
    throw error;
  }
  return doc;
}

export async function findMedia(id: string): Promise<MediaDoc | null> {
  return (await collection("media")).findOne({ _id: id });
}

export async function readMedia(id: string): Promise<{ meta: MediaDoc; bytes: Buffer } | null> {
  const meta = await findMedia(id);
  if (!meta) return null;
  const blob = await (await collection("mediaBlobs")).findOne({ _id: id });
  if (!blob) return null;
  return { meta, bytes: Buffer.from(blob.data.buffer) };
}

export async function deleteMedia(id: string): Promise<boolean> {
  const removed = await (await collection("media")).deleteOne({ _id: id });
  await (await collection("mediaBlobs")).deleteOne({ _id: id });
  return removed.deletedCount > 0;
}

// The file name of a download, safe for a header: the ASCII fallback plus
// the RFC 5987 form that carries Cyrillic names.
function disposition(kind: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "file";
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export type MediaResponseOptions = {
  // true = "save as"; false = show in the browser when it is an image or a PDF.
  download?: boolean;
  // "public": cached for a year (the id never points at other bytes).
  // "private": never stored by a browser or a proxy.
  cache: "public" | "private";
  // The request's If-None-Match header, for a 304.
  ifNoneMatch?: string | null;
};

// The HTTP answer that carries a stored file. The caller has already
// decided that this caller may have it.
export function mediaResponse(meta: MediaDoc, bytes: Buffer, options: MediaResponseOptions): Response {
  const etag = `"${meta.sha256.slice(0, 32)}"`;
  const inline = !options.download && (meta.kind === "image" || meta.contentType === "application/pdf");
  const headers: Record<string, string> = {
    "Content-Type": meta.contentType,
    "Content-Length": String(bytes.byteLength),
    "Content-Disposition": disposition(inline ? "inline" : "attachment", meta.filename),
    "X-Content-Type-Options": "nosniff",
    // A stored file can never run script or load anything, whatever it is.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "Cross-Origin-Resource-Policy": "same-origin",
    ETag: etag,
    "Cache-Control": options.cache === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
  };
  if (options.cache === "private") headers["Referrer-Policy"] = "no-referrer";
  if (options.cache === "public" && options.ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": headers["Cache-Control"] } });
  }
  return new Response(new Uint8Array(bytes), { status: 200, headers });
}
