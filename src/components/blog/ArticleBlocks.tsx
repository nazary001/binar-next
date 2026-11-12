/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

// The article body written in the admin panel's block editor, in the type
// of the classic article (ArticleBody.tsx). It is the one renderer of
// blocks: the article page uses it, and so does the editor's preview
// (src/components/admin/blog/ArticlePreview.tsx), so the two can never
// drift apart. No hooks and no server import: it renders on the server
// (the page) and in the browser (the preview).
//
// Structure. The classic body is a column of groups 48 px apart (40 at
// lg): the lede, then each section (an H2 with its text 16 px below it).
// Blocks are grouped the same way: a lede is a group, a level-2 heading
// opens a section, the blocks after it form the section's flow, and text
// before the first heading forms a section without one. A divider closes
// the section it ends and sits between groups. Inside a flow the spacing
// is the classic one (20 / 24 px between paragraphs and lists, a list
// right under the heading 36 / 40 px down), so a post converted from the
// classic body renders pixel for pixel like the classic page. Shapes the
// classic body never had (level-3 headings, numbered lists, figures,
// quotes, callouts, dividers) take more air (32 / 40 px) and reuse the
// page's materials: the bg-subtle rounded card of the sidebar CTA, the
// #d2d2d2 hairline of the card grid, the orange of the category label.
//
// Text carries three inline marks and nothing else: **bold**, *italic* and
// [label](address). They are parsed into React nodes here; no HTML passes
// through (React escapes every string). A link renders only for an http(s)
// address or a path of this site; any other target shows its label as
// plain text.

// The block of the database (BlogBlock in src/server/db/collections.ts),
// plus the pixel size of an uploaded picture when the server knows it.
export type ArticleBlock =
  | { type: "lede"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; src: string; alt: string; caption: string; width?: number | null; height?: number | null }
  | { type: "quote"; text: string; author: string }
  | { type: "callout"; text: string }
  | { type: "divider" };

// --- inline marks ---------------------------------------------------------------

