// Profile glyphs, copied 1:1 from the Figma exports (same viewBox, same
// paths) and recoloured through currentColor:
//   PersonFilledIcon  public/figma-export/profile/avatar-person-filled-140.svg
//                     (the <Icon> of the 140-px <Avatar>, 4868:31390)
// The row chevron and the employee contact glyphs (ChevronRightIcon,
// PhoneIcon, MailIcon) are shared with the dashboard: platform/ui/icons.
// The contract cell's glyphs are shared: the single «document» is
// DocumentGlyph from platform/ui (byte-identical to
// profile/icon-document-24.svg), the «documents» of several contracts
// (4868:31125) is orderIcons OrderDocumentsIcon (returns/icon-documents-24.svg).

type IconProps = { className?: string };

export function PersonFilledIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 101.076 101.076" fill="none" aria-hidden className={className}>
      <path
        d="M50.5378 50.5378C59.8451 50.5378 67.3837 42.9992 67.3837 33.6918C67.3837 24.3845 59.8451 16.8459 50.5378 16.8459C41.2304 16.8459 33.6918 24.3845 33.6918 33.6918C33.6918 42.9992 41.2304 50.5378 50.5378 50.5378ZM50.5378 58.9607C39.2931 58.9607 16.8459 64.6041 16.8459 75.8066V84.2296H84.2296V75.8066C84.2296 64.6041 61.7824 58.9607 50.5378 58.9607Z"
        fill="currentColor"
      />
    </svg>
  );
}
