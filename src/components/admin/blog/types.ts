// The contract of the blog API of the admin panel (/api/admin/blog/*):
// what the routes answer and what they accept. Shared by the routes, the
// repository (src/server/admin/repos/blog.ts) and the blog screens. Types
// and plain constants only: no "use client", no server import.
//
//   GET    /blog/options                  -> BlogOptionsAnswer          content.view
//   GET    /blog/posts?status&category&q&sort&page&limit
//                                         -> BlogPostsAnswer            content.view
//                                            (with the tab counts)
//   POST   /blog/posts            BlogPostCreateInput -> BlogPostAnswer content.edit
//   GET    /blog/posts/<id>               -> BlogPostAnswer             content.view
//   PATCH  /blog/posts/<id>      BlogPostPatchInput  -> BlogPostAnswer content.edit
//   DELETE /blog/posts/<id>               -> { ok: true }               content.edit (+ content.publish when public)
//   POST   /blog/posts/<id>/publish   BlogPublishInput -> BlogPostAnswer  content.edit + content.publish
//   POST   /blog/posts/<id>/unpublish             -> BlogPostAnswer     content.edit + content.publish
//   POST   /blog/posts/<id>/slug      BlogSlugInput   -> BlogPostAnswer  content.edit (+ content.publish when public)
//   POST   /blog/posts/<id>/duplicate             -> BlogPostAnswer     content.edit
//   POST   /blog/posts/reorder        BlogReorderInput -> BlogReorderAnswer content.edit
//
// Refusals: 400 "bad-request" (a body of the wrong shape), 400 "fields"
// with { fields: { <name>: BlogFieldReason } }, 404 "not-found", 409
// "exists" (the slug is taken; { field: "slug" }), 403 "forbidden".

// The id of a post is its slug: the address of the article (/blog/<id>).
export type BlogEffectiveStatus = "draft" | "scheduled" | "published";

// What a post is for a visitor right now. A post without a stored status
// (the seed, anything older than the panel) is published; a "scheduled"
// post whose moment has passed is published too.
export const BLOG_STATUS_LABELS: { value: BlogEffectiveStatus; label: string }[] = [
  { value: "draft", label: "Чернетка" },
  { value: "scheduled", label: "Заплановано" },
  { value: "published", label: "Опубліковано" },
];

// One block of the article body the editor writes. Text fields are plain
// text with the small inline mark-up the renderer understands: **bold**,
// *italic* and [label](https://link). Same shape as BlogBlock of the
// database (src/server/db/collections.ts); the repository checks that the
// two stay identical.
export type BlogBlockDto =
  | { type: "lede"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; src: string; alt: string; caption: string }
  | { type: "quote"; text: string; author: string }
  | { type: "callout"; text: string }
  | { type: "divider" };

export type BlogBlockType = BlogBlockDto["type"];

export const BLOG_BLOCK_LABELS: { value: BlogBlockType; label: string }[] = [
  { value: "lede", label: "Вступ" },
  { value: "paragraph", label: "Абзац" },
  { value: "heading", label: "Заголовок" },
  { value: "list", label: "Список" },
  { value: "image", label: "Зображення" },
  { value: "quote", label: "Цитата" },
  { value: "callout", label: "Виноска" },
  { value: "divider", label: "Розділювач" },
];

// The classic body the article page renders today. The server derives it
// from the blocks on every save (see BlogPostDetail.body), so a post is
// never empty for the current renderer.
export type BlogBodyDto = {
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  listSection: { heading: string; items: string[] };
  tags: string[];
};

// Limits the server enforces (characters unless named otherwise).
export const BLOG_LIMITS = {
  slug: 80,
  title: 200,
  excerpt: 500,
  category: 60,
  categoryLabel: 60,
  image: 2000,
  coverAlt: 300,
  author: 120,
  seoTitle: 120,
  seoDescription: 300,
  tags: 12,
  tag: 40,
  blocks: 200,
  blockText: 5000,
  listItems: 50,
  listItem: 500,
  imageAlt: 300,
  imageCaption: 500,
  quoteAuthor: 200,
  readingMinutesMax: 240,
} as const;

// Reading time is counted at this pace when it is not typed.
export const BLOG_WORDS_PER_MINUTE = 180;

// Slugs that would collide with fixed addresses of the panel and its API
// (/admin/blog/new, /api/admin/blog/posts/reorder).
export const BLOG_RESERVED_SLUGS = ["new", "reorder"] as const;

// Where a picture (the cover, an image block) may come from: an upload of
// the media library ("/api/media/<id>"), a file of the site under
// "/figma-export/", or an https address.
export const BLOG_IMAGE_SOURCES_HINT = "Файл медіатеки, шлях /figma-export/... або адреса https://";

export type BlogOptions = {
  // The chips of the blog list, in order (settings "blog.categories").
  categories: string[];
  // Shown when a post names no author (settings "blog.defaultAuthor").
  defaultAuthor: string;
};

