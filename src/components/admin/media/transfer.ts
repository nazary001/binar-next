import { ADMIN_API, type ApiFailure, type ApiResult } from "../lib/api";
import { prepareImage } from "../ui/media/upload";
import { MEDIA_IMAGE_TYPES, MEDIA_MAX_BYTES, type MediaAccess, type MediaFolder, type MediaUploadAnswer } from "./types";

// One upload to the media library with progress, for the library's own
// "Завантажити файли" dialog. The kit's uploadMedia() sends with fetch,
// which reports no progress; this sends the same multipart form with
// XMLHttpRequest so every file in the list shows how far it is.
//
// Images are first scaled down in the browser by the kit's prepareImage
// (the longest side to MEDIA_IMAGE_MAX_SIDE, under MEDIA_MAX_BYTES); a
// file still over the limit is refused here without being sent.

function failure(error: string, status = 0, data: Record<string, unknown> = {}): ApiFailure {
  return { ok: false, status, error, data };
}

export function isImageFile(file: File): boolean {
  return (MEDIA_IMAGE_TYPES as readonly string[]).includes(file.type);
}

export async function prepareForUpload(file: File): Promise<File> {
  return isImageFile(file) ? prepareImage(file) : file;
}

export function sendMedia(
  file: File,
  fields: { folder: MediaFolder; access: MediaAccess },
  onProgress: (fraction: number) => void,
): Promise<ApiResult<MediaUploadAnswer>> {
  if (file.size > MEDIA_MAX_BYTES) return Promise.resolve(failure("too-large", 0, { size: file.size }));
  const form = new FormData();
  form.set("file", file, file.name);
  form.set("folder", fields.folder);
  form.set("access", fields.access);

  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${ADMIN_API}/media`);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(1, event.loaded / event.total));
    };
    request.onerror = () => resolve(failure("network"));
    request.onabort = () => resolve(failure("network"));
    request.onload = () => {
      const body = request.response as Record<string, unknown> | null;
      if (request.status >= 200 && request.status < 300 && body && typeof body === "object" && body.media) {
        onProgress(1);
        resolve({ ok: true, status: request.status, data: body as unknown as MediaUploadAnswer });
        return;
      }
      const record = body && typeof body === "object" ? body : {};
      const error = typeof record.error === "string" ? record.error : request.status >= 500 ? "server" : "http";
      resolve(failure(error, request.status, record));
    };
    request.send(form);
  });
}
