"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DESKTOP_QUERY, usePhone } from "@/components/ui/useMediaQuery";
import { XMarkIcon } from "@/components/catalog/icons";
import { useFitZoom } from "@/components/cart/useFitZoom";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import { saveLogo } from "./api";
import { useAuth } from "./AuthProvider";
import { LOGO_MAX_BYTES, LOGO_MIME, LOGO_STORE_PX } from "./data";
import { PersonIcon } from "./icons";

const COPY = {
  title: "Вітаємо на платформі",
  brand: "Binar-2000",
  close: "Закрити",
  lead: "Раді бути вашими партнерами",
  logoAlt: "Лого компанії",
  upload: "Завантажити лого компанії",
  replace: "Замінити лого компанії",
  uploadShort: "Завантажити лого",
  replaceShort: "Замінити лого",
  caption: "PNG, JPG до 5 МБ",
  wrongType: "Підтримуються лише PNG або JPG",
  tooBig: "Файл більший за 5 МБ",
  unreadable: "Не вдалося прочитати зображення",
  team: "Додавайте співробітників та контрагентів у своєму профілі",
  cta: "Перейти в профіль",
} as const;

// «Вітаємо на платформі Binar-2000» — Figma 4573:35590, the first-login
// dialog: a 718-px centred card (white, 1-px #8e8e8f ring, r48, p-60
// with the ring inside the gutter, 40-px rhythm) over the blurred scrim.
// Caption/Large title + 32-px close; Body/Large «Раді бути вашими
// партнерами»; the #f8f8f8 r24 tile with the 144.65-px dark avatar
// (person glyph until a logo is chosen), the small «Завантажити лого
// компанії» pill and the «PNG, JPG до 5 МБ» caption; a Body/Large line
// and the full-width orange Button/Large «Перейти в профіль».
// Phones (< 640, D7 short modal card = the Modal718 phone card numbers):
// 24 from the screen edges, r32, the 1-px #8e8e8f ring, p 24 incl. the
// ring, title 24/28 Bold ("Binar-2000" never breaks), the 24 cross in a
// 44 box, 16/24 #343435 text, the 120 r16 avatar, the short pill label
// and the 12/16 caption. The head (title + lead) and the CTA stay put
// while the middle (tile + second line) scrolls when the card is taller
// than the screen; below 500 px of height the whole card scrolls
// instead. The scrim does not close it on phones (cross, Escape, CTA).
// The phone-only wrapper is `lg:contents`, so the desktop column is
// unchanged.
const MODAL_DESIGN_H = 706;

// The chosen file is downscaled to a small square before it is kept in
// the browser store (a 5-MB original would not fit localStorage).
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = LOGO_STORE_PX;
      canvas.height = LOGO_STORE_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        LOGO_STORE_PX,
        LOGO_STORE_PX,
      );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

