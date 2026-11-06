"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

// RollingNumber - a number whose digits roll like an odometer when the
// value changes: the cart quantities, line totals, the order sum, the
// free-delivery chip, the header badge, the «6 товарів» head row.
//
// Until the first change it renders the formatted text as plain text,
// byte for byte what the server sent, so nothing about the static page
// moves. From the first change on the text becomes a row of slots:
//   - every digit is a slot keyed by its place value (units, tens, ...,
//     and the two fraction digits of «1 250,00 ₴»), so when the quantity
//     goes 2 -> 3 only the units slot rolls - up for a growing value,
//     down for a shrinking one, a 9 -> 0 carry rolls one step on and
//     never nine steps back;
//   - a slot is exactly as wide as the glyph it shows (Manrope digits are
//     proportional, «1» is narrower than «8»), so the row keeps the
//     plain text's width and the widths tween along with the roll;
//   - digits and separators that appear (999 -> 1 000) grow in from zero
//     width while rolling up from 0, ones that go collapse the same way;
//     a changed word («товари» -> «товарів») cross-fades;
//   - rapid changes (holding «+») continue from wherever the digits are
//     at that moment, the roll never jumps back to restart.
// The motion runs through the Web Animations API (the CartDisc idiom):
// React renders nothing per frame, and a new change can read where the
// one in flight has got to. Reduced motion: the slots just switch.
// Glyph widths come from one hidden ruler per font (family, weight,
// tracking ...), measured in em, so the same metrics serve every size
// and the drawer's CSS zoom.

const DURATION = 600;
const FADE = 320;
// Slots to the left start a little later, the carry ripples outward.
const STAGGER = 24;
const STAGGER_MAX = 96;
const BEZIER: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASING = `cubic-bezier(${BEZIER.join(", ")})`;
const EASE_OUT = "cubic-bezier(0.33, 1, 0.68, 1)";
// The slot clips the rolling column to its line box; the horizontal
// slack leaves a glyph's side bearings alone.
const CLIP = "inset(0 -0.2em)";
const GROUP_SEPARATORS = new Set([" ", " ", " ", " ", "'"]);
const DECIMAL_SEPARATORS = new Set([",", "."]);

const mod10 = (n: number) => ((n % 10) + 10) % 10;

// The CSS easing as a function, so a change that lands mid-roll knows
// where the digits visually are (the Web Animations API reports only
// the linear progress).
function cubicBezier([x1, y1, x2, y2]: [number, number, number, number]) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= err / slope;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 40 && lo < hi; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (x > v) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}
const ease = cubicBezier(BEZIER);

// ---------------------------------------------------------------- parts

// `start` / `end`: the part's character span in the formatted string
// (its width is the difference of two prefix widths, see Flow.widthOf).
type Part =
  | { key: string; kind: "digit"; digit: number; place: number; start: number; end: number }
  | { key: string; kind: "text"; text: string; place: number; start: number; end: number };

// Splits a formatted string into keyed parts. Digits are keyed by their
// place value inside their number (so «999» and «1 000» share the units,
// tens and hundreds slots), group separators by the place of the digit
// before them, the decimal separator as such; text before, between and
// after the numbers by position («-», « ₴», « товарів», «+»).
function parse(text: string): Part[] {
  type Run = { digit: boolean; text: string; start: number; end: number };
  const runs: Run[] = [];
  let pos = 0;
  for (const ch of text) {
    const digit = ch >= "0" && ch <= "9";
    const last = runs[runs.length - 1];
    if (!digit && last && !last.digit) {
      last.text += ch;
      last.end = pos + ch.length;
    } else {
      runs.push({ digit, text: ch, start: pos, end: pos + ch.length });
    }
    pos += ch.length;
  }
  const isSeparator = (i: number) => {
    const run = runs[i];
    return (
      run !== undefined &&
      !run.digit &&
      run.text.length === 1 &&
      (GROUP_SEPARATORS.has(run.text) || DECIMAL_SEPARATORS.has(run.text)) &&
      runs[i - 1]?.digit === true &&
      runs[i + 1]?.digit === true
    );
  };
  type Segment = { number: true; runs: Run[] } | { number: false; run: Run };
  const segments: Segment[] = [];
  for (let i = 0; i < runs.length; ) {
    const run = runs[i];
    if (!run.digit) {
      segments.push({ number: false, run });
      i++;
      continue;
    }
    const group: Run[] = [run];
    i++;
    while (i < runs.length && (runs[i].digit || isSeparator(i))) {
      group.push(runs[i]);
      i++;
    }
    segments.push({ number: true, runs: group });
  }
  const numbers = segments.filter((s) => s.number).length;
  const parts: Part[] = [];
  let g = -1;
  let textIndex = 0;
  for (const segment of segments) {
    if (!segment.number) {
      const where = g < 0 ? "pre" : g === numbers - 1 ? "suf" : `mid${g}_`;
      const { text, start, end } = segment.run;
      parts.push({ key: `${where}${textIndex++}`, kind: "text", text, place: 0, start, end });
      continue;
    }
    g++;
    textIndex = 0;
    const decimalAt = segment.runs.findIndex((r) => !r.digit && DECIMAL_SEPARATORS.has(r.text));
    const integerRuns = decimalAt < 0 ? segment.runs : segment.runs.slice(0, decimalAt);
    let place = integerRuns.filter((r) => r.digit).length;
    let fraction = 0;
    let afterDecimal = false;
    for (const run of segment.runs) {
      const { text, start, end } = run;
      if (run.digit) {
        const p = afterDecimal ? -++fraction : --place;
        parts.push({ key: `${g}d${p}`, kind: "digit", digit: Number(text), place: Math.max(0, p), start, end });
      } else if (!afterDecimal && DECIMAL_SEPARATORS.has(text)) {
        afterDecimal = true;
        parts.push({ key: `${g}dec`, kind: "text", text, place: 0, start, end });
      } else {
        parts.push({ key: `${g}g${place}`, kind: "text", text, place, start, end });
      }
    }
  }
  return parts;
}

