/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

// Figma 1870:6184 — partner contact section. The Figma master nests
// the form in a dark `#2d2d2f` slab with an inner white card, but on
// the rendered page the dark frame + black inner border read as a
// heavy outline that didn't sit well next to the lighter forms used
// elsewhere on the site. Simplified to one clean light card with a
// stroke-subtle outline and soft shadow.
//
// The 6 ghost-product decorations along the left/right gutters
// (Frame 1870:6185 / 1870:6206) are preserved on lg — they sit
// outside the form column and don't carry the dark/light weight.

type Fields = {
  name: string;
  role: string;
  email: string;
  company: string;
  phone: string;
  comment: string;
};

const EMPTY: Fields = {
  name: "",
  role: "",
  email: "",
  company: "",
  phone: "",
  comment: "",
};

// Shared underline styling for every field. Defined once so the comment
// <textarea> renders pixel-identical to the <input> fields and can never
// drift from them. text-body-sm = 16/24, so a rows=1 textarea using this
// class is exactly the same height as a single-line input.
const FIELD_CLASS =
  "block w-full border-b border-neutral-800 bg-transparent py-3 text-body-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-900 focus:border-brand focus:placeholder:text-neutral-400 sm:py-2";

// Comment styling, derived from FIELD_CLASS so the two never drift. We
// swap the colour-only `transition-colors` for a transition that ALSO
// animates `height` (the auto-grow) — keeping both in one transition
// declaration avoids the two `transition-property` utilities clobbering
// each other — and add the grow cap (max-h) + no manual resize.
const COMMENT_CLASS =
  FIELD_CLASS.replace(
    "transition-colors",
    "transition-[border-color,height] duration-200 ease-out",
  ) + " max-h-[120px] resize-none";

function UnderlineInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="group/field block w-full cursor-text">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className={FIELD_CLASS}
      />
    </label>
  );
}

// Comment field. Starts as a normal single-line field, identical to the
// other inputs (it reuses FIELD_CLASS, so an empty/short comment matches
// them exactly). As the user types it GROWS DOWNWARD a few rows at a
// time, animated by a CSS height transition; once it reaches the cap
// (max-h-[120px], ~4 rows) it stops growing and a small inner scrollbar
// appears instead (overflow flips to auto only when capped, so no
// scrollbar flickers during the grow).
//
// Growth is downward-only and never reflows the rest of the form: the
// field row is top-anchored and the submit button is pinned to the card
// bottom (lg:mt-auto), so the grown comment simply expands into the empty
// space above the button — name/role/email and the button all stay put.
//
// On each keystroke we collapse the textarea to read its natural content
// height, then set that height back; the browser only paints the final
// value, so the transition animates from the previous height to the new
// one. We add the border width because scrollHeight excludes it, keeping
// the one-line state pixel-equal to the inputs.
function CommentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const border =
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const max = parseFloat(cs.maxHeight);
    el.style.height = "auto";
    const full = el.scrollHeight + border;
    const capped = Number.isFinite(max) && full > max;
    el.style.height = `${capped ? max : full}px`;
    setScrollable(capped);
  }, [value]);
  return (
    <label className="group/field block w-full cursor-text">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className={`${COMMENT_CLASS} ${
          scrollable ? "overflow-y-auto" : "overflow-hidden"
        }`}
      />
    </label>
  );
}

// One ghost-product silhouette. Each SVG is a rounded-rectangle stroke
// box with a pale `#F1F1F2` glyph inside, exported from Figma at the
// node's natural aspect ratio. `preserveAspectRatio="none"` is fine
// here because we always set width/height to the exact Figma dimensions.
function GhostCard({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span aria-hidden className={`absolute block ${className ?? ""}`} style={style}>
      <img src={src} alt="" loading="lazy" decoding="async" className="block size-full" />
    </span>
  );
}

