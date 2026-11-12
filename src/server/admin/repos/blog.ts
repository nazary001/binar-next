import "server-only";
import type { AnyBulkWriteOperation, Filter } from "mongodb";
import { z, type ZodType } from "zod";
import {
  BLOG_LIMITS,
  BLOG_RESERVED_SLUGS,
  BLOG_SORTS,
  BLOG_WORDS_PER_MINUTE,
  type BlogBlockDto,
  type BlogBodyDto,
  type BlogEffectiveStatus,
  type BlogFieldReason,
  type BlogOldAddress,
  type BlogOptions,
  type BlogPostDetail,
  type BlogPostRow,
  type BlogStatusCounts,
} from "@/components/admin/blog/types";
import { slugify } from "@/components/admin/lib/format";
import { collection, type BlogBlock, type BlogBody, type BlogPostDoc } from "../../db/collections";
import { publicBlogFilter } from "../../repos/blog";
import type { StaffContext } from "../auth";
import { HttpError, assertCan, notFound, readJson } from "../http";
import { UK_COLLATION, contains, listQuery, oneOf, paginate, type Page } from "../list";
import { getSettings } from "../settings";
import { findStaff } from "../staff";

// The blog of the admin panel: posts of `blog_posts` (the id is the slug).
//
// Two bodies live side by side. `blocks` is what the editor writes; `body`
// (intro, sections, one list section, tags) is what the article page
// renders today. Every save that sends blocks derives `body` from them
// (bodyFromBlocks), so an article is never empty for the current
// renderer; a post without blocks (the seed) is shown to the editor as
// blocks converted from its body (blocksFromBody).
//
// A post is public when it has no status, is "published", or is
// "scheduled" for a moment that has passed (the storefront reads exactly
// that: repos/blog.ts publicBlogFilter). The routes revalidate the public
// blog after every write of a post that is or was public.

// The editor's block type and the database's must stay one shape.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const BLOCK_TYPES_MATCH: Same<BlogBlockDto, BlogBlock> = true;
void BLOCK_TYPES_MATCH;

// --- validation -------------------------------------------------------------

const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;
const MEDIA_SRC = /^\/api\/media\/[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
// Segments may not start with a dot, so ".." can never climb out.
const SITE_FILE = /^\/figma-export\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

// Where a picture may come from: an upload of the media library, a file of
// the site under /figma-export/, or an https address. Anything else
// (javascript:, data:, //host, another path of the site) is refused, so a
// stored src can only ever load an image.
export function isAllowedImageSrc(value: string): boolean {
  if (value.length > BLOG_LIMITS.image || !VISIBLE_ASCII.test(value)) return false;
  if (MEDIA_SRC.test(value) || SITE_FILE.test(value)) return true;
  if (!value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

const text = (max: number) => z.string().trim().max(max);
const blockText = text(BLOG_LIMITS.blockText);
const imageSrc = z.string().trim().max(BLOG_LIMITS.image).refine(isAllowedImageSrc);

export const zBlogSlug = z.string().trim().min(1).max(BLOG_LIMITS.slug).regex(SLUG_PATTERN);

const BlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("lede"), text: blockText }).strict(),
  z.object({ type: z.literal("paragraph"), text: blockText }).strict(),
  z.object({ type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), text: blockText }).strict(),
  z
    .object({
      type: z.literal("list"),
      ordered: z.boolean().default(false),
      items: z.array(text(BLOG_LIMITS.listItem)).max(BLOG_LIMITS.listItems),
    })
    .strict(),
  z
    .object({
      type: z.literal("image"),
      src: imageSrc,
      alt: text(BLOG_LIMITS.imageAlt).default(""),
      caption: text(BLOG_LIMITS.imageCaption).default(""),
    })
    .strict(),
  z.object({ type: z.literal("quote"), text: blockText, author: text(BLOG_LIMITS.quoteAuthor).default("") }).strict(),
  z.object({ type: z.literal("callout"), text: blockText }).strict(),
  z.object({ type: z.literal("divider") }).strict(),
]);