const delayOf = (part: Part) => Math.min(STAGGER_MAX, part.place * STAGGER);

// -------------------------------------------------------------- metrics

// Glyph advances in em, per font. One hidden ruler at 100 px measures
// each text once; the ratio to a 100-px reference box cancels the page's
// CSS zoom (the ruler sits under the zoomed html like everything else).
const metrics = new Map<string, Map<string, number>>();
let ruler: { box: HTMLSpanElement; probe: HTMLSpanElement; ref: HTMLSpanElement } | null = null;
const flows = new Set<Flow>();
let fontsHooked = false;

function getRuler() {
  if (ruler) return ruler;
  const box = document.createElement("span");
  box.setAttribute("aria-hidden", "true");
  // A 0 x 0 clipped box: the probe's text (a price at 100 px is ~500 px
  // wide) must never widen the document - a phone's layout viewport
  // grows to fit overflowing content, which would stretch every fixed
  // layer (the cart sheet went 390 -> 481 before this).
  Object.assign(box.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    overflow: "clip",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre",
    fontSize: "100px",
    lineHeight: "1",
    zIndex: "-1",
  } satisfies Partial<CSSStyleDeclaration>);
  const ref = document.createElement("span");
  Object.assign(ref.style, { display: "inline-block", width: "100px", height: "1px" });
  const probe = document.createElement("span");
  box.append(ref, probe);
  document.body.appendChild(box);
  ruler = { box, probe, ref };
  return ruler;
}

function measurer(cs: CSSStyleDeclaration): (text: string) => number | null {
  if (typeof document === "undefined") return () => null;
  const size = parseFloat(cs.fontSize) || 16;
  const tracking = cs.letterSpacing === "normal" ? 0 : (parseFloat(cs.letterSpacing) || 0) / size;
  const font = {
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
    fontStretch: cs.fontStretch,
    fontVariantNumeric: cs.fontVariantNumeric,
    fontFeatureSettings: cs.fontFeatureSettings,
    fontVariationSettings: cs.fontVariationSettings,
    fontKerning: cs.fontKerning,
    textRendering: cs.textRendering,
  };
  const key = `${Object.values(font).join("|")}|${tracking.toFixed(4)}`;
  let known = metrics.get(key);
  if (!known) {
    known = new Map();
    metrics.set(key, known);
  }
  const cache = known;
  return (text) => {
    const hit = cache.get(text);
    if (hit !== undefined) return hit;
    try {
      const r = getRuler();
      Object.assign(r.box.style, font, { letterSpacing: `${tracking * 100}px` });
      r.probe.textContent = text;
      const ref = r.ref.getBoundingClientRect().width;
      if (!(ref > 0)) return null;
      const em = r.probe.getBoundingClientRect().width / ref;
      cache.set(text, em);
      return em;
    } catch {
      return null;
    }
  };
}

