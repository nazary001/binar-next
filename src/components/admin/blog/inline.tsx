import type { ReactNode } from "react";

// The three inline marks an article may carry, as the site renders them:
// **жирний**, *курсив* and [текст](https://посилання). Anything else is
// plain text. A link opens only an http(s) address, a site path or a
// mailto / tel address; any other target shows its label as text.

const MARK = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
const SAFE_HREF = /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i;

export function renderInline(text: string, keyPrefix = "m"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(MARK)) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${index}`;
    index += 1;
    if (match[1] !== undefined) {
      out.push(<strong key={key} className="font-bold">{renderInline(match[1], key)}</strong>);
    } else if (match[2] !== undefined) {
      out.push(<em key={key}>{renderInline(match[2], key)}</em>);
    } else {
      const label = match[3] ?? "";
      const href = match[4] ?? "";
      out.push(
        SAFE_HREF.test(href) ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-1 underline-offset-[3px] transition-colors duration-200 hover:text-brand"
          >
            {label}
          </a>
        ) : (
          label
        ),
      );
    }
    last = start + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
