// The blog editor's own model: the form as one object, the article body
// as one array of blocks with stable local keys, and the pure helpers the
// screens share (what the API receives, what is still missing before a
// post may go public, the reading time). No React, no server import.

import {
  BLOG_WORDS_PER_MINUTE,
  type BlogBlockDto,
  type BlogFieldReason,
  type BlogOptions,
  type BlogPostDetail,
  type BlogPostFieldsInput,
} from "./types";

// A block of the editor: the block itself and a key that stays with it
// while it moves, so React keeps its fields (and their focus) in place.
export type EditorBlock = { key: string; block: BlogBlockDto };

export type EditorForm = {
  title: string;
  excerpt: string;
  category: string;
  // "" = the card shows the category itself.
  categoryLabel: string;
  image: string;
  coverAlt: string;
  // "" = the site shows the default author.
  author: string;
  // null = counted from the text.
  readingMinutes: number | null;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  blocks: EditorBlock[];
};

// Keys of blocks added while editing. Called from event handlers only:
// a render never makes a key.
let sequence = 0;
export function newBlockKey(): string {
  sequence += 1;
  return `n${sequence}`;
}

// Loaded blocks get keys from their position at load time ("p0", "p1"...):
// deterministic, and they stay with the block afterwards.
function keyed(blocks: readonly BlogBlockDto[], prefix: string): EditorBlock[] {
  return blocks.map((block, index) => ({ key: `${prefix}${index}`, block: copyBlock(block) }));
}

export function copyBlock(block: BlogBlockDto): BlogBlockDto {
  switch (block.type) {
    case "list":
      return { type: "list", ordered: block.ordered, items: [...block.items] };
    case "heading":
      return { type: "heading", level: block.level, text: block.text };
    case "image":
      return { type: "image", src: block.src, alt: block.alt, caption: block.caption };
    case "quote":
      return { type: "quote", text: block.text, author: block.author };
    case "divider":
      return { type: "divider" };
    default:
      return { type: block.type, text: block.text };
  }
}

// The kinds a writer picks from the "add block" menu (a heading level and
// a list style are kinds of their own there).
export type BlockKind =
  | "lede"
  | "paragraph"
  | "heading2"
  | "heading3"
  | "bullets"
  | "numbers"
  | "image"
  | "quote"
  | "callout"
  | "divider";

export function blankBlock(kind: BlockKind): BlogBlockDto {
  switch (kind) {
    case "heading2":
      return { type: "heading", level: 2, text: "" };
    case "heading3":
      return { type: "heading", level: 3, text: "" };
    case "bullets":
      return { type: "list", ordered: false, items: [""] };
    case "numbers":
      return { type: "list", ordered: true, items: [""] };
    case "image":
      return { type: "image", src: "", alt: "", caption: "" };
    case "quote":
      return { type: "quote", text: "", author: "" };
    case "divider":
      return { type: "divider" };
    default:
      return { type: kind, text: "" };
  }
}

// What a block is called on screen.
export function blockLabel(block: BlogBlockDto): string {
  switch (block.type) {
    case "lede":
      return "Вступний абзац";
    case "paragraph":
      return "Абзац";
    case "heading":
      return "Заголовок";
    case "list":
      return block.ordered ? "Нумерований список" : "Маркований список";
    case "image":
      return "Зображення";
    case "quote":
      return "Цитата";
    case "callout":
      return "Виноска";
    case "divider":
      return "Розділювач";
  }
}

export function formFromPost(post: BlogPostDetail): EditorForm {
  return {
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    categoryLabel: post.categoryLabel === post.category ? "" : post.categoryLabel,
    image: post.image,
    coverAlt: post.coverAlt,
    author: post.author,
    // A stored number equal to the count of the text is the count itself.
    readingMinutes: post.readingMinutes !== null && post.readingMinutes !== post.readingMinutesAuto ? post.readingMinutes : null,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    tags: [...post.tags],
    blocks: keyed(post.blocks, "p"),
  };
}

// A new article starts with a lede and one paragraph.
export function emptyForm(options: BlogOptions | undefined): EditorForm {
  return {
    title: "",
    excerpt: "",
    category: options?.categories[0] ?? "",
    categoryLabel: "",
    image: "",
    coverAlt: "",
    author: "",
    readingMinutes: null,
    seoTitle: "",
    seoDescription: "",
    tags: [],
    blocks: keyed([blankBlock("lede"), blankBlock("paragraph")], "p"),
  };
}

// The body the API takes (PATCH, and POST for a new post).
export function payloadOf(form: EditorForm): BlogPostFieldsInput {
  return {
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    category: form.category,
    categoryLabel: form.categoryLabel.trim(),
    image: form.image.trim(),
    coverAlt: form.coverAlt.trim(),
    author: form.author.trim(),
    readingMinutes: form.readingMinutes,
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim(),
    tags: form.tags,
    blocks: form.blocks.map((entry) => entry.block),
  };
}

// After a save: the server's version of the form, with the keys of the
// blocks that were on screen (same count and kinds = the same blocks), so
// nothing the writer is looking at is rebuilt.
export function mergeKeys(saved: EditorForm, current: EditorForm): EditorForm {
  const same =
    saved.blocks.length === current.blocks.length &&
    saved.blocks.every((entry, index) => entry.block.type === current.blocks[index].block.type);
  if (!same) return saved;
  return { ...saved, blocks: saved.blocks.map((entry, index) => ({ ...entry, key: current.blocks[index].key })) };
}