// Webfonts that land after a number went live change every advance:
// drop the cache and re-measure the live rows.
function hookFonts() {
  if (fontsHooked || typeof document === "undefined" || !("fonts" in document)) return;
  fontsHooked = true;
  document.fonts.addEventListener("loadingdone", () => {
    metrics.clear();
    flows.forEach((flow) => flow.remeasure());
  });
}

// --------------------------------------------------------------- roller

const ITEM_STYLE: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  inset: "0",
  whiteSpace: "pre",
};

// One digit slot: a hidden in-flow digit sizes the line box (and the
// width when no metrics exist), the absolute column above it holds the
// digits rolling past. `pos` is the unwrapped position (… 8, 9, 10 is
// «0» again, 11 …), so a carry keeps rolling forward.
class Roller {
  readonly column: HTMLSpanElement;
  readonly sizer: HTMLSpanElement;
  private pos: number;
  private from: number;
  private delay = 0;
  private anims: Animation[] = [];

  constructor(digit: number, private motion: boolean) {
    this.pos = this.from = digit;
    this.sizer = document.createElement("span");
    Object.assign(this.sizer.style, { display: "block", visibility: "hidden", whiteSpace: "pre" });
    this.sizer.textContent = String(digit);
    this.column = document.createElement("span");
    Object.assign(this.column.style, { position: "absolute", inset: "0" });
    this.render(digit, digit, digit);
  }

  // Where the column visually is right now (fractional mid-roll).
  private visual(): number {
    const anim = this.anims[0];
    if (!anim) return this.pos;
    const t = typeof anim.currentTime === "number" ? anim.currentTime : 0;
    const p = Math.min(1, Math.max(0, (t - this.delay) / DURATION));
    return this.from + (this.pos - this.from) * ease(p);
  }

  // Direction: with the value's trend while that is at most half a turn
  // (a carry 9 -> 0 rolls one step on, never nine back), the shorter way
  // round otherwise - the lower digits of a price change almost at
  // random, and spinning each of them most of a turn on every «+» reads
  // as noise, not as counting.
  roll(digit: number, trend: number, delay: number) {
    const current = mod10(this.pos);
    if (digit === current) return;
    const up = (digit - current + 10) % 10;
    const down = (current - digit + 10) % 10;
    const step =
      trend > 0 && up <= 5 ? up : trend < 0 && down <= 5 ? -down : up <= down ? up : -down;
    const target = this.pos + step;
    const start = this.motion ? this.visual() : this.pos;
    this.sizer.textContent = String(digit);
    this.anims.forEach((a) => a.cancel());
    this.anims = [];
    if (!this.motion) {
      this.pos = this.from = target;
      this.render(target, target, target);
      return;
    }
    const lo = Math.floor(Math.min(start, target));
    const hi = Math.ceil(Math.max(start, target));
    const items = this.render(lo, hi, target);
    this.from = start;
    this.pos = target;
    this.delay = delay;
    items.forEach((item, i) => {
      const n = lo + i;
      this.anims.push(
        item.animate(
          [
            { transform: `translateY(${(n - start) * 100}%)` },
            { transform: `translateY(${(n - target) * 100}%)` },
          ],
          { duration: DURATION, delay, easing: EASING, fill: "backwards" },
        ),
      );
    });
    const lead = this.anims[0];
    lead.onfinish = () => {
      if (this.anims[0] !== lead) return;
      this.anims = [];
      this.render(target, target, target);
    };
  }

  private render(lo: number, hi: number, pos: number): HTMLSpanElement[] {
    this.column.replaceChildren();
    const items: HTMLSpanElement[] = [];
    for (let n = lo; n <= hi; n++) {
      const item = document.createElement("span");
      Object.assign(item.style, ITEM_STYLE, { transform: `translateY(${(n - pos) * 100}%)` });
      item.textContent = String(mod10(n));
      this.column.appendChild(item);
      items.push(item);
    }
    return items;
  }

  destroy() {
    this.anims.forEach((a) => a.cancel());
    this.anims = [];
  }
}

// ----------------------------------------------------------------- flow

type Slot = {
  part: Part;
  el: HTMLSpanElement;
  width: number | null;
  exiting: boolean;
  roller: Roller | null;
  text: HTMLSpanElement | null;
  widthAnim: Animation | null;
  fadeAnim: Animation | null;
};

const SR_ONLY: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
};

const SLOT_STYLE: Partial<CSSStyleDeclaration> = {
  position: "relative",
  display: "block",
  flex: "none",
  whiteSpace: "pre",
  clipPath: CLIP,
  userSelect: "none",
};

