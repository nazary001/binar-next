import { fail, handler } from "@/server/http";
import { mediaResponse, readMedia } from "@/server/media/store";
import { zId } from "@/server/validate";

// GET /api/media/<id>[?download=1] - a public file of the media library
// (the photos of blog posts and products), for anyone, without a session.
//
// Only files stored with access "public" leave here. An unknown id and a
// private file get the same 404, so the address tells nobody that a private
// file exists. The answer is cached for a year (an id never points at other
// bytes) and revalidated by ETag; mediaResponse sets those headers and the
// ones that keep a stored file from ever running as a page (nosniff, a
// sandboxing CSP), so its Response is returned as it is.

type Context = { params: Promise<{ id: string }> };

export const GET = handler<Context>(async (request, { params }) => {
  const parsed = zId.safeParse((await params).id);
  if (!parsed.success) return fail(404, "not-found");
  const stored = await readMedia(parsed.data);
  if (!stored || stored.meta.access !== "public") return fail(404, "not-found");
  return mediaResponse(stored.meta, stored.bytes, {
    cache: "public",
    ifNoneMatch: request.headers.get("if-none-match"),
    download: new URL(request.url).searchParams.get("download") === "1",
  });
});