const FIELDS = {
  title: z.string().trim().min(1).max(BLOG_LIMITS.title),
  excerpt: text(BLOG_LIMITS.excerpt),
  category: z.string().trim().min(1).max(BLOG_LIMITS.category),
  categoryLabel: text(BLOG_LIMITS.categoryLabel),
  // "" = no cover yet (a draft); publishing asks for one.
  image: z
    .string()
    .trim()
    .max(BLOG_LIMITS.image)
    .refine((value) => value === "" || isAllowedImageSrc(value)),
  coverAlt: text(BLOG_LIMITS.coverAlt),
  author: text(BLOG_LIMITS.author),
  readingMinutes: z.number().int().min(1).max(BLOG_LIMITS.readingMinutesMax).nullable(),
  seoTitle: text(BLOG_LIMITS.seoTitle),
  seoDescription: text(BLOG_LIMITS.seoDescription),
  tags: z.array(z.string().trim().min(1).max(BLOG_LIMITS.tag)).max(BLOG_LIMITS.tags),
  blocks: z.array(BlockSchema).max(BLOG_LIMITS.blocks),
};

export const BlogPatchSchema = z.object(FIELDS).partial().strict();
export type BlogPatch = z.infer<typeof BlogPatchSchema>;

export const BlogCreateSchema = z
  .object(FIELDS)
  .partial()
  .extend({ title: FIELDS.title, slug: zBlogSlug.optional() })
  .strict();
export type BlogCreate = z.infer<typeof BlogCreateSchema>;

export const BlogPublishSchema = z.object({ at: z.iso.datetime({ offset: true }).optional() }).strict();
export const BlogSlugSchema = z.object({ slug: zBlogSlug }).strict();
export const BlogReorderSchema = z.object({ id: zBlogSlug, beforeId: zBlogSlug.nullable() }).strict();

// 200 blocks of 5000 characters do not fit the default 64 KB of a body.
export const BLOG_BODY_MAX_BYTES = 1024 * 1024;

type Issue = z.ZodError["issues"][number];

function reasonOf(issue: Issue): BlogFieldReason {
  if (issue.code === "too_big") return issue.origin === "array" ? "too-many" : "too-long";
  if (issue.code === "too_small") return "required";
  if (issue.code === "invalid_type" && /received undefined/.test(issue.message)) return "required";
  return "invalid";
}

// readJson + a schema, like parseBody, but a value that does not fit is
// answered with 400 "fields" naming it ({ fields: { "blocks.3.src":
// "invalid" } }), so the editor can point at it. A body that is not even
// an object of known keys stays a plain 400 "bad-request". Shared by the
// materials routes.
export async function parseFields<T>(request: Request, schema: ZodType<T>, maxBytes?: number): Promise<T> {
  const parsed = schema.safeParse(await readJson(request, maxBytes));
  if (parsed.success) return parsed.data;
  const fields: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    if (issue.path.length === 0 || issue.code === "unrecognized_keys") throw new HttpError(400, "bad-request");
    const key = issue.path.map(String).join(".");
    fields[key] ??= reasonOf(issue);
  }
  throw new HttpError(400, "fields", { fields });
}

function fieldError(fields: Record<string, BlogFieldReason>): HttpError {
  return new HttpError(400, "fields", { fields });
}

// An id from the address bar: a well-formed slug, or 404.
export function blogIdParam(raw: string): string {
  const parsed = zBlogSlug.safeParse(raw);
  if (!parsed.success) notFound();
  return parsed.data;
}

function assertFreeSlug(slug: string): void {
  if ((BLOG_RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase())) throw fieldError({ slug: "reserved" });
}

// --- the two bodies ---------------------------------------------------------

