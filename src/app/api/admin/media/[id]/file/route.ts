import { adminHandler, notFound } from "@/server/admin/http";
import { mediaResponse, readMedia } from "@/server/media/store";
import { zId } from "@/server/validate";
import { MEDIA_VIEW } from "../../library";

// GET /api/admin/media/<id>/file[?download=1] - the stored file itself, for
// staff, whatever its access (the previews of the panel, the "Завантажити"
// link of a private document). Never cached by the browser or a proxy;
// download=1 asks for a save dialog instead of showing an image or a PDF.

type Context = { params: Promise<{ id: string }> };

export const GET = adminHandler<Context>(MEDIA_VIEW, async ({ context, url }) => {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  const stored = await readMedia(parsed.data);
  if (!stored) notFound();
  return mediaResponse(stored.meta, stored.bytes, {
    cache: "private",
    download: url.searchParams.get("download") === "1",
  });
});
