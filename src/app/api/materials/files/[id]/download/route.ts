import { MEDIA_ORDER_FOLDER, parseMediaRef } from "@/components/admin/media/types";
import { canDownloadMaterial } from "@/components/materials/data";
import { getSession } from "@/server/auth/session";
import { fail, handler } from "@/server/http";
import { mediaResponse, readMedia } from "@/server/media/store";
import { getMaterialFile } from "@/server/repos/materials";
import { zId } from "@/server/validate";

// GET /api/materials/files/<id>/download - the download link of every
// stored file of the materials library (the `href` the file cards and the
// preview panel render).
//
// The rule is the one the UI shows (canDownloadMaterial): a guest gets the
// files that are not locked, a B2C account everything, a B2B partner
// everything outside its agreement (partnerLocked). Allowed -> 302 to the
// stored location; refused -> 401 for a guest (sign in first), 403 for a
// signed-in account; unknown id -> 404. External `url` files are never
// downloaded through the site (404). A file kept in the media library
// (storagePath "media:<id>") is streamed by this route itself, after the
// same check, as a private download; a missing one, and a file of the
// folder of order papers, is 404.

type Context = { params: Promise<{ id: string }> };

// A storage location the redirect may point at: a path on this site or
// an https URL (a later blob store). Anything else is a bad record (404),
// never a redirect. A "path" is judged by where a browser resolves it
// (base below), so "//host", "/\host" and "/<tab>/host", which browsers
// send to another host, are refused; the value must be visible ASCII,
// which a header carries unchanged.
const SITE = "http://site.invalid";
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;

function storageLocation(path: string): string | null {
  // The media library form, never a redirect target: streamed below.
  if (parseMediaRef(path)) return path;
  if (!VISIBLE_ASCII.test(path)) return null;
  let url: URL;
  try {
    url = new URL(path, SITE);
  } catch {
    return null;
  }
  if (path.startsWith("/")) return url.origin === SITE && !/^\/[/\\]/.test(path) ? path : null;
  return path.startsWith("https://") && url.protocol === "https:" && url.hostname ? path : null;
}

export const GET = handler<Context>(async (_request, { params }) => {
  const { id } = await params;
  const parsed = zId.safeParse(id);
  if (!parsed.success) return fail(404, "not-found");

  const file = await getMaterialFile(parsed.data);
  const location = file && file.type !== "url" && file.storagePath ? storageLocation(file.storagePath) : null;
  if (!file || !location) return fail(404, "not-found");

  const session = await getSession();
  if (!canDownloadMaterial(file, session ? session.user.type : null)) {
    return session ? fail(403, "forbidden") : fail(401, "unauthorized");
  }
  const mediaId = parseMediaRef(location);
  if (mediaId) {
    const stored = await readMedia(mediaId);
    // A paper of an order never leaves through a material, even when a
    // record points at one (the panel refuses to make such a record).
    if (!stored || stored.meta.folder === MEDIA_ORDER_FOLDER) return fail(404, "not-found");
    return mediaResponse(stored.meta, stored.bytes, { cache: "private", download: true });
  }
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
});
