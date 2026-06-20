"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

// Figma uses heroicons-outline/star (same path we render). The icon's
// visible bounds inside its 40-px container are `inset-[13.13%_11.85%_
// 14.07%_11.85%]` (≈ a 30×30 star). Our `viewBox="0 0 24 24"` star
// scales up to fill `size-10` (40 px) so the rendered glyph lands at
// the same visual size as Figma's master.
//
// Stroke weight: the Figma asset (viewBox 32.02x30.62) is drawn with a
// 1.5-px stroke, i.e. a 1.5-px outline at the 40-px display size. Our
// 24-unit viewBox is scaled up by 40/24, so to land that same 1.5-px
// rendered stroke we set strokeWidth = 1.5 * 24/40 = 0.9 (a flat 1.5
// here would render ~2.5 px, visibly heavier than the design).
//
// Fill swap is animated: the empty star carries a fully-transparent
// orange fill (same RGB, 0 alpha) so the transition is a pure alpha
// fade with no grey fringe, while the stroke colour eases from
// Text/Default (#1d1d1f) to Brand (#f85a0b) over the same 250 ms.
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth="0.9"
      className="size-8 lg:size-10"
      style={{
        fill: filled ? "#f85a0b" : "rgba(248, 90, 11, 0)",
        stroke: filled ? "#f85a0b" : "#1d1d1f",
        transition: "fill 250ms ease-out, stroke 250ms ease-out",
      }}
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