// The text without the inline mark-up (**bold**, *italic*, [label](url)):
// the classic renderer prints plain text.
export function plainText(value: string): string {
  return value
    .replace(/\[([^\]]*)\]\(([^)\s]*)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// The classic body of the article page, derived from the blocks:
// - intro: the first lede, or else the first paragraph;
// - listSection: the first list, with the heading right before it as its
//   heading (that heading then is not a section of its own);
// - sections: each level-2 heading with the text that follows it. Other
//   text blocks (level-3 headings, quotes, callouts, further lists) become
//   paragraphs of the section they sit in, so nothing typed is missing
//   from the classic view; text before the first heading forms a section
//   without a heading. Pictures and dividers have no classic form.
export function bodyFromBlocks(blocks: readonly BlogBlock[], tags: readonly string[]): BlogBody {
  const ledeIndex = blocks.findIndex((block) => block.type === "lede");
  const introIndex = ledeIndex >= 0 ? ledeIndex : blocks.findIndex((block) => block.type === "paragraph");
  const introBlock = introIndex >= 0 ? blocks[introIndex] : null;
  const intro = introBlock && "text" in introBlock ? plainText(introBlock.text) : "";

  const listIndex = blocks.findIndex((block) => block.type === "list");
  const listBlock = listIndex >= 0 ? blocks[listIndex] : null;
  const before = listIndex > 0 ? blocks[listIndex - 1] : null;
  const listHeadingIndex = before && before.type === "heading" && listIndex - 1 !== introIndex ? listIndex - 1 : -1;
  const listSection =
    listBlock && listBlock.type === "list"
      ? {
          heading: before && listHeadingIndex >= 0 && before.type === "heading" ? plainText(before.text) : "",
          items: listBlock.items.map(plainText).filter(Boolean),
        }
      : { heading: "", items: [] };

  const sections: BlogBody["sections"] = [];
  let current: BlogBody["sections"][number] | null = null;
  const push = (value: string) => {
    const clean = plainText(value);
    if (!clean) return;
    if (!current) {
      current = { heading: "", paragraphs: [] };
      sections.push(current);
    }
    current.paragraphs.push(clean);
  };

  blocks.forEach((block, index) => {
    if (index === introIndex || index === listIndex || index === listHeadingIndex) return;
    switch (block.type) {
      case "heading": {
        const heading = plainText(block.text);
        if (block.level === 2 && heading) {
          current = { heading, paragraphs: [] };
          sections.push(current);
        } else {
          push(block.text);
        }
        break;
      }
      case "lede":
      case "paragraph":
      case "callout":
        push(block.text);
        break;
      case "quote":
        push(block.author.trim() ? `${block.text} - ${block.author}` : block.text);
        break;
      case "list":
        block.items.forEach(push);
        break;
      default:
        break;
    }
  });

  return { intro, sections, listSection, tags: [...tags] };
}

// The blocks of a classic body, for the editor: the intro as the lede,
// each section as a level-2 heading with its paragraphs, the list section
// as a heading with an unordered list (when it has items).
export function blocksFromBody(body: BlogBody | null | undefined): BlogBlock[] {
  if (!body) return [];
  const blocks: BlogBlock[] = [];
  if (body.intro.trim()) blocks.push({ type: "lede", text: body.intro });
  for (const section of body.sections) {
    if (section.heading.trim()) blocks.push({ type: "heading", level: 2, text: section.heading });
    for (const paragraph of section.paragraphs) blocks.push({ type: "paragraph", text: paragraph });
  }
  if (body.listSection.items.length > 0) {
    if (body.listSection.heading.trim()) blocks.push({ type: "heading", level: 2, text: body.listSection.heading });
    blocks.push({ type: "list", ordered: false, items: [...body.listSection.items] });
  }
  return blocks;
}

function wordsOf(value: string): number {
  const clean = plainText(value);
  return clean ? clean.split(" ").length : 0;
}

// Minutes to read the blocks at BLOG_WORDS_PER_MINUTE, at least 1.
export function readingMinutesOf(blocks: readonly BlogBlock[]): number {
  let words = 0;
  for (const block of blocks) {
    if (block.type === "list") for (const item of block.items) words += wordsOf(item);
    else if (block.type === "image") words += wordsOf(block.caption);
    else if (block.type !== "divider") words += wordsOf(block.text);
  }
  return Math.max(1, Math.ceil(words / BLOG_WORDS_PER_MINUTE));
}

function hasText(blocks: readonly BlogBlock[]): boolean {
  return blocks.some((block) => {
    if (block.type === "list") return block.items.some((item) => item.trim() !== "");
    if (block.type === "image" || block.type === "divider") return false;
    return block.text.trim() !== "";
  });
}

function copyBlock(block: BlogBlock): BlogBlockDto {
  switch (block.type) {
    case "list":
      return { type: "list", ordered: block.ordered === true, items: [...block.items] };
    case "heading":
      return { type: "heading", level: block.level === 3 ? 3 : 2, text: block.text };
    case "image":
      return { type: "image", src: block.src, alt: block.alt ?? "", caption: block.caption ?? "" };
    case "quote":
      return { type: "quote", text: block.text, author: block.author ?? "" };
    case "divider":
      return { type: "divider" };
    default:
      return { type: block.type, text: block.text };
  }
}

const EMPTY_BODY: BlogBody = { intro: "", sections: [], listSection: { heading: "", items: [] }, tags: [] };

function copyBody(body: BlogBody | null | undefined): BlogBodyDto {
  const source = body ?? EMPTY_BODY;
  return {
    intro: source.intro,
    sections: source.sections.map((section) => ({ heading: section.heading, paragraphs: [...section.paragraphs] })),
    listSection: { heading: source.listSection.heading, items: [...source.listSection.items] },
    tags: [...source.tags],
  };
}

function cleanTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

// --- status -------------------------------------------------------------------

type StatusFields = Pick<BlogPostDoc, "status" | "publishedAt">;

// Same rule as publicBlogFilter of the storefront.
export function isPublicPost(doc: StatusFields, now: Date = new Date()): boolean {
  if (doc.status === undefined || doc.status === "published") return true;
  return doc.status === "scheduled" && doc.publishedAt instanceof Date && doc.publishedAt.getTime() <= now.getTime();
}

export function effectiveStatus(doc: StatusFields, now: Date = new Date()): BlogEffectiveStatus {
  if (isPublicPost(doc, now)) return "published";
  return doc.status === "scheduled" ? "scheduled" : "draft";
}

function statusFilter(status: BlogEffectiveStatus, now: Date): Filter<BlogPostDoc> {
  if (status === "published") return publicBlogFilter(now);
  if (status === "scheduled") return { status: "scheduled", publishedAt: { $not: { $lte: now } } };
  return { status: { $exists: true, $nin: ["published", "scheduled"] } };
}

// --- answers ------------------------------------------------------------------

function iso(value: Date | null | undefined): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

// The old addresses a post keeps (never its current one).
function oldSlugsOf(doc: Pick<BlogPostDoc, "_id" | "previousSlugs">): string[] {
  return [...new Set(doc.previousSlugs ?? [])].filter((slug) => typeof slug === "string" && slug !== "" && slug !== doc._id);
}

function toRow(doc: BlogPostDoc, now: Date): BlogPostRow {
  return {
    id: doc._id,
    title: doc.title,
    category: doc.category ?? "",
    categoryLabel: doc.categoryLabel ?? "",
    image: doc.image ?? "",
    status: effectiveStatus(doc, now),
    publishedAt: iso(doc.publishedAt),
    updatedAt: iso(doc.updatedAt),
    author: doc.author ?? "",
    sort: doc.sort,
    seed: doc.seed === true,
    href: `/blog/${doc._id}`,
  };
}

export async function toBlogPostDetail(doc: BlogPostDoc): Promise<BlogPostDetail> {
  const now = new Date();
  const stored = Array.isArray(doc.blocks) ? doc.blocks : null;
  const blocks = stored ?? blocksFromBody(doc.body);
  const editor = doc.updatedBy ? await findStaff(doc.updatedBy) : null;
  return {
    ...toRow(doc, now),
    excerpt: doc.excerpt ?? "",
    coverAlt: doc.coverAlt ?? "",
    readingMinutes: typeof doc.readingMinutes === "number" ? doc.readingMinutes : null,
    readingMinutesAuto: readingMinutesOf(blocks),
    seoTitle: doc.seoTitle ?? "",
    seoDescription: doc.seoDescription ?? "",
    tags: [...(doc.body?.tags ?? [])],
    blocks: blocks.map(copyBlock),
    blocksFrom: stored ? "blocks" : "body",
    body: copyBody(doc.body),
    storedStatus: doc.status ?? null,
    isPublic: isPublicPost(doc, now),
    previousSlugs: oldSlugsOf(doc),
    createdAt: iso(doc.createdAt),
    updatedBy: doc.updatedBy ? { id: doc.updatedBy, name: editor?.name ?? "" } : null,
  };
}

// --- reads --------------------------------------------------------------------

// The settings the editor offers, plus every old address a post keeps (a
// handful: one per rename of a public post), so the address dialog can say
// before the save that an address it is given redirects to another post.
export async function blogOptions(): Promise<BlogOptions> {
  const [settings, renamed] = await Promise.all([
    getSettings("blog"),
    (await collection("blogPosts"))
      .find({ previousSlugs: { $exists: true } }, { projection: { _id: 1, title: 1, previousSlugs: 1, status: 1, publishedAt: 1 } })
      .toArray(),
  ]);
  const now = new Date();
  const oldAddresses: BlogOldAddress[] = renamed
    .flatMap((doc) =>
      oldSlugsOf(doc).map((slug) => ({ slug, postId: doc._id, title: doc.title ?? "", isPublic: isPublicPost(doc, now) })),
    )
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return { categories: [...settings.categories], defaultAuthor: settings.defaultAuthor, oldAddresses };
}

const STATUSES: readonly BlogEffectiveStatus[] = ["draft", "scheduled", "published"];

function andOf(parts: Filter<BlogPostDoc>[]): Filter<BlogPostDoc> {
  return parts.length > 0 ? { $and: parts } : {};
}

// The list page plus what its status tabs show: `counts` per status under
// the same search and category (the tabs preview what pressing them gives)
// and `overall`, every post of the blog (the total of the page head).
export async function listBlogPosts(
  url: URL,
): Promise<Page<BlogPostRow> & { counts: BlogStatusCounts; overall: number }> {
  const query = listQuery(url, { sortable: BLOG_SORTS, defaultSort: "sort", defaultLimit: 50 });
  const now = new Date();
  const base: Filter<BlogPostDoc>[] = [];
  const category = (query.params.get("category") ?? "").trim();
  if (category && category.length <= BLOG_LIMITS.category) base.push({ category });
  if (query.q) base.push({ $or: [{ title: contains(query.q) }, { _id: contains(query.q) }] });
  const status = oneOf(query.params, "status", STATUSES);
  const filter = andOf(status ? [...base, statusFilter(status, now)] : base);
  const posts = await collection("blogPosts");
  // Titles sort the Ukrainian way (alphabet order, case ignored); the other
  // sorts keep the plain index-friendly order.
  const byTitle = query.sortKey.replace(/^-/, "") === "title";
  const [page, all, draft, scheduled, published, overall] = await Promise.all([
    paginate(posts, filter, query, {
      projection: { body: 0, blocks: 0 },
      map: (doc) => toRow(doc, now),
      ...(byTitle ? { collation: UK_COLLATION } : {}),
    }),
    posts.countDocuments(andOf(base)),
    posts.countDocuments(andOf([...base, statusFilter("draft", now)])),
    posts.countDocuments(andOf([...base, statusFilter("scheduled", now)])),
    posts.countDocuments(andOf([...base, statusFilter("published", now)])),
    base.length > 0 ? posts.countDocuments({}) : Promise.resolve(-1),
  ]);
  return { ...page, counts: { all, draft, scheduled, published }, overall: overall < 0 ? all : overall };
}

export async function findBlogPost(id: string): Promise<BlogPostDoc | null> {
  return (await collection("blogPosts")).findOne({ _id: id });
}

async function requirePost(id: string): Promise<BlogPostDoc> {
  const doc = await findBlogPost(id);
  if (!doc) notFound();
  return doc;
}

async function firstSort(): Promise<number> {
  const [first] = await (await collection("blogPosts"))
    .find({}, { projection: { sort: 1 } })
    .sort({ sort: 1, _id: 1 })
    .limit(1)
    .toArray();
  return first ? Math.floor(first.sort) - 1 : 0;
}

async function assertCategory(category: string): Promise<void> {
  const { categories } = await getSettings("blog");
  if (!categories.includes(category)) throw fieldError({ category: "unknown" });
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

// --- writes -------------------------------------------------------------------

export type BlogWrite = { before: BlogPostDoc | null; after: BlogPostDoc };

// Whether the public blog has to be refreshed after a write.
export function touchesPublic(write: { before: StatusFields | null; after: StatusFields | null }): boolean {
  return (write.before !== null && isPublicPost(write.before)) || (write.after !== null && isPublicPost(write.after));
}

// A new draft. Slug from the title unless given; the first category of
// the settings and the default author unless given; first in the list.
export async function createBlogPost(input: BlogCreate, staff: StaffContext): Promise<BlogPostDoc> {
  const settings = await getSettings("blog");
  const slug = input.slug ?? slugify(input.title);
  if (!slug) throw fieldError({ slug: "required" });
  assertFreeSlug(slug);
  if (input.category !== undefined) await assertCategory(input.category);
  const category = input.category ?? settings.categories[0] ?? "";
  const blocks: BlogBlock[] = input.blocks ?? [];
  const tags = cleanTags(input.tags ?? []);
  const now = new Date();
  const doc: BlogPostDoc = {
    _id: slug,
    title: input.title,
    excerpt: input.excerpt ?? "",
    category,
    categoryLabel: input.categoryLabel || category,
    image: input.image ?? "",
    sort: await firstSort(),
    body: bodyFromBlocks(blocks, tags),
    blocks,
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    updatedBy: staff.staff._id,
    author: input.author || settings.defaultAuthor,
    readingMinutes: input.readingMinutes ?? readingMinutesOf(blocks),
    coverAlt: input.coverAlt ?? "",
    seoTitle: input.seoTitle ?? "",
    seoDescription: input.seoDescription ?? "",
  };
  try {
    await (await collection("blogPosts")).insertOne(doc);
  } catch (error) {
    if (isDuplicateKey(error)) throw new HttpError(409, "exists", { field: "slug" });
    throw error;
  }
  return doc;
}

export async function updateBlogPost(id: string, patch: BlogPatch, staff: StaffContext): Promise<BlogWrite> {
  const before = await requirePost(id);
  if (patch.category !== undefined) await assertCategory(patch.category);

  const set: Partial<BlogPostDoc> = { updatedAt: new Date(), updatedBy: staff.staff._id };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.excerpt !== undefined) set.excerpt = patch.excerpt;
  if (patch.image !== undefined) set.image = patch.image;
  if (patch.coverAlt !== undefined) set.coverAlt = patch.coverAlt;
  if (patch.author !== undefined) set.author = patch.author;
  if (patch.seoTitle !== undefined) set.seoTitle = patch.seoTitle;
  if (patch.seoDescription !== undefined) set.seoDescription = patch.seoDescription;
  if (patch.category !== undefined) {
    set.category = patch.category;
    // A label that only repeated the old category follows the new one.
    if (patch.categoryLabel === undefined && (!before.categoryLabel || before.categoryLabel === before.category)) {
      set.categoryLabel = patch.category;
    }
  }
  if (patch.categoryLabel !== undefined) set.categoryLabel = patch.categoryLabel || (patch.category ?? before.category);

  const tags = patch.tags !== undefined ? cleanTags(patch.tags) : [...(before.body?.tags ?? [])];
  if (patch.blocks !== undefined) {
    set.blocks = patch.blocks;
    set.body = bodyFromBlocks(patch.blocks, tags);
  } else if (patch.tags !== undefined) {
    set.body = { ...copyBody(before.body), tags };
  }
  // Left out (or null) = counted from the text as it is after this save.
  const blocks = patch.blocks ?? before.blocks ?? blocksFromBody(before.body);
  set.readingMinutes = patch.readingMinutes ?? readingMinutesOf(blocks);

  const after = await (await collection("blogPosts")).findOneAndUpdate(
    { _id: id },
    { $set: set, $unset: { seed: "" } },
    { returnDocument: "after" },
  );
  if (!after) notFound();
  return { before, after };
}

// Publishes now, at a past moment, or schedules for a future one. A post
// goes public only with a title, an excerpt, a cover and some text.
export async function publishBlogPost(id: string, at: string | undefined, staff: StaffContext): Promise<BlogWrite> {
  const before = await requirePost(id);
  const missing: Record<string, BlogFieldReason> = {};
  if (!before.title?.trim()) missing.title = "required";
  if (!before.excerpt?.trim()) missing.excerpt = "required";
  if (!before.image?.trim()) missing.image = "required";
  if (!hasText(before.blocks ?? blocksFromBody(before.body))) missing.blocks = "required";
  if (Object.keys(missing).length > 0) throw fieldError(missing);

  const now = new Date();
  let publishedAt: Date;
  if (at !== undefined) publishedAt = new Date(at);
  else publishedAt = isPublicPost(before, now) && before.publishedAt instanceof Date ? before.publishedAt : now;
  // A moment a few seconds ahead is "now" typed by a slow hand, not a plan.
  const scheduled = publishedAt.getTime() > now.getTime() + 30_000;
  if (!scheduled && publishedAt.getTime() > now.getTime()) publishedAt = now;

  const after = await (await collection("blogPosts")).findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: scheduled ? "scheduled" : "published",
        publishedAt,
        updatedAt: now,
        updatedBy: staff.staff._id,
      },
      $unset: { seed: "" },
    },
    { returnDocument: "after" },
  );
  if (!after) notFound();
  return { before, after };
}