export function PartnerContactForm() {
  const [f, setF] = useState<Fields>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    f.name.trim().length > 1 &&
    (f.email.includes("@") || f.phone.replace(/\D/g, "").length >= 6);

  function setField<K extends keyof Fields>(key: K, value: Fields[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  return (
    // Figma 1870:6184 has no internal vertical padding — the section's
    // height (696 px on the 1440 master) is exactly the height of the
    // stacked-cards content, and the side ghost-product decorations are
    // positioned against that 696 px. Neighbour sections (HowItWorks
    // above, FAQ below) already carry their own `py-[160px]`, so the
    // stack still gets breathing room without an extra `lg:py-[120px]`.
    <section
      id="contact-form"
      className="relative w-full overflow-hidden bg-white px-5 py-16 sm:px-10 sm:py-20 lg:py-0"
    >
      {/* === Side ghost-product decorations — lg only ===
          Anchored to the section's left/right edges with Figma's offsets
          (30 / 0 / 97 px). Sits 402 px below the section's top in the
          design. On smaller viewports there is no horizontal room for
          216-px decorative cards next to the form, so we hide them. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden lg:block"
      >
        {/* LEFT group — Frame 1870:6185. The exported SVGs are the
            un-flipped base glyphs; Figma renders the left group as the
            horizontal mirror of those bases (rotate-180 + scale-y-(-1) =
            scaleX(-1)), so each left card carries `-scale-x-100` to face
            the form correctly. The right group uses the same bases with
            no flip. */}
        <GhostCard
          src="/figma-export/spivpratsya/partner-left-top.svg"
          className="left-[30px] top-[402px] h-[147px] w-[216px] -scale-x-100"
        />
        <GhostCard
          src="/figma-export/spivpratsya/partner-left-mid.svg"
          className="left-0 top-[549px] h-[147px] w-[97px] -scale-x-100"
        />
        <GhostCard
          src="/figma-export/spivpratsya/partner-left-bot.svg"
          className="left-[97px] top-[549px] h-[147px] w-[149px] -scale-x-100"
        />
        {/* RIGHT group — Frame 1870:6206 */}
        <GhostCard
          src="/figma-export/spivpratsya/partner-right-top.svg"
          className="right-[30px] top-[402px] h-[147px] w-[216px]"
        />
        <GhostCard
          src="/figma-export/spivpratsya/partner-right-mid.svg"
          className="right-0 top-[549px] h-[147px] w-[97px]"
        />
        <GhostCard
          src="/figma-export/spivpratsya/partner-right-bot.svg"
          className="right-[97px] top-[549px] h-[147px] w-[149px]"
        />
      </div>

      {/* === 3-card stack (Figma 1870:6228) ===
          The form is the FOREGROUND of a 3-layer "stack of papers"
          decoration. Figma stacks three cards centred horizontally,
          each pushed down by `mb-[-533px]` so only ~48 px of each
          previous card peeks above the next:
            • Card 1 (rear):   812×581 white  border-stroke-subtle r-40
            • Card 2 (middle): 902×581 white  border-stroke-subtle r-40
            • Card 3 (front):  948×600 dark #2d2d2f r-40 (the Quizz Card)
          Earlier code rendered only Card 3 — the section's signature
          "paper stack" metaphor was lost. The two backdrops only make
          sense on lg where the design has room for cards wider than
          the form; below lg we hide them and let the form stand
          on its own. */}
      <div className="relative mx-auto flex w-full max-w-[948px] flex-col items-center">
        {/* Rear card (812 wide) — peeks ~48 px above the middle card. */}
        <div
          aria-hidden
          className="hidden h-[581px] w-[812px] rounded-[40px] border border-stroke-subtle bg-white lg:-mb-[533px] lg:block"
        />
        {/* Middle card (902 wide) — peeks ~48 px above the foreground. */}
        <div
          aria-hidden
          className="hidden h-[581px] w-[902px] rounded-[40px] border border-stroke-subtle bg-white lg:-mb-[533px] lg:block"
        />

        {/* === Quizz Card (Figma 1870:6249 = I…;308:2720) ===
            Strict 1:1 with Figma:
              • Outer dark `#2d2d2f` rounded-40, NO padding.
              • Title row at top (px-60 py-32 in master) — white text on
                dark fill.
              • Inner white card flush below title, with its own
                rounded-40 top corners and a thin 1-px black border
                (Figma's `border border-black`).
              • Form body inside the white card; bottom-right submit. */}
        {/* Figma 1870:6249 fixes the Quizz Card at 948x600 on lg. This
            600 px is load-bearing: the side ghost-product decorations are
            absolutely positioned against the resulting 696 px section
            height (top-[402]/[549], bottom edge at y=696). Shrinking the
            card clips them and they slide out the bottom, so we keep the
            full 600 px. The field row is top-anchored (`lg:pt-[86px]`,
            which also visually centres the single-line state) and the
            submit button row is pinned to the bottom (`lg:mt-auto`). That
            leaves the gap above the button as headroom for the comment
            field to grow downward into without moving anything else. */}
        <div className="relative flex w-full flex-col rounded-[28px] bg-[#2d2d2f] sm:rounded-[32px] lg:h-[600px] lg:w-[948px] lg:rounded-[40px]">
          {/* Title row — white text on dark. Matches Figma's
              `px-[60px] py-[32px]` at lg; scales down on mobile. */}
          <div className="flex items-center gap-4 px-5 py-5 sm:gap-6 sm:px-8 sm:py-7 lg:gap-8 lg:px-[60px] lg:py-8">
            <h2 className="text-white text-[22px] font-semibold leading-[26px] tracking-[-0.44px] sm:text-[26px] sm:leading-[30px] sm:tracking-[-0.52px] lg:text-[32px] lg:leading-[28px] lg:tracking-[-0.64px]">
              {submitted ? "Дякуємо!" : "Цікавить співпраця?"}
            </h2>
          </div>

          {/* Inner white card — flush with the title row's bottom edge.
              Figma applies a 1-px black border (`border border-black`)
              on lg+ to draw a hairline against the outer dark; on
              mobile the dark frame is small and the heavy black hairline
              reads as a double stroke against the rounded inner radius,
              so we drop it below lg and only keep it once the design's
              full proportions kick in. */}
          <div className="flex flex-1 flex-col rounded-[24px] bg-white sm:rounded-[28px] lg:rounded-[40px] lg:border lg:border-black">
            {submitted ? (
              <div className="flex flex-col items-center gap-4 px-6 py-12 text-center sm:gap-6 sm:px-12 sm:py-16 lg:py-[80px]">
                <p className="text-title-lg text-neutral-900">Запит надіслано</p>
                <p className="max-w-md text-body-sm text-neutral-500">
                  Менеджер зв{"’"}яжеться з вами найближчим часом, щоб обговорити деталі співпраці.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-6 px-5 pb-2 pt-6 sm:gap-10 sm:px-10 sm:pt-10 lg:flex-row lg:items-start lg:gap-[100px] lg:px-[60px] lg:pb-4 lg:pt-[86px]">
                  <div className="flex w-full flex-col gap-6 sm:gap-8 lg:flex-1">
                    <UnderlineInput
                      label="Ваше Ім’я"
                      value={f.name}
                      onChange={(v) => setField("name", v)}
                    />
                    <UnderlineInput
                      label="Роль"
                      value={f.role}
                      onChange={(v) => setField("role", v)}
                    />
                    <div className="flex flex-col gap-2">
                      <UnderlineInput
                        label="Email"
                        type="email"
                        value={f.email}
                        onChange={(v) => setField("email", v)}
                      />
                      <p className="text-[12px] leading-[16px] text-neutral-500">
                        * Контакти використовуються виключно для підготовки підбору та комерційної пропозиції.
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-6 sm:gap-8 lg:flex-1">
                    <UnderlineInput
                      label="Компанія"
                      value={f.company}
                      onChange={(v) => setField("company", v)}
                    />
                    <UnderlineInput
                      label="Номер телефону"
                      type="tel"
                      value={f.phone}
                      onChange={(v) => setField("phone", v)}
                    />
                    <CommentField
                      label="Коментар"
                      value={f.comment}
                      onChange={(v) => setField("comment", v)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end px-5 pb-6 pt-6 sm:px-10 sm:pb-10 lg:mt-auto lg:px-[60px] lg:pb-[40px] lg:pt-4">
                  <Button
                    type="button"
                    onClick={() => canSubmit && setSubmitted(true)}
                    disabled={!canSubmit}
                    arrow
                  >
                    Домовитись про зустріч
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