// **bold** | *italic* | [label](target). Bold may hold an italic run and a
// link; a link's label may hold bold or italic, never another link.
const MARK = /\*\*((?:(?!\*\*)[\s\S])+?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
const BLANK_OR_CONTROL = /[\s\x00-\x1f\x7f]/;
// A path is judged by where a browser would resolve it.
const SITE = "http://site.invalid";

type SafeLink = { href: string; external: boolean };

// An http(s) address with a host (and no credentials), or a path of this
// site ("/catalog"; never "//host" or "/\host", which browsers send to
// another host). Everything else (javascript:, data:, mailto:, relative
// words) is refused. An address typed in plain ASCII is kept as typed; one
// with other characters (a Cyrillic path or domain) takes the URL parser's
// percent-encoded spelling.
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;

export function safeArticleLink(raw: string): SafeLink | null {
  if (raw === "" || BLANK_OR_CONTROL.test(raw)) return null;
  const ascii = VISIBLE_ASCII.test(raw);
  try {
    if (raw.startsWith("/")) {
      if (/^\/[/\\]/.test(raw)) return null;
      const url = new URL(raw, SITE);
      if (url.origin !== SITE) return null;
      return { href: ascii ? raw : `${url.pathname}${url.search}${url.hash}`, external: false };
    }
    if (!/^https?:\/\//i.test(raw)) return null;
    const url = new URL(raw);
    const web = url.protocol === "http:" || url.protocol === "https:";
    if (!web || !url.hostname || url.username || url.password) return null;
    return { href: ascii ? raw : url.href, external: true };
  } catch {
    return null;
  }
}

type InlineOptions = { links: boolean; newTab: boolean };

function inline(text: string, key: string, options: InlineOptions): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(MARK)) {
    const start = match.index ?? 0;
    const whole = match[0];
    const isLink = match[3] !== undefined;
    // A link inside a link label stays text (an <a> never nests).
    if (isLink && !options.links) continue;
    if (start > last) out.push(text.slice(last, start));
    const id = `${key}-${index}`;
    index += 1;
    if (match[1] !== undefined) {
      out.push(
        <strong key={id} className="font-bold">
          {inline(match[1], id, options)}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      out.push(<em key={id}>{inline(match[2], id, options)}</em>);
    } else {
      const label = inline(match[3] ?? "", id, { ...options, links: false });
      const link = safeArticleLink(match[4] ?? "");
      if (!link) {
        out.push(...label);
      } else {
        const newTab = link.external || options.newTab;
        out.push(
          <a
            key={id}
            href={link.href}
            {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="underline decoration-1 underline-offset-[3px] transition-colors duration-200 hover:text-brand"
          >
            {label}
          </a>,
        );
      }
    }
    last = start + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// The marks of one text as React nodes. `newTab` also opens site paths in
// a new tab (the editor's preview must not navigate the panel away).
export function renderInline(text: string, key = "m", newTab = false): ReactNode[] {
  return inline(text, key, { links: true, newTab });
}

// --- pictures -----------------------------------------------------------------

const MEDIA_SRC = /^\/api\/media\/[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

// Where an article picture may load from: an upload served by
// /api/media/<id>, a file of the site (a path), or an https address. A
// "media:<id>" reference or any other scheme never reaches an <img>.
export function safeImageSrc(src: string): string | null {
  const value = src.trim();
  if (MEDIA_SRC.test(value)) return value;
  const link = safeArticleLink(value);
  if (!link) return null;
  return !link.external || /^https:\/\//i.test(link.href) ? link.href : null;
}

// --- grouping -----------------------------------------------------------------

type FlowBlock = Exclude<ArticleBlock, { type: "lede" } | { type: "divider" }>;

type Group =
  | { kind: "lede"; text: string }
  | { kind: "divider" }
  | { kind: "section"; heading: string | null; flow: FlowBlock[] };

// Blocks with nothing to show are left out, as the classic page leaves
// empty fields out.
function visible(block: ArticleBlock): ArticleBlock | null {
  switch (block.type) {
    case "divider":
      return block;
    case "image":
      return safeImageSrc(block.src) ? block : null;
    case "list": {
      const items = block.items.filter((item) => item.trim() !== "");
      return items.length > 0 ? { ...block, items } : null;
    }
    default:
      return block.text.trim() !== "" ? block : null;
  }
}

function groupsOf(blocks: readonly ArticleBlock[]): Group[] {
  const groups: Group[] = [];
  let section: Extract<Group, { kind: "section" }> | null = null;
  for (const raw of blocks) {
    const block = visible(raw);
    if (!block) continue;
    if (block.type === "lede") {
      groups.push({ kind: "lede", text: block.text });
      section = null;
    } else if (block.type === "divider") {
      // Two dividers in a row (or one at the very start) draw one line.
      if (groups.length > 0 && groups[groups.length - 1].kind !== "divider") groups.push({ kind: "divider" });
      section = null;
    } else if (block.type === "heading" && block.level === 2) {
      section = { kind: "section", heading: block.text, flow: [] };
      groups.push(section);
    } else {
      if (!section) {
        section = { kind: "section", heading: null, flow: [] };
        groups.push(section);
      }
      section.flow.push(block);
    }
  }
  // A trailing divider separates nothing.
  while (groups.length > 0 && groups[groups.length - 1].kind === "divider") groups.pop();
  return groups;
}

// --- spacing inside a section -------------------------------------------------

type Kind = "text" | "list" | "subheading" | "box";

function kindOf(block: FlowBlock): Kind {
  if (block.type === "paragraph") return "text";
  if (block.type === "list") return "list";
  if (block.type === "heading") return "subheading";
  return "box";
}

// The space above a block of a section's flow (whole class literals, so
// Tailwind sees them). The first block under an H2 already sits 16 px
// below it (the section's gap-4).
function spaceAbove(prev: Kind | null, current: Kind, underHeading: boolean): string {
  if (prev === null) {
    if (!underHeading) return "";
    // The classic list section: its list text opens with an empty line.
    if (current === "list") return "max-lg:mt-5 lg:mt-6";
    if (current === "box") return "mt-2 lg:mt-4";
    return "";
  }
  if (current === "subheading") return "mt-8 lg:mt-10";
  if (prev === "subheading") return current === "box" ? "mt-4 lg:mt-6" : "mt-3 lg:mt-4";
  if (prev === "box" || current === "box") return "mt-8 lg:mt-10";
  return "mt-5 lg:mt-6";
}

// --- blocks -------------------------------------------------------------------

const LIST = "flex flex-col gap-5 ps-[21px] text-body-sm marker:text-neutral-900 lg:gap-6 lg:ps-6";

function FlowItem({ block, className, id, newTab }: { block: FlowBlock; className: string; id: string; newTab: boolean }) {
  const marks = (text: string, key = id) => renderInline(text, key, newTab);
  switch (block.type) {
    case "paragraph":
      return <p className={`text-body-sm ${className}`}>{marks(block.text)}</p>;
    case "heading":
      // Level 3 (level 2 opens a section and never reaches a flow).
      return (
        <h3 className={`text-[18px] font-semibold leading-6 tracking-[-0.02em] text-neutral-900 lg:text-[20px] lg:leading-[26px] ${className}`}>
          {marks(block.text)}
        </h3>
      );
    case "list":
      return block.ordered ? (
        <ol className={`list-decimal ${LIST} ${className}`}>
          {block.items.map((item, i) => (
            <li key={i}>{marks(item, `${id}-${i}`)}</li>
          ))}
        </ol>
      ) : (
        <ul className={`list-disc ${LIST} ${className}`}>
          {block.items.map((item, i) => (
            <li key={i}>{marks(item, `${id}-${i}`)}</li>
          ))}
        </ul>
      );
    case "image": {
      // The cover's corners. A picture is shown at its own size and never
      // stretched past it (a small upload would turn blurry): its width is
      // the upload's pixel width (the width attribute) or, when the size is
      // unknown, its natural width, capped by the column (max-w-full), and
      // it sits at the start of the column instead of being stretched by
      // the flex column. A tall (portrait) picture never fills a whole
      // screen: an upload (size known) is cropped to the column's
      // comfortable height, a picture of unknown size is scaled down whole
      // to that height.
      const src = safeImageSrc(block.src) ?? "";
      const sized = typeof block.width === "number" && typeof block.height === "number" && block.width > 0 && block.height > 0;
      return (
        <figure className={`flex flex-col gap-3 lg:gap-4 ${className}`}>
          <img
            src={src}
            alt={block.alt}
            {...(sized ? { width: block.width ?? undefined, height: block.height ?? undefined } : {})}
            loading="lazy"
            decoding="async"
            className="block h-auto max-h-[480px] max-w-full self-start rounded-[32px] bg-bg-subtle object-cover sm:max-h-[640px] sm:rounded-[40px]"
          />
          {block.caption.trim() !== "" && (
            <figcaption className="text-[14px] leading-5 text-neutral-500">{marks(block.caption)}</figcaption>
          )}
        </figure>
      );
    }
    case "quote":
      return (
        <blockquote className={`flex flex-col gap-3 border-l-2 border-brand ps-5 lg:gap-4 lg:ps-6 ${className}`}>
          <p className="text-body-sm font-medium text-neutral-900 lg:text-body-md">{marks(block.text)}</p>
          {block.author.trim() !== "" && <footer className="text-[14px] leading-5 text-neutral-500">{block.author}</footer>}
        </blockquote>
      );
    case "callout":
      return (
        <aside className={`rounded-[32px] bg-bg-subtle px-6 py-5 text-body-sm text-neutral-800 lg:px-8 lg:py-6 ${className}`}>
          {marks(block.text)}
        </aside>
      );
  }
}

function Flow({ flow, underHeading, id, newTab }: { flow: FlowBlock[]; underHeading: boolean; id: string; newTab: boolean }) {
  return (
    <div className="flex flex-col">
      {flow.map((block, i) => (
        <FlowItem
          key={i}
          block={block}
          id={`${id}-${i}`}
          newTab={newTab}
          className={spaceAbove(i > 0 ? kindOf(flow[i - 1]) : null, kindOf(block), underHeading)}
        />
      ))}
    </div>
  );
}

// The children of the prose column (ArticleBody's column, or the editor's
// preview column, which carries the same rhythm: PROSE_RHYTHM).
export function ArticleBlocks({ blocks, newTab = false }: { blocks: readonly ArticleBlock[]; newTab?: boolean }) {
  return (
    <>
      {groupsOf(blocks).map((group, i) => {
        const id = `g${i}`;
        if (group.kind === "lede") {
          return (
            <p key={id} className="text-body-sm lg:mb-14 lg:text-body-md">
              {renderInline(group.text, id, newTab)}
            </p>
          );
        }
        if (group.kind === "divider") return <hr key={id} className="h-px w-full border-0 bg-stroke-subtle" />;
        if (group.heading === null) {
          return <Flow key={id} flow={group.flow} underHeading={false} id={id} newTab={newTab} />;
        }
        return (
          <div key={id} className="flex flex-col gap-4">
            <h2 className="text-title-lg text-neutral-900">{renderInline(group.heading, `${id}-h`, newTab)}</h2>
            {group.flow.length > 0 && <Flow flow={group.flow} underHeading id={id} newTab={newTab} />}
          </div>
        );
      })}
    </>
  );
}

// Whether the blocks show anything at all.
export function hasArticleContent(blocks: readonly ArticleBlock[]): boolean {
  return groupsOf(blocks).length > 0;
}

// The rhythm of the prose column: 48 px between groups on phones, 40 at lg.
// A string with no break opportunity (a pasted URL) breaks anywhere at every
// width (the site's global rule does it only below 640 px), so it can never
// run out of the column into the sidebar; ordinary text wraps as before.
export const PROSE_RHYTHM = "flex flex-col gap-12 text-neutral-900 [overflow-wrap:anywhere] lg:gap-10";