// Back to a draft: off the site at once.
export async function unpublishBlogPost(id: string, staff: StaffContext): Promise<BlogWrite> {
  const before = await requirePost(id);
  const after = await (await collection("blogPosts")).findOneAndUpdate(
    { _id: id },
    {
      $set: { status: "draft", publishedAt: null, updatedAt: new Date(), updatedBy: staff.staff._id },
      $unset: { seed: "" },
    },
    { returnDocument: "after" },
  );
  if (!after) notFound();
  return { before, after };
}

// --- old addresses ------------------------------------------------------------

// An address belongs to one post at a time: the post that now uses a slug
// (or now remembers `claimed` old addresses) takes them away from every
// other post's previousSlugs, so /blog/<old> can only ever redirect to one
// post. Bookkeeping only: no stamp, the other posts' content did not
// change. True when another post lost an address: the caller then
// refreshes the public blog (the cached read carries the old addresses),
// also after creating or copying a draft. The create and duplicate routes
// call it right after the insert; renameBlogPost calls it itself.
export async function releaseSlugs(ownerId: string, claimed: readonly string[]): Promise<boolean> {
  if (claimed.length === 0) return false;
  const posts = await collection("blogPosts");
  const pulled = await posts.updateMany(
    { _id: { $ne: ownerId }, previousSlugs: { $in: [...claimed] } },
    { $pull: { previousSlugs: { $in: [...claimed] } } },
  );
  if (pulled.modifiedCount === 0) return false;
  await posts.updateMany({ previousSlugs: { $size: 0 } }, { $unset: { previousSlugs: "" } });
  return true;
}

