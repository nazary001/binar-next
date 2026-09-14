// Inline icon SVGs for the product page, exported 1:1 from the Figma
// masters (flattened paths, `fill="currentColor"` so each glyph follows
// its parent's text colour).

// Sale tag — the 16-px glyph inside the «-25%» chip on the product
// photo (Frame 1010106975, 4329:51646).
export function TagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M15.0038 9.20366C15.0647 9.26461 15.0647 9.36348 15.0038 9.42446L9.66059 14.7677C9.59961 14.8285 9.50073 14.8286 9.43979 14.7677L2.44749 7.77536C2.41834 7.74621 2.40192 7.70618 2.40177 7.66496L2.3828 2.30364C2.3825 2.21699 2.45312 2.14636 2.53977 2.14667L7.90109 2.16564C7.94231 2.16579 7.98234 2.18221 8.01149 2.21136L15.0038 9.20366ZM5.48005 4.12439C5.17086 3.81522 4.66969 3.81521 4.36052 4.12439C4.05134 4.43356 4.05135 4.93473 4.36052 5.24391C4.6697 5.5531 5.17086 5.5531 5.48005 5.24391C5.78923 4.93473 5.78923 4.43357 5.48005 4.12439Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Scent pyramid — «Верхні ноти» sparkles (Group 95, 4329:52100). The
// export is a 21.65×23.77 vector inset 5.21% / 0.48% in its 24-px box,
// so the group is offset to sit exactly where the master paints it.
export function NoteTopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <g transform="translate(1.25 0.115)">
        <path
          d="M7.80606 0L8.28578 2.02978C9.06859 5.34242 11.205 7.93183 13.9377 8.88079L15.6121 9.46233L13.9377 10.0439C11.205 10.9928 9.06896 13.5822 8.28615 16.8949L7.80643 18.9247L7.32672 16.8949C6.5439 13.5822 4.40785 10.9928 1.6752 10.0439L6.10352e-05 9.46277L1.67446 8.88124C4.40712 7.93228 6.54317 5.34242 7.32635 2.03023L7.80606 0Z"
          fill="currentColor"
        />
        <path
          d="M17.0694 12.6768L17.3506 13.8667C17.8095 15.8087 19.062 17.3267 20.664 17.883L21.6456 18.224L20.664 18.5649C19.062 19.1212 17.8097 20.6392 17.3508 22.5812L17.0696 23.7712L16.7883 22.5812C16.3294 20.6392 15.0772 19.1212 13.4752 18.5649L12.4932 18.2242L13.4748 17.8833C15.0768 17.327 16.329 15.8087 16.7881 13.867L17.0694 12.6768Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

// «Середні ноти» heart (Frame 1010107105, 4329:52117).
export function NoteMiddleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M21 8.25C21 5.76472 18.9013 3.75 16.3125 3.75C14.3769 3.75 12.7153 4.87628 12 6.48342C11.2847 4.87628 9.62312 3.75 7.6875 3.75C5.09867 3.75 3 5.76472 3 8.25C3 15.4706 12 20.25 12 20.25C12 20.25 21 15.4706 21 8.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

// «Нижні ноти» hexagon (Frame 1010107106, 4329:52132).
export function NoteBaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 3L19.7942 7.5V16.5L12 21L4.20577 16.5V7.5L12 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