// The live row: owns the slots inside the root span (React renders the
// root empty while live) and moves them between formatted strings.
class Flow {
  private readonly label: HTMLSpanElement;
  private slots = new Map<string, Slot>();
  private em: (text: string) => number | null;
  private readonly motion: boolean;

  constructor(
    private readonly root: HTMLElement,
    private formatted: string,
    private value: number,
  ) {
    this.motion =
      typeof root.animate === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.em = measurer(getComputedStyle(root));
    hookFonts();
    flows.add(this);
    // The plain text for assistive tech, selection and copy; the slots
    // are decoration.
    this.label = document.createElement("span");
    Object.assign(this.label.style, SR_ONLY);
    this.label.textContent = formatted;
    root.appendChild(this.label);
    for (const part of parse(formatted)) {
      const slot = this.create(part);
      root.appendChild(slot.el);
    }
  }

  // A part's width in em: the difference of two prefix widths of the
  // whole string, so kerning and tracking land exactly where the plain
  // text had them and the row keeps the plain text's width.
  private widthOf(part: Part): number | null {
    const before = part.start === 0 ? 0 : this.em(this.formatted.slice(0, part.start));
    const upTo = this.em(this.formatted.slice(0, part.end));
    return before === null || upTo === null ? null : Math.max(0, upTo - before);
  }

  update(formatted: string, value: number) {
    if (formatted === this.formatted) {
      this.value = value;
      return;
    }
    const delta = value - this.value;
    const trend = Number.isFinite(delta) ? Math.sign(delta) : 0;
    this.value = value;
    this.formatted = formatted;
    this.label.textContent = formatted;
    const next = parse(formatted);
    const keep = new Set(next.map((p) => p.key));
    this.slots.forEach((slot, key) => {
      if (!keep.has(key) && !slot.exiting) this.exit(slot, trend);
    });
    let cursor: ChildNode = this.label;
    for (const part of next) {
      let slot = this.slots.get(part.key);
      if (!slot) {
        slot = this.create(part, true);
        this.root.insertBefore(slot.el, cursor.nextSibling);
        this.enter(slot, part, trend);
      } else {
        if (cursor.nextSibling !== slot.el) this.root.insertBefore(slot.el, cursor.nextSibling);
        this.change(slot, part, trend);
      }
      cursor = slot.el;
    }
  }

  // Fonts settled: refresh every width without motion.
  remeasure() {
    this.em = measurer(getComputedStyle(this.root));
    this.slots.forEach((slot) => {
      if (slot.exiting) return;
      slot.widthAnim?.cancel();
      slot.widthAnim = null;
      slot.width = this.widthOf(slot.part);
      slot.el.style.width = slot.width === null ? "" : `${slot.width}em`;
    });
  }

  destroy() {
    flows.delete(this);
    this.slots.forEach((slot) => {
      slot.roller?.destroy();
      slot.widthAnim?.cancel();
      slot.fadeAnim?.cancel();
    });
    this.slots.clear();
    this.root.replaceChildren();
  }

