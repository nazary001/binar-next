import type { ReactNode } from "react";

// «Frame 1010106576» - the cabinet content surface right of the 104-px
// side rail in every Admin frame (ctx 4868:30962, 4868:31380, 5192:79072,
// 4396:11388, 4377:61581; the 5052:32106 dashboard render shows it too):
// #f5f5f5 (token bg-cabinet) with a 48-px top-left corner over the
// white page, pb-32 under the last block, stretching down to the legal
// bar. Phones keep square corners. Wrap a cabinet page's blocks in it
// (CabinetPageHead first).
export function CabinetPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col bg-bg-cabinet pb-8 lg:rounded-tl-[48px] ${className}`}>
      {children}
    </div>
  );
}