// The addresses a post keeps after moving from `from` to `to`: what it had,
// plus `from` when the post is public (an address visitors may have
// saved), never `to` itself (a rename back drops it) and never one that
// another post uses as its current address.
async function previousSlugsAfterRename(before: BlogPostDoc, from: string, to: string): Promise<string[]> {
  const candidates = [...new Set(before.previousSlugs ?? [])].filter((value) => value !== to && value !== from);
  const used =
    candidates.length > 0
      ? await (await collection("blogPosts")).find({ _id: { $in: candidates } }, { projection: { _id: 1 } }).toArray()
      : [];
  const taken = new Set(used.map((doc) => doc._id));
  const kept = candidates.filter((value) => !taken.has(value));
  return isPublicPost(before) ? [...kept, from] : kept;
}

// The slug is the id: the post is copied under the new id and the old one
// removed. Changing the address of a public post needs content.publish.
// The old address of a public post is remembered (previousSlugs), so the
// article page answers it with a permanent redirect to the new one.
export async function renameBlogPost(
  id: string,
  slug: string,
  staff: StaffContext,
): Promise<BlogWrite & { released: boolean }> {
  const before = await requirePost(id);
  if (isPublicPost(before)) assertCan(staff, "content.publish");
  if (slug === id) return { before, after: before, released: false };
  assertFreeSlug(slug);
  const posts = await collection("blogPosts");
  const { seed: _seed, previousSlugs: _previous, ...rest } = before;
  void _seed;
  void _previous;
  const previousSlugs = await previousSlugsAfterRename(before, id, slug);
  const after: BlogPostDoc = {
    ...rest,
    _id: slug,
    ...(previousSlugs.length > 0 ? { previousSlugs } : {}),
    updatedAt: new Date(),
    updatedBy: staff.staff._id,
  };
  try {
    await posts.insertOne(after);
  } catch (error) {
    if (isDuplicateKey(error)) throw new HttpError(409, "exists", { field: "slug" });
    throw error;
  }
  await posts.deleteOne({ _id: id });
  const released = await releaseSlugs(slug, [slug, ...previousSlugs]);
  return { before, after, released };
}

