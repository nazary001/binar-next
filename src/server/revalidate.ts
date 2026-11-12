import "server-only";
import { revalidateTag } from "next/cache";
import { PUBLIC_TAGS, type PublicTag } from "./cache-tags";

// Drops the cached copies of the public, database-backed content so the
// next request reads the database again. Route Handlers only (next/cache).
// `{ expire: 0 }` is the immediate form this Next version documents for
// webhooks; the one-argument revalidateTag is deprecated.
export function revalidatePublicData(tags: PublicTag[] = PUBLIC_TAGS): PublicTag[] {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return tags;
}