  private create(part: Part, entering = false): Slot {
    const el = document.createElement("span");
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, SLOT_STYLE);
    const slot: Slot = {
      part,
      el,
      width: this.widthOf(part),
      exiting: false,
      roller: null,
      text: null,
      widthAnim: null,
      fadeAnim: null,
    };
    if (part.kind === "digit") {
      // An entering digit rolls in from 0 (enter() does the roll).
      const roller = new Roller(entering ? 0 : part.digit, this.motion);
      el.append(roller.sizer, roller.column);
      slot.roller = roller;
    } else {
      const text = document.createElement("span");
      Object.assign(text.style, { display: "block", whiteSpace: "pre" });
      text.textContent = part.text;
      el.appendChild(text);
      slot.text = text;
    }
    if (slot.width !== null) el.style.width = `${slot.width}em`;
    this.slots.set(part.key, slot);
    return slot;
  }

  private enter(slot: Slot, part: Part, trend: number) {
    const delay = delayOf(part);
    this.tweenWidth(slot, slot.width, delay, "0px");
    this.tweenOpacity(slot, 1, delay, "0");
    if (slot.roller && part.kind === "digit") slot.roller.roll(part.digit, trend || 1, delay);
  }

  private exit(slot: Slot, trend: number) {
    slot.exiting = true;
    const delay = delayOf(slot.part);
    this.tweenWidth(slot, 0, delay, undefined, () => {
      if (!slot.exiting) return;
      slot.roller?.destroy();
      slot.el.remove();
      if (this.slots.get(slot.part.key) === slot) this.slots.delete(slot.part.key);
    });
    this.tweenOpacity(slot, 0, delay);
    slot.roller?.roll(0, trend || -1, delay);
  }

  private change(slot: Slot, part: Part, trend: number) {
    const delay = delayOf(part);
    const wasExiting = slot.exiting;
    slot.exiting = false;
    slot.part = part;
    const width = this.widthOf(part);
    if (wasExiting || width !== slot.width) this.tweenWidth(slot, width, delay);
    if (wasExiting) this.tweenOpacity(slot, 1, delay);
    if (slot.roller && part.kind === "digit") slot.roller.roll(part.digit, trend, delay);
    else if (slot.text && part.kind === "text") this.swapText(slot, part.text, trend, delay);
  }

  // Width in em; the from value is what the slot measures right now (a
  // tween in flight included), unless given.
  private tweenWidth(slot: Slot, width: number | null, delay: number, from?: string, done?: () => void) {
    const start = from ?? getComputedStyle(slot.el).width;
    slot.widthAnim?.cancel();
    slot.widthAnim = null;
    slot.width = width;
    const to = width === null ? "" : `${width}em`;
    slot.el.style.width = to;
    if (!this.motion || width === null) {
      done?.();
      return;
    }
    try {
      const anim = slot.el.animate([{ width: start }, { width: to }], {
        duration: DURATION,
        delay,
        easing: EASING,
        fill: "backwards",
      });
      slot.widthAnim = anim;
      anim.onfinish = () => {
        if (slot.widthAnim === anim) slot.widthAnim = null;
        done?.();
      };
    } catch {
      done?.();
    }
  }

  private tweenOpacity(slot: Slot, opacity: number, delay: number, from?: string) {
    const start = from ?? getComputedStyle(slot.el).opacity;
    slot.fadeAnim?.cancel();
    slot.fadeAnim = null;
    slot.el.style.opacity = opacity === 1 ? "" : String(opacity);
    if (!this.motion) return;
    try {
      slot.fadeAnim = slot.el.animate([{ opacity: start }, { opacity }], {
        duration: FADE,
        delay,
        easing: EASE_OUT,
        fill: "backwards",
      });
    } catch {
      // Discrete fallback: the final state is already set.
    }
  }

  // A word that changed («товари» -> «товарів»): the old text slides
  // out the way the digits roll, the new one slides in behind it.
  private swapText(slot: Slot, text: string, trend: number, delay: number) {
    const current = slot.text;
    if (!current || current.textContent === text) return;
    if (!this.motion) {
      current.textContent = text;
      return;
    }
    const ghost = current.cloneNode(true) as HTMLSpanElement;
    Object.assign(ghost.style, { position: "absolute", inset: "0" });
    slot.el.appendChild(ghost);
    current.textContent = text;
    const out = trend < 0 ? 50 : -50;
    try {
      ghost.animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: `translateY(${out}%)` },
        ],
        { duration: FADE, delay, easing: EASE_OUT, fill: "forwards" },
      ).onfinish = () => ghost.remove();
      current.animate(
        [
          { opacity: 0, transform: `translateY(${-out}%)` },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: FADE, delay, easing: EASE_OUT, fill: "backwards" },
      );
    } catch {
      ghost.remove();
    }
  }
}

// ------------------------------------------------------------ component

export function RollingNumber({
  value,
  format = String,
  className,
  style,
}: {
  value: number;
  // The text to show for a value: formatPrice, itemsPhrase, the badge's
  // «99+» rule ... Default: the plain digits.
  format?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
}) {
  const text = format(value);
  const ref = useRef<HTMLSpanElement>(null);
  const flow = useRef<Flow | null>(null);
  // What is on screen before the first change (the flow starts there).
  const shown = useRef({ text, value });
  const [first] = useState(text);
  const [live, setLive] = useState(false);
  // Plain text until the value changes on the client (render-phase
  // derived state: the live row paints in the same commit as the change).
  if (!live && text !== first) setLive(true);

  useLayoutEffect(() => {
    if (!live) {
      shown.current = { text, value };
      return;
    }
    const root = ref.current;
    if (!root) return;
    if (!flow.current) flow.current = new Flow(root, shown.current.text, shown.current.value);
    flow.current.update(text, value);
  }, [live, text, value]);

  useLayoutEffect(
    () => () => {
      flow.current?.destroy();
      flow.current = null;
    },
    [],
  );

  return (
    <span ref={ref} className={className} style={live ? { ...style, display: "inline-flex" } : style}>
      {live ? null : text}
    </span>
  );
}
