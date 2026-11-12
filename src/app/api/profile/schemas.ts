import "server-only";
import { z } from "zod";
import { isValidEmail } from "@/components/auth/data";
import {
  CONTRACT_MAX_BYTES,
  CONTRACT_MIME,
  fileFormat,
  isValidCode,
  nationalPhone,
} from "@/components/platform/profile/data";
import { zId, zRequiredText, zText } from "@/server/validate";

// Request shapes of the profile list routes (/api/profile/**). The rules
// are the ones the page's forms apply (profile/data.ts validators, the
// e-mail rule of auth/data.ts), so a request the UI sends always passes and
// anything else is a plain 400. Not a route: Next only serves route.ts.

// The longest name, signatory, full name or position a request may carry.
export const TEXT_MAX = 200;
const EMAIL_MAX = 254;
const FILE_NAME_MAX = 255;

// A new row's id as the browser's newId(prefix) makes it: the prefix and
// eight lower-case letters / digits. Seeded ids ("cp-mirotel") are not
// accepted for new rows.
export function zNewId(prefix: "cp" | "ct" | "emp") {
  return z.string().regex(new RegExp(`^${prefix}-[0-9a-z]{8}$`));
}

// A legal name or a signatory: required, trimmed, bounded.
export const zName = zRequiredText(TEXT_MAX);

// EDRPOU (8 digits) or IPN (10 digits), stored trimmed.
export const zCode = z.string().trim().max(32).refine((value) => isValidCode(value));

// A valid e-mail, stored lower-cased (the forms send it that way). zod runs
// a refinement even after .max() failed, so the length is checked again.
export const zEmail = zText(EMAIL_MAX)
  .refine((value) => value.length <= EMAIL_MAX && isValidEmail(value))
  .transform((value) => value.toLowerCase());

// "" (no phone) or a Ukrainian number, stored as the national digits.
export const zPhone = z
  .string()
  .max(32)
  .refine((value) => value.trim() === "" || nationalPhone(value) !== null)
  .transform((value) => (value.trim() === "" ? "" : (nationalPhone(value) ?? "")));

// The extensions a browser gives a file of an accepted type (PDF, PNG,
// JPEG: the dropzone takes nothing else, contractFileError). The page
// derives the tile's format from the extension (fileFormat: PDF, PNG, JPG,
// or the other JPEG spellings upper-cased), from the type when there is
// none.
const CONTRACT_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "jpe", "jfif", "pjpeg", "pjp"]);

// A file name the page can print and offer as a download name: no control
// or bidirectional-override characters, no markup or path characters.
function isPlainFileName(name: string): boolean {
  for (const ch of name) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return false;
    if (code === 0x200e || code === 0x200f || code === 0x2028 || code === 0x2029) return false;
    if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) return false;
    if (ch === "<" || ch === ">" || ch === "/" || ch === "\\") return false;
  }
  return true;
}

function isContractFileName(name: string): boolean {
  if (!isPlainFileName(name)) return false;
  const ext = name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "";
  return ext === "" || CONTRACT_EXTENSIONS.has(ext);
}

// The contract scan's metadata (the bytes are not uploaded): a plain name
// of an accepted type, a size within the dropzone's limit and the format
// the page derives from that name for an accepted type (fileFormat with a
// CONTRACT_MIME type).
export const zContractFile = z
  .object({
    name: z.string().min(1).max(FILE_NAME_MAX),
    size: z.number().int().min(0).max(CONTRACT_MAX_BYTES),
    format: z.string().min(1).max(16),
  })
  .strict()
  .refine(
    (file) =>
      isContractFileName(file.name) && CONTRACT_MIME.some((mime) => fileFormat(file.name, mime) === file.format),
  );

// A path segment naming an existing row; anything else is "not found".
export function pathId(value: string): string | null {
  const parsed = zId.safeParse(value);
  return parsed.success ? parsed.data : null;
}
