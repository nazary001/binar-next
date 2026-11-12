import {
  MEDIA_IMAGE_MAX_SIDE,
  MEDIA_IMAGE_TYPES,
  MEDIA_MAX_BYTES,
  type MediaAccess,
  type MediaDto,
  type MediaFolder,
} from "../../media/types";
import { adminUpload, errorMessage, type ApiFailure, type ApiResult } from "../../lib/api";
import { formatBytes } from "../../lib/format";

// Sending files to the media library (POST /api/admin/media) from the
// browser. The widgets (ImageField, GalleryField, FileField, MediaPicker)
// use these; a screen with an upload of its own shape can too.
//
//   const result = await uploadMedia(file, { folder: "products", alt: "Шампунь 30 мл" });
//   if (!result.ok) return setError(mediaErrorMessage(result));
//   onChange(result.data.media.url ?? result.data.media.adminUrl, result.data.media);
//
// prepareImage(file): a photo straight from a camera is often 6000 px and
// 8 MB; the server takes at most MEDIA_MAX_BYTES. A raster image larger
// than MEDIA_IMAGE_MAX_SIDE on its longest side, or heavier than the
// limit, is redrawn on a canvas at that size and saved as JPEG at quality
// 0.86 (WebP instead when it is a PNG with transparent pixels, so the
// transparency survives). GIFs are never redrawn (a canvas keeps only the
// first frame), files already small enough are kept as they are, and a
// file the browser cannot decode is returned unchanged (the server says
// what is wrong with it).
//
// uploadMedia(file, { folder, access?, alt?, prepare? }): prepares images
// (prepare: false skips that), refuses a file that is still over the
// limit without sending it, and posts the multipart form. The answer is
// ApiResult<{ media: MediaDto }>, never a thrown error.
//
// mediaErrorMessage(failure): the sentence for a refused upload, in the
// words of lib/api.ts errorMessage plus the media codes (too large, wrong
// type). checkImageFile(file) / checkFile(file, accept): the same refusal
// made in the browser before anything is sent.

export type UploadOptions = {
  folder: MediaFolder;
  access?: MediaAccess;
  alt?: string;
  prepare?: boolean;
};

export type UploadAnswer = { media: MediaDto };

// JPEG quality of a redrawn image, then the fallbacks tried while the file
// is still over the limit.
const QUALITY = 0.86;
const QUALITY_STEPS = [0.86, 0.76, 0.66];

