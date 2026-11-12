import "server-only";

// Cache tags of the public, database-backed content. Server components read
// it through unstable_cache(fn, key, { tags: [TAG.x], revalidate:
// PUBLIC_REVALIDATE_SECONDS }), so an edit in the database shows up within
// five minutes on its own, or at once after POST /api/revalidate.
// (No next/* import here: the seed scripts read these names too.)
export const TAG = {
  catalog: "catalog",
  materials: "materials",
  blog: "blog",
} as const;

export type PublicTag = (typeof TAG)[keyof typeof TAG];

export const PUBLIC_TAGS: PublicTag[] = [TAG.catalog, TAG.materials, TAG.blog];

export const PUBLIC_REVALIDATE_SECONDS = 300;