export type BlogOptionsAnswer = { ok: true } & BlogOptions;

// GET /blog/posts sorts by one of these ("-updatedAt" = newest first).
// "sort" is the order of the public list.
export const BLOG_SORTS = ["sort", "updatedAt", "publishedAt", "title"] as const;
export type BlogSort = (typeof BLOG_SORTS)[number];

export type BlogPostRow = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  image: string;
  status: BlogEffectiveStatus;
  // ISO; when the post went or goes live. null = never published.
  publishedAt: string | null;
  // ISO; null for a post nobody edited in the panel yet.
  updatedAt: string | null;
  // "" = none typed (the site shows BlogOptions.defaultAuthor).
  author: string;
  sort: number;
  // A document of the seed that nobody edited yet (a reseed overwrites it).
  seed: boolean;
  // The public address: "/blog/<id>".
  href: string;
};

// Posts per status under the search and category of the request (the
// status filter itself left out): the counts of the list's tabs.
export type BlogStatusCounts = { all: number; draft: number; scheduled: number; published: number };

// counts: see BlogStatusCounts; overall: every post of the blog, whatever
// the filters (the total of the page head).
export type BlogPostsAnswer = {
  ok: true;
  items: BlogPostRow[];
  total: number;
  page: number;
  limit: number;
  counts: BlogStatusCounts;
  overall: number;
};

export type BlogPostDetail = BlogPostRow & {
  excerpt: string;
  coverAlt: string;
  // A number typed by staff, or the count the server made at the last
  // save. null = never saved in the panel (the seed).
  readingMinutes: number | null;
  // The count of the current text, at BLOG_WORDS_PER_MINUTE (at least 1).
  // The editor can show "auto" when readingMinutes equals it.
  readingMinutesAuto: number;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  // ALWAYS present. When the stored post has no blocks yet (the seed),
  // these are converted from its classic body and `blocksFrom` is "body":
  // they are stored with the next save that sends them.
  blocks: BlogBlockDto[];
  blocksFrom: "blocks" | "body";
  // The classic body as stored (what the article page renders today).
  body: BlogBodyDto;
  // The status as stored (null = none: an old post, counts as published).
  storedStatus: "draft" | "published" | "scheduled" | null;
  // Visible on the site right now.
  isPublic: boolean;
  createdAt: string | null;
  updatedBy: { id: string; name: string } | null;
};

export type BlogPostAnswer = { ok: true; post: BlogPostDetail };

// The editable fields. PATCH takes any subset; status is changed only by
// publish / unpublish.
// - category must be one of BlogOptions.categories.
// - categoryLabel: the short label of the card ("" = the category itself).
// - readingMinutes: a number keeps a typed value; null or leaving it out
//   lets the server count it from the text again. Send it on every save
//   to keep a typed value.
// - tags: at most BLOG_LIMITS.tags of BLOG_LIMITS.tag characters each.
// - blocks: the whole body; the server derives the classic body from it.
export type BlogPostFieldsInput = {
  title: string;
  excerpt: string;
  category: string;
  categoryLabel: string;
  image: string;
  coverAlt: string;
  author: string;
  readingMinutes: number | null;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  blocks: BlogBlockDto[];
};

export type BlogPostPatchInput = Partial<BlogPostFieldsInput>;

// A new post is always a draft. slug: made from the title when left out;
// the first category of the settings and the default author when those
// are left out.
export type BlogPostCreateInput = Partial<BlogPostFieldsInput> & { title: string; slug?: string };

// at: ISO moment. Left out or in the past = published now (or then); in
// the future = scheduled. A post needs a title, an excerpt, a cover image
// and at least one block with text to go public: otherwise 400 "fields"
// naming the missing ones ("required").
export type BlogPublishInput = { at?: string };

export type BlogSlugInput = { slug: string };

// Moves post `id` right before `beforeId` in the public order (null = to
// the end).
export type BlogReorderInput = { id: string; beforeId: string | null };

export type BlogReorderAnswer = { ok: true; id: string; sort: number };

// Reasons in a 400 "fields" answer.
export type BlogFieldReason =
  | "required"
  | "invalid"
  | "too-long"
  | "too-many"
  | "unknown"
  | "reserved";

// Wording of the codes only the blog routes answer, for errorMessage(...,
// own).
export const BLOG_ERROR_MESSAGES: Record<string, string> = {
  exists: "Стаття з такою адресою вже існує. Оберіть іншу адресу.",
  fields: "Перевірте виділені поля.",
};

export const BLOG_FIELD_MESSAGES: Record<BlogFieldReason, string> = {
  required: "Заповніть це поле.",
  invalid: "Значення не підходить.",
  "too-long": "Задовге значення.",
  "too-many": "Забагато значень.",
  unknown: "Такого значення немає в списку.",
  reserved: "Ця адреса зайнята службовою сторінкою.",
};