function isRaster(type: string): boolean {
  return (MEDIA_IMAGE_TYPES as readonly string[]).includes(type) && type !== "image/gif";
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

// createImageBitmap where the browser has it, an <img> otherwise.
async function decode(file: File): Promise<Decoded | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall through to the element.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function hasTransparency(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = context.getImageData(0, 0, width, height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamed(name: string, type: string): string {
  const extension = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
  const base = name.replace(/\.[^./\\]+$/, "") || "image";
  return `${base}.${extension}`;
}

export async function prepareImage(file: File): Promise<File> {
  if (typeof document === "undefined" || !isRaster(file.type)) return file;
  const decoded = await decode(file);
  if (!decoded) return file;
  try {
    const { width, height } = decoded;
    const longest = Math.max(width, height);
    if (longest <= MEDIA_IMAGE_MAX_SIDE && file.size <= MEDIA_MAX_BYTES) return file;

    // Each pass that is still too heavy shrinks the picture by a fifth.
    let scale = Math.min(1, MEDIA_IMAGE_MAX_SIDE / longest);
    let best: Blob | null = null;
    for (let pass = 0; pass < 4; pass += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      const keepAlpha = file.type === "image/png" && hasTransparency(context, canvas.width, canvas.height);
      if (!keepAlpha) {
        // JPEG has no alpha: paint white under the picture, as a page would.
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = "source-over";
      }
      const type = keepAlpha ? "image/webp" : "image/jpeg";
      for (const quality of pass === 0 ? QUALITY_STEPS : [QUALITY]) {
        const blob = await toBlob(canvas, type, quality);
        if (!blob) continue;
        best = blob;
        if (blob.size <= MEDIA_MAX_BYTES) {
          return new File([blob], renamed(file.name, blob.type || type), { type: blob.type || type, lastModified: file.lastModified });
        }
      }
      scale *= 0.8;
    }
    // Still over the limit after every pass: hand back the smallest try, the
    // upload refuses it with the size in the message.
    return best ? new File([best], renamed(file.name, best.type), { type: best.type, lastModified: file.lastModified }) : file;
  } finally {
    decoded.release();
  }
}

// A refusal made in the browser, in the shape of a refused request.
function refusal(error: string, data: Record<string, unknown> = {}): ApiFailure {
  return { ok: false, status: 0, error, data };
}

const MEDIA_MESSAGES: Record<string, string> = {
  "too-large": `Файл завеликий: можна до ${formatBytes(MEDIA_MAX_BYTES)}.`,
  // The codes of POST /api/admin/media: "type" (the bytes are not an
  // accepted image or document), "empty", "content-type" (the request was
  // not a form upload).
  type: "Такий тип файлу не підтримується. Можна завантажити JPG, PNG, WebP, GIF, PDF та документи Word, Excel, PowerPoint.",
  empty: "Файл порожній.",
  "bad-type": "Такий тип файлу не підтримується.",
  "content-type": "Не вдалося надіслати файл. Спробуйте ще раз.",
  "not-image": "Оберіть зображення: JPEG, PNG, WebP або GIF.",
  "no-file": "Оберіть файл.",
};

export function mediaErrorMessage(failure: ApiFailure): string {
  if (failure.error === "too-large" && typeof failure.data.size === "number") {
    return `Файл завеликий (${formatBytes(failure.data.size)}): можна до ${formatBytes(MEDIA_MAX_BYTES)}.`;
  }
  return errorMessage(failure, MEDIA_MESSAGES);
}

// An image the library takes, or the refusal to show.
export function checkImageFile(file: File): ApiFailure | null {
  return (MEDIA_IMAGE_TYPES as readonly string[]).includes(file.type) ? null : refusal("not-image");
}

// A file whose extension or type matches an `accept` list (".pdf,.docx" or
// "application/pdf"; empty accepts anything), or the refusal to show.
export function checkFile(file: File, accept: string | undefined): ApiFailure | null {
  if (!accept) return null;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const ok = accept
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) =>
      entry.startsWith(".") ? name.endsWith(entry) : entry.endsWith("/*") ? type.startsWith(entry.slice(0, -1)) : type === entry,
    );
  return ok ? null : refusal("type");
}

export async function uploadMedia(file: File, { folder, access = "public", alt = "", prepare = true }: UploadOptions): Promise<ApiResult<UploadAnswer>> {
  const ready = prepare ? await prepareImage(file) : file;
  if (ready.size > MEDIA_MAX_BYTES) return refusal("too-large", { size: ready.size });
  const form = new FormData();
  form.set("file", ready, ready.name);
  form.set("folder", folder);
  form.set("access", access);
  if (alt.trim()) form.set("alt", alt.trim());
  const result = await adminUpload<{ ok: true; media: MediaDto }>("/media", form);
  if (!result.ok) return result;
  if (!result.data || typeof result.data !== "object" || !result.data.media) {
    return refusal("http");
  }
  return { ok: true, status: result.status, data: { media: result.data.media } };
}

// The address a widget stores for an uploaded file: the public one, else
// the staff one (a private file).
export function mediaHref(media: MediaDto): string {
  return media.url ?? media.adminUrl;
}

// The label of a file type for a badge ("PDF", "DOCX", "XLSX").
export function fileTypeLabel(name: string, contentType = ""): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  if (match) return match[1].toUpperCase();
  const sub = contentType.split("/")[1];
  return sub ? sub.slice(0, 4).toUpperCase() : "Файл";
}
