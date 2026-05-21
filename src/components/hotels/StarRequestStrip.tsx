"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "#f85a0b" : "none"}
      stroke={filled ? "#f85a0b" : "#1d1d1f"}
      strokeWidth="1.5"
      className="size-9 transition-colors sm:size-10"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}

// Figma 1384:11657 — two equal-width cards meeting in the centre, each
// rounded on its INNER edge so the seam between them reads as a pair of
// kissed lenses. Left card is a dark slab (#343435) with the title in
// Light + Bold mix; right card is white with a stroke-default border
// and houses three numbered steps (stars / email / send). Padding is
// asymmetric — outer edges have the design's 130-px column margin, the
// inner edges (where the cards meet) get 80 px so the content breathes
// next to the rounded inner corners.
export function StarRequestStrip() {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = stars > 0 && email.includes("@");

  if (submitted) {
    return (
      <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:py-[160px]">
        <div className="animate-[reveal-up_700ms_cubic-bezier(0.22,1,0.36,1)_both] rounded-[28px] bg-bg-subtle p-8 text-center sm:rounded-[40px] sm:p-12">
          <div className="mx-auto mb-6 flex size-16 animate-[reveal-up_500ms_cubic-bezier(0.22,1,0.36,1)_200ms_both] items-center justify-center rounded-full bg-brand/15 text-brand">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-8"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="animate-[reveal-up_500ms_cubic-bezier(0.22,1,0.36,1)_300ms_both] text-h2 text-neutral-900">
            Дякуємо!
          </h3>
          <p className="mt-4 animate-[reveal-up_500ms_cubic-bezier(0.22,1,0.36,1)_400ms_both] text-body-md text-neutral-500">
            Ми надішлемо чеклист на {email} протягом доби.
          </p>
        </div>
      </section>
    );
  }

  return (
    // No max-width on the section: the two cards stretch to the viewport
    // edges on any screen size. Content INSIDE each card is anchored to
    // the 1440-design x-grid via `lg-pad-l` / `lg-pad-r` (130-px
    // padding on 1440, grows to centre the 1180-px column on wider
    // monitors — see globals.css). Inner sides keep a fixed 80-px
    // padding so the seam between the cards reads the same at every
    // breakpoint.
    <section className="bg-white">
      <div className="flex w-full flex-col gap-6 px-5 py-12 sm:gap-8 sm:px-10 sm:py-16 lg:flex-row lg:gap-0 lg:px-0 lg:py-0">
        {/* === LEFT — dark title slab ===
            Figma 1384:11658: bg #343435, rounded-tr/br 48 px (curves
            INTO the right side), pl-130 pr-80 py-130 at the design
            master. lg-pad-l makes the LEFT padding adaptive so the
            title aligns with the design's x=130 line on any viewport;
            the inner right padding stays a fixed 80 px so the title
            text never touches the rounded seam. */}
        <div
          className="lg-pad-l flex flex-1 items-center self-stretch rounded-[40px] px-6 py-12 sm:rounded-[48px] sm:px-10 sm:py-16 lg:rounded-bl-none lg:rounded-tl-none lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:pb-[130px] lg:pr-20 lg:pt-[130px]"
          style={{ background: "#343435" }}
        >
          <h2 className="max-w-[510px] text-white">
            <span className="text-h2-light">
              Отримайте вимоги до комплектації готелю{" "}
            </span>
            <span className="text-h2">за зірковістю</span>
          </h2>
        </div>

        {/* === RIGHT — white form card ===
            Figma 1384:11660: bg white, border-stroke-default,
            rounded-tl/bl 48 px (mirrors the dark card's inner curve),
            pl-80 pr-130 py-80. Mirror of the left card's padding
            scheme: lg-pad-r adapts the OUTER right padding; the inner
            left stays a fixed 80 px. */}
        <div className="lg-pad-r flex flex-1 flex-col gap-8 rounded-[40px] border border-stroke-default px-6 py-10 sm:gap-10 sm:rounded-[48px] sm:px-10 sm:py-14 lg:gap-10 lg:rounded-br-none lg:rounded-tr-none lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:pb-[80px] lg:pl-20 lg:pt-[80px]">
          {/* Step 01 — stars
              Mobile: numbers stack ABOVE the content (flex-col), big
              numerals shrink to text-[44px] so they don't eat the
              narrow viewport. sm and up: original side-by-side layout
              with text-h1 numerals in a 95-px column. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <span
              aria-hidden
              className="text-[44px] font-bold leading-none text-neutral-900 sm:w-[95px] sm:text-h1"
            >
              01.
            </span>
            <div className="flex flex-1 flex-col gap-3 min-w-0 sm:gap-2">
              <p className="text-title-sm text-neutral-900">Оберіть зірковість</p>
              <div className="-mx-1 flex items-center gap-1 sm:mx-0 sm:gap-4">
                {[1, 2, 3, 4, 5].map((i) => {
                  const filled = i <= (hover || stars);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStars(i)}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${i} ${i === 1 ? "зірка" : "зірки"}`}
                      // p-1 on mobile gives the 36-px star a 44-px tap
                      // area (the WCAG-recommended minimum) without
                      // affecting the visual layout — the button just
                      // has extra invisible padding around the icon.
                      className={`cursor-pointer p-1 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 hover:rotate-12 active:scale-95 sm:p-0 ${
                        filled && i === stars ? "scale-110" : ""
                      }`}
                    >
                      <StarIcon filled={filled} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 02 — email + caption */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
            <span
              aria-hidden
              className="text-[44px] font-bold leading-none text-neutral-900 sm:w-[95px] sm:text-h1"
            >
              02.
            </span>
            <div className="flex flex-1 flex-col gap-3 min-w-0 sm:gap-2">
              <p className="text-title-sm text-neutral-900">
                Вкажіть електронну пошту <span className="text-brand">*</span>
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full border-b border-neutral-800 bg-transparent py-3 text-body-md text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand sm:py-2"
              />
              <p className="text-[12px] leading-[16px] text-neutral-500">
                * Контакти використовуються виключно для підготовки підбору та
                комерційної пропозиції.
              </p>
            </div>
          </div>

          {/* Step 03 — submit button. On mobile the button stretches
              full width so it stays a comfortable tap target and
              never overflows the narrow card. sm+ keeps the natural
              inline width next to the big numeral. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <span
              aria-hidden
              className="text-[44px] font-bold leading-none text-neutral-900 sm:w-[95px] sm:text-h1"
            >
              03.
            </span>
            <Button
              type="button"
              onClick={() => canSubmit && setSubmitted(true)}
              disabled={!canSubmit}
              arrow
            >
              Отримати чеклист
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
