"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { XMarkIcon } from "@/components/catalog/icons";
import { useFitZoom } from "@/components/cart/useFitZoom";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import { saveLogo } from "./api";
import { useAuth } from "./AuthProvider";
import { LOGO_MAX_BYTES, LOGO_MIME, LOGO_STORE_PX } from "./data";
import { PersonIcon } from "./icons";

// «Вітаємо на платформі Binar-2000» — Figma 4573:35590, the first-login
// dialog: a 718-px centred card (white, 1-px #8e8e8f ring, r48, p-60
// with the ring inside the gutter, 40-px rhythm) over the blurred scrim.
// Caption/Large title + 32-px close; Body/Large «Раді бути вашими
// партнерами»; the #f8f8f8 r24 tile with the 144.65-px dark avatar
// (person glyph until a logo is chosen), the small «Завантажити лого
// компанії» pill and the «PNG, JPG до 5 МБ» caption; a Body/Large line
// and the full-width orange Button/Large «Перейти в профіль».
const MODAL_DESIGN_H = 706;
const AVATAR = 144.648;

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

  useModalBehavior({
    open: welcomeOpen,
    onClose: closeWelcome,
    container: dialogRef,
    initial: closeRef,
    inertSelector: "body > header",
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_MIME.includes(file.type)) {
      setError("Підтримуються лише PNG або JPG");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError("Файл більший за 5 МБ");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      saveLogo(await shrinkImage(file));
    } catch {
      setError("Не вдалося прочитати зображення");
    } finally {
      setBusy(false);
    }
  };

  const logo = user?.logo;

  return (
    <div
      aria-hidden={!welcomeOpen}
      inert={!welcomeOpen}
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 ${
        welcomeOpen ? "" : "pointer-events-none"
      }`}
    >
      <div
        aria-hidden
        onClick={closeWelcome}
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
        className={`scrollbar-hidden relative flex max-h-full w-[min(718px,100%)] flex-col gap-6 overflow-y-auto overscroll-contain rounded-[32px] border border-stroke-default bg-white p-6 transition-[opacity,scale] duration-300 sm:p-10 lg:gap-10 lg:rounded-[48px] lg:p-[59px] ${
          welcomeOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <h2
              id="welcome-title"
              className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900 lg:text-[32px] lg:tracking-[-0.64px]"
            >
              Вітаємо на платформі Binar-2000
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={closeWelcome}
              aria-label="Закрити"
              className="-mr-1 -mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand lg:m-0"
            >
              <XMarkIcon className="size-8" />
            </button>
          </div>
          <p className="text-body-sm text-neutral-900 lg:text-body-md">Раді бути вашими партнерами</p>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex w-full max-w-[321px] flex-col items-center gap-[27px] rounded-3xl bg-bg-subtle px-8 py-[30px]">
            <div
              className="relative flex shrink-0 items-center justify-center overflow-hidden bg-neutral-900 text-white"
              style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 7.5 }}
            >
              {logo ? (
                <img src={logo} alt="Лого компанії" className="absolute inset-0 size-full object-cover" />
              ) : (
                <PersonIcon className="size-[106px]" />
              )}
            </div>
            <div className="flex w-full flex-col items-center gap-3">
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
              <Button
                type="button"
                size="small"
                fullWidth
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {logo ? "Замінити лого компанії" : "Завантажити лого компанії"}
              </Button>
              <p
                role={error ? "alert" : undefined}
                className={`w-full text-center text-[14px] leading-6 ${
                  error ? "text-negative" : "text-neutral-500"
                }`}
              >
                {error ?? "PNG, JPG до 5 МБ"}
              </p>
            </div>
          </div>
        </div>

        <p className="text-body-sm text-neutral-900 lg:text-body-md">
          Додавайте співробітників та контрагентів у своєму профілі
        </p>

        <Button type="button" variant="accent" fullWidth onClick={goToProfile}>
          Перейти в профіль
        </Button>
      </div>
    </div>
  );
}