const COPY_SUFFIX = "-copy";

// A draft copy "<slug>-copy" ("-copy-2", ... when taken), first in the list.
export async function duplicateBlogPost(id: string, staff: StaffContext): Promise<BlogPostDoc> {
  const source = await requirePost(id);
  const posts = await collection("blogPosts");
  const candidates = Array.from({ length: 50 }, (_, index) => {
    const suffix = index === 0 ? COPY_SUFFIX : `${COPY_SUFFIX}-${index + 1}`;
    return `${id.slice(0, BLOG_LIMITS.slug - suffix.length).replace(/[-_]+$/, "")}${suffix}`;
  });
  const taken = new Set(
    (await posts.find({ _id: { $in: candidates } }, { projection: { _id: 1 } }).toArray()).map((doc) => doc._id),
  );
  const slug = candidates.find((candidate) => !taken.has(candidate));
  if (!slug) throw new HttpError(409, "exists", { field: "slug" });

  // The copy is a new article: the old addresses stay with the original.
  const { seed: _seed, previousSlugs: _previous, ...rest } = source;
  void _seed;
  void _previous;
  const now = new Date();
  const copy: BlogPostDoc = {
    ...rest,
    _id: slug,
    title: `${source.title} (копія)`.slice(0, BLOG_LIMITS.title),
    sort: await firstSort(),
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    updatedBy: staff.staff._id,
  };
  try {
    await posts.insertOne(copy);
  } catch (error) {
    if (isDuplicateKey(error)) throw new HttpError(409, "exists", { field: "slug" });
    throw error;
  }
  return copy;
}

