"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { saveLogo } from "@/components/auth/api";
import { LOGO_MAX_BYTES, LOGO_MIME, LOGO_STORE_PX } from "@/components/auth/data";
import { Button } from "@/components/ui/Button";
import { COPY } from "./data";
import { PersonFilledIcon } from "./icons";

// Logo card - the two page frames draw it differently and the card
// follows the tab (both Empty copies repeat the split):
//   Співробітники 4868:31387 / 4929:64675 (364 x 298): white r24 p-24, a
//     189-px column centred in the card, gap 32: the 140-px dark <Avatar>
//     (#1d1d1f, r19.286, person glyph 101 px at 19.29 / 19.64 px in),
//     then gap 12: Button/Small «Завантажити лого» + «PNG,JPG до 5МБ»
//     (Regular 14/24 #777779);
//   Контрагенти 4868:30969 / 4929:64207 (364 x 310): the 144.648 avatar
//     centred at top 30 (glyph inset 19.29 = 106.07), the same 189 x 78
//     button column at top 202 (= 30 + 144.648 + 27.352), 30 below it.
// Upload: the same rules as the welcome modal (auth/WelcomeModal.tsx):
// PNG / JPG up to 5 MB, centre-cropped and downscaled to a 288-px square
// before it goes into the account (auth/api.ts saveLogo), so the header
// chip shows it too.
// Phones (variant "account", the "Дані" group): one fixed card for every
// group - white r32 p-24, the 120-px avatar (r16, never rounder than the
// desktop r19.3), 24 to the Button/Small, 16 to the 12/16 caption = 266.
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

export function LogoCard({
  logo,
  variant,
  onUploaded,
}: {
  logo?: string;
  variant: "counterparties" | "employees" | "account";
  onUploaded?: () => void;
}) {
  const tall = variant === "counterparties";
  const phone = variant === "account";
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_MIME.includes(file.type)) {
      setError(COPY.logo.errorType);
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError(COPY.logo.errorSize);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      saveLogo(await shrinkImage(file));
      onUploaded?.();
    } catch {
      setError(COPY.logo.errorRead);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Лого компанії"
      data-profile="logo-card"
      className={
        phone
          ? "flex items-center justify-center overflow-clip rounded-[32px] bg-white p-6"
          : `flex items-center justify-center overflow-clip rounded-3xl bg-white ${tall ? "h-[310px] px-6 py-[30px]" : "p-6"}`
      }
    >
      <div
        className={
          phone ? "flex w-full flex-col items-center gap-6" : `flex w-[189px] flex-col items-center ${tall ? "gap-[27.352px]" : "gap-8"}`
        }
      >
        <div
          data-profile="avatar"
          className={
            phone
              ? "relative size-[120px] shrink-0 overflow-hidden rounded-2xl bg-neutral-900 text-white"
              : `relative shrink-0 overflow-hidden rounded-[19.286px] bg-neutral-900 text-white ${
                  tall ? "size-[144.648px]" : "size-[140px]"
                }`
          }
        >
          {logo ? (
            <img src={logo} alt="Лого компанії" className="absolute inset-0 size-full object-cover" />
          ) : (
            <PersonFilledIcon
              className={
                phone
                  ? "absolute left-[16.5px] top-[16.5px] size-[86.6px]"
                  : `absolute left-[19.29px] top-[19.29px] ${tall ? "size-[106.068px]" : "size-[101.07px]"}`
              }
            />
          )}
        </div>
        <div className={`flex w-full flex-col items-center ${phone ? "gap-4" : "gap-3"}`}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="small"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {logo ? COPY.logo.replace : COPY.logo.upload}
          </Button>
          <p
            role={error ? "alert" : undefined}
            className={`w-full text-center ${phone ? "text-[12px] leading-4" : "text-[14px] leading-6"} ${error ? "text-negative" : "text-neutral-500"}`}
          >
            {error ?? COPY.logo.hint}
          </p>
        </div>
      </div>
    </section>
  );
}