export function WelcomeModal() {
  const { user, welcomeOpen, closeWelcome, goToProfile } = useAuth();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fit = useFitZoom(MODAL_DESIGN_H, 80);
  const phone = usePhone();

  useModalBehavior({
    open: welcomeOpen,
    onClose: closeWelcome,
    container: dialogRef,
    initial: closeRef,
    inertSelector: "body > header",
  });

  // Focus after closing: the modal opens right after the sign-in sheet
  // closed and the shell swapped, so its opener is gone or inert and
  // useModalBehavior's return (its cleanup runs first, declared above)
  // leaves focus on <body>. Then the page h1 (CabinetPageHead, tabIndex
  // -1) takes it, else the header logo; no scroll.
  useEffect(() => {
    if (!welcomeOpen) return;
    return () => {
      const active = document.activeElement;
      if (active && active !== document.body && !active.closest("[inert]")) return;
      const target =
        document.querySelector<HTMLElement>("main h1[tabindex='-1']") ??
        document.querySelector<HTMLElement>("body > header a");
      target?.focus({ preventScroll: true });
    };
  }, [welcomeOpen]);

  // Below 640 a stray tap on the 24-px scrim strip must not end the
  // one-time onboarding: only the cross, Escape and the CTA close it.
  const closeFromScrim = () => {
    if (window.matchMedia(DESKTOP_QUERY).matches) closeWelcome();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_MIME.includes(file.type)) {
      setError(COPY.wrongType);
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError(COPY.tooBig);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      saveLogo(await shrinkImage(file));
    } catch {
      setError(COPY.unreadable);
    } finally {
      setBusy(false);
    }
  };

  const logo = user?.logo;

  return (
    <div
      aria-hidden={!welcomeOpen}
      inert={!welcomeOpen}
      className={`fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-8 ${
        welcomeOpen ? "" : "pointer-events-none"
      }`}
    >
      <div
        aria-hidden
        onClick={closeFromScrim}
        className={`absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 ${
          welcomeOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        tabIndex={-1}
        style={fit < 1 ? { zoom: fit } : undefined}
        className={`scrollbar-hidden relative flex max-h-full w-[min(718px,100%)] flex-col gap-6 overflow-y-auto overscroll-contain rounded-[32px] border border-stroke-default bg-white p-[23px] transition-[opacity,scale] duration-300 max-lg:[@media(min-height:500px)]:overflow-hidden sm:p-10 lg:gap-10 lg:rounded-[48px] lg:p-[59px] ${
          welcomeOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-0 lg:gap-4">
            <h2
              id="welcome-title"
              className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900 lg:text-[32px] lg:tracking-[-0.64px]"
            >
              {/* Phones: "Binar-2000" never breaks at its hyphen. Desktop
                  keeps the title as one text run (a split run moves glyphs
                  by a sub-pixel under the fit zoom). */}
              <span className="lg:hidden">
                {COPY.title} <span className="whitespace-nowrap">{COPY.brand}</span>
              </span>
              <span className="max-lg:hidden">{`${COPY.title} ${COPY.brand}`}</span>
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={closeWelcome}
              aria-label={COPY.close}
              className="-mr-[10px] -my-2 flex size-11 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand max-lg:rounded-lg max-lg:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand lg:m-0 lg:size-8"
            >
              <XMarkIcon className="size-6 lg:size-8" />
            </button>
          </div>
          <p className="text-body-md text-neutral-800 lg:text-neutral-900">{COPY.lead}</p>
        </div>

        {/* Phone scroll body (tile + second line); desktop: display
            contents, so its two children stay the card's flex items. */}
        <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain lg:contents [@media(max-height:499px)]:flex-none [@media(max-height:499px)]:overflow-visible">
          <div className="flex flex-col items-center">
            <div className="flex w-full max-w-[321px] flex-col items-center gap-6 rounded-3xl bg-bg-subtle px-4 py-6 lg:gap-[27px] lg:px-8 lg:py-[30px]">
              <div className="relative flex size-[120px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-neutral-900 text-white lg:size-[144.648px] lg:rounded-[19.2864px]">
                {logo ? (
                  <img src={logo} alt={COPY.logoAlt} className="absolute inset-0 size-full object-cover" />
                ) : (
                  <PersonIcon className="size-[86.6px] lg:size-[106px]" />
                )}
              </div>
              <div className="flex w-full flex-col items-center gap-4 lg:gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    void onFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {/* The full label needs 257 px, the phone tile has 192 at
                    320: phones get the short label. A JS switch (the modal
                    opens only after hydration) keeps the desktop pill's
                    DOM exactly as it was. */}
                <Button
                  type="button"
                  size="small"
                  fullWidth
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {phone ? (logo ? COPY.replaceShort : COPY.uploadShort) : logo ? COPY.replace : COPY.upload}
                </Button>
                <p
                  role={error ? "alert" : undefined}
                  className={`w-full text-center text-[12px] leading-4 lg:text-[14px] lg:leading-6 ${
                    error ? "text-negative" : "text-neutral-500"
                  }`}
                >
                  {error ?? COPY.caption}
                </p>
              </div>
            </div>
          </div>

          <p className="text-body-md text-neutral-800 lg:text-neutral-900">{COPY.team}</p>
        </div>

        <Button type="button" variant="accent" fullWidth className="max-lg:flex-none" onClick={goToProfile}>
          {COPY.cta}
        </Button>
      </div>
    </div>
  );
}