// --- text -----------------------------------------------------------------------

// The text without the inline mark-up, as the server counts it.
export function plainText(value: string): string {
  return value
    .replace(/\[([^\]]*)\]\(([^)\s]*)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function wordsOf(value: string): number {
  const clean = plainText(value);
  return clean ? clean.split(" ").length : 0;
}

// Minutes to read, the same count the server makes (BLOG_WORDS_PER_MINUTE,
// at least 1).
export function readingMinutesOf(blocks: readonly EditorBlock[]): number {
  let words = 0;
  for (const { block } of blocks) {
    if (block.type === "list") for (const item of block.items) words += wordsOf(item);
    else if (block.type === "image") words += wordsOf(block.caption);
    else if (block.type !== "divider") words += wordsOf(block.text);
  }
  return Math.max(1, Math.ceil(words / BLOG_WORDS_PER_MINUTE));
}

export function hasText(blocks: readonly EditorBlock[]): boolean {
  return blocks.some(({ block }) => {
    if (block.type === "list") return block.items.some((item) => item.trim() !== "");
    if (block.type === "image" || block.type === "divider") return false;
    return block.text.trim() !== "";
  });
}

// --- publishing -------------------------------------------------------------------

// What a post needs to go public, in the server's words (the 400 "fields"
// answer of /publish names the same four keys).
export const PUBLISH_NEEDS = [
  { key: "title", label: "Заголовок" },
  { key: "excerpt", label: "Вступ для картки" },
  { key: "image", label: "Обкладинка" },
  { key: "blocks", label: "Текст статті" },
] as const;

export type PublishNeed = (typeof PUBLISH_NEEDS)[number]["key"];

export function missingForPublish(form: EditorForm): PublishNeed[] {
  const missing: PublishNeed[] = [];
  if (!form.title.trim()) missing.push("title");
  if (!form.excerpt.trim()) missing.push("excerpt");
  if (!form.image.trim()) missing.push("image");
  if (!hasText(form.blocks)) missing.push("blocks");
  return missing;
}

// "обкладинку, текст статті": the missing parts as a phrase for a toast.
export function needsPhrase(keys: readonly string[]): string {
  const words: Record<string, string> = { title: "заголовок", excerpt: "вступ для картки", image: "обкладинку", blocks: "текст статті" };
  return keys.map((key) => words[key] ?? key).join(", ");
}

// --- field errors -------------------------------------------------------------------

export type FieldErrors = Record<string, string>;

const REASON_TEXT: Record<BlogFieldReason, string> = {
  required: "Заповніть це поле.",
  invalid: "Значення не підходить.",
  "too-long": "Задовге значення.",
  "too-many": "Забагато значень.",
  unknown: "Такого значення немає в списку.",
  reserved: "Ця адреса зайнята службовою сторінкою.",
};

// The { fields } of a 400 answer as sentences, with wording that names
// the place where a generic one would not help.
export function fieldErrorsOf(fields: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (!fields || typeof fields !== "object") return out;
  for (const [key, raw] of Object.entries(fields as Record<string, unknown>)) {
    const reason = (typeof raw === "string" ? raw : "invalid") as BlogFieldReason;
    let text = REASON_TEXT[reason] ?? REASON_TEXT.invalid;
    if (key === "title" && reason === "required") text = "Напишіть заголовок статті.";
    if (key === "excerpt" && reason === "required") text = "Напишіть короткий вступ: його видно на картці статті.";
    if (key === "image" && reason === "required") text = "Додайте обкладинку.";
    if (key === "image" && reason === "invalid") text = "Зображення має бути з медіатеки або за адресою https://.";
    if (key === "blocks" && reason === "required") text = "Напишіть текст статті: хоча б один абзац.";
    if (/^blocks\.\d+\.src$/.test(key)) text = reason === "invalid" ? "Додайте зображення або видаліть цей блок." : text;
    if (key.startsWith("tags")) text = reason === "too-many" ? "Не більше 12 тегів." : "Тег до 40 символів.";
    if (key === "slug" && reason === "invalid") text = "Лише латинські літери, цифри та дефіс, без пробілів.";
    if (key === "slug" && reason === "required") text = "Вкажіть адресу.";
    out[key] = text;
  }
  return out;
}

// Errors of the form found before a request: the title and pictures that
// were never chosen (the server would refuse both).
export function localErrors(form: EditorForm): FieldErrors {
  const out: FieldErrors = {};
  if (!form.title.trim()) out.title = "Напишіть заголовок статті.";
  form.blocks.forEach(({ block }, index) => {
    if (block.type === "image" && !block.src.trim()) out[`blocks.${index}.src`] = "Додайте зображення або видаліть цей блок.";
  });
  return out;
}

// The first error of block `index` ("blocks.3", "blocks.3.text" ...).
export function blockError(errors: FieldErrors, index: number): string | undefined {
  const prefix = `blocks.${index}`;
  const key = Object.keys(errors).find((name) => name === prefix || name.startsWith(`${prefix}.`));
  return key ? errors[key] : undefined;
}
