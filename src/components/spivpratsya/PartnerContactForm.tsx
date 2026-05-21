/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
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
        className="block w-full border-b border-neutral-800 bg-transparent py-3 text-body-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-900 focus:border-brand focus:placeholder:text-neutral-400 sm:py-2"
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
    <section
      id="contact-form"
      className="relative w-full overflow-hidden bg-white px-5 py-16 sm:px-10 sm:py-20 lg:py-[120px]"
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
        {/* LEFT group — Frame 1870:6185 */}
        <GhostCard
          src="/figma-export/spivpratsya/partner-left-top.svg"
          className="left-[30px] top-[402px] h-[147px] w-[216px]"
        />
        <GhostCard
          src="/figma-export/spivpratsya/partner-left-mid.svg"
          className="left-0 top-[549px] h-[147px] w-[97px]"
        />
        <GhostCard
          src="/figma-export/spivpratsya/partner-left-bot.svg"
          className="left-[97px] top-[549px] h-[147px] w-[149px]"
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

      {/* === Quizz Card (Figma 1870:6249 = I…;308:2720) ===
          Strict 1:1 with Figma:
            • Outer dark `#2d2d2f` rounded-40, NO padding.
            • Title row at top (px-60 py-32 in master) — white text on
              dark fill.
            • Inner white card flush below title, with its own
              rounded-40 top corners and a thin 1-px black border
              (Figma's `border border-black`).
            • Form body inside the white card; bottom-right submit.
          The earlier "rough" appearance came from an extra
          `p-1.5` (6 px) on the outer wrapper that pushed a 6-px dark
          frame around the white card. Removing it lets the white card
          sit flush against the title row exactly like the Figma
          render — no extra ring, just the thin 1-px border. */}
      <div className="relative mx-auto w-full max-w-[948px]">
        <div className="relative flex flex-col rounded-[28px] bg-[#2d2d2f] shadow-[0_24px_50px_-24px_rgba(29,29,31,0.30),0_8px_16px_-12px_rgba(29,29,31,0.20)] sm:rounded-[32px] lg:rounded-[40px]">
          {/* Title row — white text on dark. Matches Figma's
              `px-[60px] py-[32px]` at lg; scales down on mobile. */}
          <div className="flex items-center gap-4 px-5 py-5 sm:gap-6 sm:px-8 sm:py-7 lg:gap-8 lg:px-[60px] lg:py-8">
            <h2 className="text-white text-[22px] font-semibold leading-[26px] tracking-[-0.44px] sm:text-[26px] sm:leading-[30px] sm:tracking-[-0.52px] lg:text-[32px] lg:leading-[28px] lg:tracking-[-0.64px]">
              {submitted ? "Дякуємо!" : "Цікавить співпраця?"}
            </h2>
          </div>

          {/* Inner white card — flush with the title row's bottom edge
              and bordered with a 1-px black stroke (Figma's `border
              border-black`). Its own `rounded-40` carves a small dark
              shoulder at the top-left / top-right corners against the
              outer dark, reproducing Figma's "tab" effect. */}
          <div className="flex flex-1 flex-col rounded-[24px] border border-black bg-white sm:rounded-[28px] lg:rounded-[40px]">
            {submitted ? (
              <div className="flex flex-col items-center gap-4 px-6 py-12 text-center sm:gap-6 sm:px-12 sm:py-16 lg:py-[80px]">
                <p className="text-title-lg text-neutral-900">Запит надіслано</p>
                <p className="max-w-md text-body-md text-neutral-500">
                  Менеджер зв{"’"}яжеться з вами найближчим часом, щоб обговорити деталі співпраці.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-6 px-5 pb-2 pt-6 sm:gap-10 sm:px-10 sm:pt-10 lg:flex-row lg:items-start lg:gap-[100px] lg:px-[60px] lg:pb-4 lg:pt-[60px]">
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
                    <UnderlineInput
                      label="Коментар"
                      value={f.comment}
                      onChange={(v) => setField("comment", v)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end px-5 pb-6 pt-6 sm:px-10 sm:pb-10 lg:px-[40px] lg:pb-10 lg:pt-4">
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