// Figma 1384:11657 — two equal-width 720-px cards meeting in the
// centre, each rounded on its INNER edge. The master is STATIC: no
// hover transitions, no scale animations, no transform tricks. We
// keep just the bare layout + functional click handlers so the form
// still works.
export function StarRequestStrip() {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = stars > 0 && email.includes("@");

  if (submitted) {
    return (
      <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:py-[160px]">
        <div className="rounded-[28px] bg-bg-subtle p-8 text-center sm:rounded-[40px] sm:p-12">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-brand/15 text-brand">
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
          <h3 className="text-h2 text-neutral-900">Дякуємо!</h3>
          <p className="mt-4 text-body-sm text-neutral-500">
            Ми надішлемо чеклист на {email} протягом доби.
          </p>
        </div>
      </section>
    );
  }

  return (
    // Figma master has no outer section padding — the two cards
    // stretch edge-to-edge. Content INSIDE each card is anchored at
    // x=130 / x=1310 via `lg-pad-l` / `lg-pad-r`; the inner edges
    // (where the cards meet) keep a fixed 80-px padding.
    <section className="bg-white">
      {/* Figma mobile master 3117:16304 — the whole strip is one bordered
          rounded-[32px] column (border #8e8e8f) holding two cards that
          overlap: the dark band on top, the white form card lapping over
          its bottom by 72 px (`-mb-[72px]` on the dark card). The outer
          border is mobile-only; desktop keeps the borderless two-up
          flex-row layout (border lives on the right card there). */}
      <div className="flex w-full flex-col max-lg:rounded-[32px] max-lg:border max-lg:border-stroke-default lg:flex-row lg:gap-0 lg:px-0 lg:py-0">
        {/* === LEFT — dark title slab (Figma 1384:11658) ===
            bg #343435, rounded-tr/br 48 px, pl-130 pr-80 py-130 at the
            design master. Title is text-h2-light (Manrope Light 44/48
            -0.88) + text-h2 Bold for the emphasis word "за зірковістю". */}
        <div
          className="lg-pad-l flex flex-1 items-start self-stretch rounded-[32px] px-6 py-[60px] max-lg:-mb-[72px] sm:px-10 lg:items-center lg:rounded-bl-none lg:rounded-tl-none lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:pb-[130px] lg:pr-20 lg:pt-[130px]"
          style={{ background: "#343435" }}
        >
          {/* Figma 1384:11659 — `w-[510px]` fixed (not max-w). The two
              <br>s split the text exactly as the master does: line 1
              "Отримайте вимоги", line 2 "до комплектації готелю",
              line 3 "за зірковістю" (bold). Mobile master 3117:16185 uses
              the SAME 3-line split, so the breaks now show on every
              breakpoint. */}
          <h2 className="text-white lg:w-[510px]">
            <span className="text-h2-light">
              Отримайте вимоги{" "}
              <br aria-hidden />
              до комплектації готелю{" "}
              <br aria-hidden />
            </span>
            <span className="text-h2">за зірковістю</span>
          </h2>
        </div>

        {/* === RIGHT — white form card (Figma 1384:11660) ===
            bg white, border #8e8e8f, rounded-tl/bl 48 px, pl-80
            pr-130 py-80. Three numbered rows separated by 40-px gap. */}
        <div className="lg-pad-r relative flex flex-1 flex-col gap-[60px] rounded-[32px] border-stroke-default bg-white px-6 pb-[108px] pt-[96px] sm:px-10 lg:gap-10 lg:rounded-br-none lg:rounded-tr-none lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:border lg:pb-[80px] lg:pl-20 lg:pt-[80px]">
          {/* Row 01 — stars
              Figma 1384:11661: `flex gap-[24px] items-center w-full`.
              Number "01." text-h1 (62/68) w=95, inner content has
              gap-[4px] between title and the 5-star row. Stars are
              40×40 with gap-[16px] between them, static outline icons
              (Figma is decorative — no hover state). We add functional
              click handlers + a smoothly-animated fill swap (the 250-ms
              fade lives in StarIcon) so the user gets feedback without
              overriding the static Figma look. */}
          <div className="flex items-center gap-3 lg:gap-6">
            <span
              aria-hidden
              className="w-[76px] shrink-0 text-[48px] font-bold leading-[68px] tracking-[-0.96px] text-neutral-900 lg:w-[95px] lg:text-h1 lg:leading-none"
            >
              01.
            </span>
            <div className="flex flex-1 min-w-0 flex-col gap-1">
              <p className="text-title-sm text-neutral-900">Оберіть зірковість</p>
              <div className="flex items-center gap-4">
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
                      className="cursor-pointer"
                    >
                      <StarIcon filled={filled} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 02 — email + caption
              Figma 1384:11671: `flex gap-[24px] items-center w-full`.
              Inner content (1384:11673): gap-[4px] between title and
              the email-area sub-frame. Sub-frame (1384:11675): gap-[8px]
              between the bordered input row and the caption. We
              reproduce both gaps via nested flex containers. */}
          <div className="flex items-center gap-3 lg:gap-6">
            <span
              aria-hidden
              className="w-[76px] shrink-0 text-[48px] font-bold leading-[68px] tracking-[-0.96px] text-neutral-900 lg:w-[95px] lg:text-h1 lg:leading-none"
            >
              02.
            </span>
            <div className="flex flex-1 min-w-0 flex-col gap-1">
              <p className="text-title-sm text-neutral-900">
                Вкажіть електронну пошту *
              </p>
              <div className="flex flex-col gap-2">
                {/* Figma 1384:11676 — `border-b border-[#343435] py-[8px]`
                    placeholder "Email" body-sm Regular 16/24 #1d1d1f.
                    Placeholder color matches the design token Text/Default,
                    not the usual lighter neutral-400. */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full border-b border-neutral-800 bg-transparent py-2 text-[16px] leading-[24px] text-neutral-900 outline-none placeholder:text-neutral-900 focus:border-brand lg:text-body-sm"
                />
                {/* Figma 1384:11678 — caption text Manrope Regular 12/16
                    color Text/Subtle #777779 (= text-neutral-500). */}
                <p className="text-[12px] leading-[16px] text-neutral-500">
                  * Контакти використовуються виключно для підготовки підбору
                  та комерційної пропозиції.
                </p>
              </div>
            </div>
          </div>

          {/* Row 03 — submit button
              Figma 1384:11679: `flex gap-[24px] items-center w-full`.
              Button is the standard Button/Large (black + orange arrow) on
              desktop; the mobile master 3117:16292 shows the compact small
              button (42-px arrow), so size="responsive" renders small below
              lg and the identical large button at lg+. */}
          <div className="flex items-center gap-3 lg:gap-6">
            <span
              aria-hidden
              className="w-[76px] shrink-0 text-[48px] font-bold leading-[68px] tracking-[-0.96px] text-neutral-900 lg:w-[95px] lg:text-h1 lg:leading-none"
            >
              03.
            </span>
            {/* Figma master renders the button in its DEFAULT black
                state (no form-validation visual). We drop the
                disabled prop so the button always reads as active —
                onClick still gates submission on `canSubmit`, so an
                empty form simply does nothing rather than silently
                graying the CTA out. */}
            <Button
              type="button"
              size="responsive"
              onClick={() => canSubmit && setSubmitted(true)}
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
