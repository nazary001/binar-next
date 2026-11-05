import { ClearIcon, DocumentGlyph } from "./icons";

// «Frame 1010107159» 4868:31362 in «Додати договір» (file uploaded state
// 4868:31336): the 598 x 100 row that appears 32 px under the dropzone
// once a file is chosen. XML geometry: p-24, the 52-px «Info icon» tile with
// the 24-px document glyph 14 px in, gap 16, a column of the file name
// (24 tall) and «Визначаємо номер і дату договору...» (241 wide = Manrope
// Regular 14/24), a 24-px «clear» at x 550 / y 38 (24 from the right
// edge, centred). Styles confirmed by ctx/4868-31339.md (tile 4868:31363):
// #f8f8f8 r24 p-24 gap 27, #343435 tile, Bold 16/24 #1d1d1f name,
// 14/24 #777779 status line.
// Phones (< 640, profile SN-21): p 16 gap 16, the 48 tile r12, the name
// 16/22 on up to two lines, the note 14/20 wrapping, the cross in a 44 box.
export type UploadedFileTileProps = {
  name: string;
  note?: string;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
};

export const UPLOAD_PARSING_NOTE = "Визначаємо номер і дату договору...";

export function UploadedFileTile({
  name,
  note = UPLOAD_PARSING_NOTE,
  onRemove,
  removeLabel,
  className = "",
}: UploadedFileTileProps) {
  return (
    <div className={`flex min-w-0 items-center gap-4 overflow-clip rounded-[24px] bg-bg-subtle p-4 lg:gap-[27px] lg:p-6 ${className}`}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span aria-hidden className="relative size-12 shrink-0 overflow-clip rounded-xl bg-neutral-800 text-white lg:size-[52px]">
          <DocumentGlyph className="absolute left-3 top-3 size-6 lg:left-[14px] lg:top-[14px]" />
        </span>
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <p className="text-[16px] font-bold leading-[22px] text-neutral-900 max-lg:line-clamp-2 lg:truncate lg:leading-6">{name}</p>
          {note && <p className="text-[14px] leading-5 text-neutral-500 lg:truncate lg:leading-6">{note}</p>}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `Видалити файл ${name}`}
          className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 before:absolute before:-inset-2.5 before:content-[''] hover:text-brand lg:before:-inset-2"
        >
          <ClearIcon className="size-6" />
        </button>
      )}
    </div>
  );
}
