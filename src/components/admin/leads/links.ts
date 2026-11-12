// What a form submission may turn into a link. The page a lead came from
// and the e-mail a visitor typed are visitor input: the inbox makes them
// clickable only when the link stays what it looks like (a page of this
// site, a letter to one address), and shows anything else as plain text.
// Plain functions, no "use client", no server import: POST /api/leads uses
// the same rule for the page it stores, the drawer and the table use it for
// the rows stored before that rule existed, and the checks call it directly.

// A path of this site: one "/" first, never "//host" or "/\host" (a browser
// reads both as another site), and no whitespace, backslash or control
// character anywhere.
const SITE_PATH = /^\/(?![/\\])[^\s\\\p{Cc}]*$/u;

export function isSitePath(value: string): boolean {
  return SITE_PATH.test(value);
}

// The page as a link target, or null when it must stay text.
export function sourceHref(source: string): string | null {
  return isSitePath(source) ? source : null;
}

// One plain address: something before a single "@", a dotted domain, and
// none of the characters that would end the address part of a mailto: link
// or add a header to it ("?", "&", "%", "#"), quote it, list it or break it
// ("<", ">", "(", ")", "[", "]", "/", "\", ",", ";", ":", whitespace).
const MAIL_ADDRESS =
  /^[^\s@?&%#"'<>()[\]\\/,;:\p{Cc}]+@[^\s@?&%#"'<>()[\]\\/,;:\p{Cc}]+\.[^\s@?&%#"'<>()[\]\\/,;:.\p{Cc}]{2,}$/u;

export function isPlainMailAddress(value: string): boolean {
  return value.length <= 254 && MAIL_ADDRESS.test(value);
}

// "mailto:<address>" (with a subject when given), or null when the address
// is not a plain one: the drawer then shows it as text to copy and check.
export function mailtoHref(address: string, subject?: string): string | null {
  const value = address.trim();
  if (!isPlainMailAddress(value)) return null;
  return subject ? `mailto:${value}?subject=${encodeURIComponent(subject)}` : `mailto:${value}`;
}