// Moves a post right before another one (null = to the end). Only the
// moved post is written (its sort becomes a value between its new
// neighbours), so a reorder never takes the seed mark off other posts;
// the whole list is renumbered only when two neighbours share a value.
export async function reorderBlogPost(
  id: string,
  beforeId: string | null,
  staff: StaffContext,
): Promise<{ moved: BlogPostDoc; sort: number }> {
  const posts = await collection("blogPosts");
  const all = await posts
    .find({}, { projection: { _id: 1, sort: 1, status: 1, publishedAt: 1, title: 1 } })
    .sort({ sort: 1, _id: 1 })
    .toArray();
  const moved = all.find((doc) => doc._id === id);
  if (!moved) notFound();
  if (beforeId === id) return { moved, sort: moved.sort };

  const rest = all.filter((doc) => doc._id !== id);
  const index = beforeId === null ? rest.length : rest.findIndex((doc) => doc._id === beforeId);
  if (index < 0) throw fieldError({ beforeId: "unknown" });
  const prev = rest[index - 1];
  const next = rest[index];
  const now = new Date();
  const stamp = { updatedAt: now, updatedBy: staff.staff._id };

  let sort: number | null;
  if (!prev && !next) sort = moved.sort;
  else if (!prev) sort = Math.floor(next.sort) - 1;
  else if (!next) sort = Math.floor(prev.sort) + 1;
  else sort = next.sort - prev.sort > 1e-6 ? (prev.sort + next.sort) / 2 : null;

  if (sort !== null) {
    await posts.updateOne({ _id: id }, { $set: { sort, ...stamp }, $unset: { seed: "" } });
    return { moved, sort };
  }

  const ordered = [...rest.slice(0, index), moved, ...rest.slice(index)];
  const writes: AnyBulkWriteOperation<BlogPostDoc>[] = [];
  ordered.forEach((doc, position) => {
    if (doc.sort !== position || doc._id === id) {
      writes.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { sort: position, ...stamp }, $unset: { seed: "" } } } });
    }
  });
  if (writes.length > 0) await posts.bulkWrite(writes, { ordered: false });
  return { moved, sort: ordered.findIndex((doc) => doc._id === id) };
}

// Removing a public post takes it off the site: that needs content.publish.
export async function deleteBlogPost(id: string, staff: StaffContext): Promise<BlogPostDoc> {
  const doc = await requirePost(id);
  if (isPublicPost(doc)) assertCan(staff, "content.publish");
  await (await collection("blogPosts")).deleteOne({ _id: id });
  return doc;
}
