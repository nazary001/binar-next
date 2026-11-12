"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { MediaDto } from "../media/types";
import { Button } from "../ui/Button";
import { FileField, type FileValue } from "../ui/media/FileField";
import { GalleryField } from "../ui/media/GalleryField";
import { ImageField } from "../ui/media/ImageField";
import { MediaPicker } from "../ui/media/MediaPicker";
import { SAMPLE_IMAGES } from "./demoData";
import { Note, Row, Sample, Section } from "./parts";

export function MediaDemo() {
  const [cover, setCover] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [photo, setPhoto] = useState(SAMPLE_IMAGES[0]);
  const [logo, setLogo] = useState(SAMPLE_IMAGES[3]);
  const [gallery, setGallery] = useState<string[]>(SAMPLE_IMAGES.slice(0, 4));
  const [invoice, setInvoice] = useState<FileValue | null>(null);
  const [price, setPrice] = useState<FileValue | null>({ mediaId: "zz-test-price", name: "Прайс Бінар 2000, листопад 2026.xlsx", size: 284311 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<MediaDto | null>(null);

  return (
    <Section
      id="media"
      title="ImageField, GalleryField, FileField, MediaPicker"
      file="ui/media/*"
      description="Завантаження в медіатеку: перетягування, вибір, вставка з буфера, великі фото зменшуються в браузері."
    >
      <Sample title="ImageField">
        <div className="grid min-w-0 gap-6 min-[1024px]:grid-cols-3">
          <ImageField
            label="Обкладинка допису"
            folder="blog"
            aspect="wide"
            value={cover}
            onChange={setCover}
            alt={coverAlt}
            onAltChange={setCoverAlt}
            hint="16:9, щонайменше 1200 px завширшки"
            className="min-[1024px]:col-span-2"
          />
          <ImageField label="Фото товару" folder="products" aspect="square" value={photo} onChange={setPhoto} required />
          <ImageField label="Логотип клієнта" folder="misc" aspect="free" value={logo} onChange={setLogo} optional />
          <ImageField label="З помилкою" folder="products" value="" onChange={() => {}} error="Додайте фото товару." required />
          <ImageField label="Вимкнене" folder="products" value="" onChange={() => {}} disabled />
        </div>
      </Sample>

      <Sample title="GalleryField">
        <GalleryField label="Галерея товару" folder="products" max={8} value={gallery} onChange={setGallery} hint="До 8 зображень" />
        <Note>Порядок: {gallery.map((url) => SAMPLE_IMAGES.indexOf(url) + 1 || "нове").join(", ")}</Note>
      </Sample>

      <Sample title="FileField">
        <div className="grid min-w-0 gap-6 min-[1024px]:grid-cols-2">
          <FileField label="Рахунок" folder="orders" access="private" accept=".pdf" value={invoice} onChange={setInvoice} hint="PDF, бачать лише працівники" />
          <FileField label="Прайс-лист" folder="materials" access="public" value={price} onChange={setPrice} />
          <FileField label="З помилкою" folder="orders" access="private" value={null} onChange={() => {}} error="Додайте файл договору." required />
          <FileField label="Вимкнене" folder="orders" access="private" value={null} onChange={() => {}} disabled />
        </div>
      </Sample>

      <Sample title="MediaPicker">
        <Row>
          <Button variant="secondary" onClick={() => setPickerOpen(true)}>
            Обрати з медіатеки
          </Button>
          {picked && (
            <span className="inline-flex items-center gap-2 text-[14px]">
              {picked.kind === "image" && picked.url && <img src={picked.url} alt="" className="size-8 rounded-lg object-cover" />}
              Обрано: {picked.filename}
            </span>
          )}
        </Row>
        <Note>Медіатека читає GET /api/admin/media: порожня показує заклик завантажити файл, збій - «Спробувати ще раз».</Note>
        <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={setPicked} />
      </Sample>
    </Section>
  );
}
