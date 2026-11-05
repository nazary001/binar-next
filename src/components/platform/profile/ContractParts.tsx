"use client";

import { DocumentGlyph, DotIcon, EyeIcon, KebabMenu, StatusPill } from "@/components/platform/ui";
import { contractFileUrl } from "./actions";
import { CONTRACT_STATUS, COPY, formatDate, formatSize, type Contract } from "./data";

// Contract pieces of the «Один договір» (4868:31167) and «Кілька
// договорів» (4868:31197) modals.
// Phones (< 640, profile spec 2.7 / TR-25): plain rows instead of the grey
// r24 tiles (1-px #d2d2d2 lines between the sheet rows), the 48 file tile
// r12, the file name on up to two lines, the meta line with its dots glued
// to the part before them (a line never starts with a dot), the kebab and
// the eye as 40-px outlined discs 8 apart (44-px hit boxes). Every desktop
// value sits behind lg:.

// The contract file row: 52-px «Info icon» tile (#343435 r12, the 24-px
// document glyph 14 px in, white), gap 16, a column (gap 4) of the file
// name (Bold 16/24 #1d1d1f) and «19.09.2025 · 0.9 МБ · PDF» (Regular
// 14/24 #777779, 14-px #bbbbbc dots, gap 4).
function FileRow({ contract }: { contract: Contract }) {
  const meta = [formatDate(contract.date), formatSize(contract.file.size), contract.file.format];
  return (
    <div className="flex min-w-0 flex-1 items-start gap-4">
      <span aria-hidden className="relative size-12 shrink-0 overflow-clip rounded-xl bg-neutral-800 text-white lg:size-[52px]">
        <DocumentGlyph className="absolute left-3 top-3 size-6 lg:left-[14px] lg:top-[14px]" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[16px] font-bold leading-[22px] text-neutral-900 max-lg:line-clamp-2 lg:truncate lg:leading-6">
          {contract.file.name}
        </p>
        <p className="text-[14px] leading-5 text-neutral-500 lg:hidden">
          {meta.map((part, i) => (
            <span key={i}>
              <span className="whitespace-nowrap">
                {part}
                {i < meta.length - 1 && <span className="text-[#bbbbbc]"> ·</span>}
              </span>
              {i < meta.length - 1 && " "}
            </span>
          ))}
        </p>
        <p className="flex min-w-0 flex-wrap items-center gap-1 text-[14px] leading-6 text-neutral-500 max-lg:hidden">
          {meta.map((part, i) => (
            <span key={i} className="contents">
              {i > 0 && <DotIcon className="size-[14px] shrink-0" />}
              <span className="whitespace-nowrap">{part}</span>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

// Opens the scan (this session's upload, else the placeholder PDF).
export function previewContract(contract: Contract) {
  window.open(contractFileUrl(contract.id), "_blank", "noopener");
}

export function downloadContract(contract: Contract) {
  const a = document.createElement("a");
  a.href = contractFileUrl(contract.id);
  a.download = contract.file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const ACTION =
  "relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-900 text-neutral-900 transition-colors duration-200 before:absolute before:-inset-0.5 before:content-[''] hover:text-brand max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand lg:size-6 lg:rounded-none lg:border-0 lg:before:-inset-2";

function ContractActions({
  contract,
  onRemove,
  menuClassName,
}: {
  contract: Contract;
  onRemove: () => void;
  menuClassName?: string;
}) {
  return (
    <>
      {/* The contracts «<Menu>» 4868:31272 draws its 0.5-px «Vector 443»
          hairline under «Завантажити» only (the employee menu 4868:31444
          has both). */}
      <KebabMenu
        phoneDisc
        label={`Дії: договір ${contract.number}`}
        lastDivider={false}
        menuClassName={menuClassName}
        items={[
          { key: "download", label: COPY.contracts.download, onSelect: () => downloadContract(contract) },
          { key: "remove", label: COPY.contracts.remove, onSelect: onRemove },
        ]}
      />
      <button
        type="button"
        onClick={() => previewContract(contract)}
        aria-label={`Переглянути: ${contract.file.name}`}
        className={ACTION}
      >
        <EyeIcon className="size-5 lg:size-6" />
      </button>
    </>
  );
}

// «Один договір» tile 4868:31176 (598 x 108): #f8f8f8 r24 p-24, gap 27,
// items-center; the right column stacks «more» over «eye» (gap 12).
export function ContractTile({ contract, onRemove }: { contract: Contract; onRemove: () => void }) {
  return (
    <div
      data-profile="contract-tile"
      className="flex items-start gap-2 lg:items-center lg:gap-[27px] lg:rounded-3xl lg:bg-bg-subtle lg:p-6"
    >
      <FileRow contract={contract} />
      <div className="flex shrink-0 flex-col items-end gap-2 lg:gap-3">
        <ContractActions contract={contract} onRemove={onRemove} />
      </div>
    </div>
  );
}

// The sm pill of the contract cards (4868:31210 / 31232): 30 tall, px-12
// py-4, r40, Medium 14/22; «Діє» keeps the master's fixed 69-px width.
function ContractPill({ contract }: { contract: Contract }) {
  const s = CONTRACT_STATUS[contract.status];
  return (
    <span
      className="inline-flex h-[30px] shrink-0 items-center justify-center whitespace-nowrap rounded-[40px] px-3 py-1 text-[14px] font-medium leading-[22px]"
      style={{ backgroundColor: s.pill.bg, color: s.pill.text, width: s.pill.width }}
    >
      {s.label}
    </span>
  );
}

// The title badge of «Один договір» (4868:31173): md pill with the dot.
export function ContractBadge({ contract }: { contract: Contract }) {
  const s = CONTRACT_STATUS[contract.status];
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
}

// «Кілька договорів» card 4868:31206 (598 x 146): #f8f8f8 r24 p-24, gap
// 27, items-start; left column gap 16: number (Title/Small ExtraBold
// 18/24 -2 %) + pill (gap 16), then the file row; the right column runs
// the full height: «more» at the top, «eye» at the bottom. The open menu
// (4868:31272) hangs 10.5 px under the glyph, right edges aligned.
export function ContractCard({ contract, onRemove }: { contract: Contract; onRemove: () => void }) {
  return (
    <div
      data-profile="contract-card"
      className="flex items-start gap-2 border-t border-stroke-subtle py-4 first:border-t-0 first:pt-0 last:pb-0 lg:gap-[27px] lg:rounded-3xl lg:border-t-0 lg:bg-bg-subtle lg:p-6 lg:first:pt-6 lg:last:pb-6"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 lg:gap-4">
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-4">
          <p className="whitespace-nowrap text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900 lg:text-[18px] lg:font-extrabold lg:leading-6 lg:tracking-[-0.36px]">
            {contract.number}
          </p>
          <ContractPill contract={contract} />
        </div>
        <FileRow contract={contract} />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 lg:gap-0 lg:justify-between lg:self-stretch">
        <ContractActions contract={contract} onRemove={onRemove} menuClassName="lg:!top-[calc(100%+10.5px)]" />
      </div>
    </div>
  );
}
