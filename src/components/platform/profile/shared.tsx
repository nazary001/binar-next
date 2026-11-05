"use client";

import type { ReactNode } from "react";
import { CABINET_SECTION_TITLE } from "@/components/platform/ui/CabinetPageHead";
import { Button } from "@/components/ui/Button";

// Pill widths: ui/Button pads every size 23 px + its 1-px border = the
// master's 24 + text + 24 (stroke inside), so the Button/Small pills
// come out at Figma's «Завантажити лого» 189, «Змінити пароль» 169,
// «Додати контрагента» 207, «Запросити співробітника» 243, «Копіювати»
// 129 with no per-call override.

// The full-width submit of the profile modals: accent (4868:31193,
// 4868:31339) or black, greyed out while the form is incomplete with
// Figma «Button/Large» State=Disabled (4868:31335, 4868:31302: #e8e8e9
// fill, #a5a5a5 label) = ui/Button disabledStyle="solid".
export function SubmitButton({
  children,
  disabled,
  variant = "accent",
  onClick,
  type = "button",
  form,
}: {
  children: ReactNode;
  disabled?: boolean;
  variant?: "accent" | "solid";
  onClick?: () => void;
  type?: "button" | "submit";
  // The id of the form it submits when it renders outside of it (the
  // phone sheet footer of "Додати контрагента").
  form?: string;
}) {
  return (
    <Button type={type} form={form} variant={variant} fullWidth disabled={disabled} disabledStyle="solid" onClick={onClick}>
      {children}
    </Button>
  );
}

// Section head inside the 1144 card: Title/Medium 22/28 Bold -2 % at
// h-80 pt-24 pb-16 px-24 («Дані компанії» 4868:30989, «Безпека»
// 4868:30999). Phones: Title Large 22/28 SemiBold, 24 to the first field.
export function CardTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div className="flex items-center px-6 pb-6 pt-6 lg:h-20 lg:pb-4">
      <h2 id={id} className={CABINET_SECTION_TITLE}>
        {children}
      </h2>
    </div>
  );
}
