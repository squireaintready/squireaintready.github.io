/*
 * Pretext Lab — shared typographic toolkit.
 * Thin, correct wrappers over the vendored Pretext engine, built on its REAL contract
 * (verified empirically, not the cheatsheet):
 *   layout(prepare(t,f), w, lh)              -> { lineCount, height }
 *   layoutWithLines(segs, w, lh)             -> { lineCount, height, lines:[{text,width,start,end}] }   (NO x/y — we place)
 *   layoutNextLine(segs, state, w)           -> { text, width, start, end } | null   (3 args; state={segmentIndex,graphemeIndex}; next = result.end)
 *   walkLineRanges(segs, w, cb)              -> cb({width,start,end}) per line
 * Fonts: a Pretext measurement only matches the rendered glyphs if the SAME css-font
 * string is used AND the face is loaded first. readyFonts() guarantees both.
 */
import {
  prepare, layout, prepareWithSegments, layoutWithLines, walkLineRanges, layoutNextLine, clearCache,
} from './pretext.mjs';

export { prepare, layout, prepareWithSegments, layoutWithLines, walkLineRanges, layoutNextLine, clearCache };

const BIG = 1_000_000; // effectively-infinite width for single-line measurement

/** Load every family/weight we measure with, then await the font set. Call once before any prepare(). */
export async function readyFonts() {
  const probes = [
    "400 16px 'Source Serif 4'", "600 16px 'Source Serif 4'", "300 16px 'Source Serif 4'",
    "400 14px 'Inter Variable'", "600 13px 'Inter Variable'", "700 11px 'Inter Variable'",
    "340 120px 'Fraunces Variable'", "300 120px 'Fraunces Variable'", "600 48px 'Fraunces Variable'",
  ];
  try { await Promise.all(probes.map((f) => document.fonts.load(f))); } catch { /* older engines */ }
  await document.fonts.ready;
}

/** Pixel width of `text` laid out on a single unconstrained line, in css-font `font`. */
export function measureWidth(text, font) {
  const segs = prepareWithSegments(text, font);
  const { lines } = layoutWithLines(segs, BIG, 10);
  return lines.length ? lines[0].width : 0;
}

/**
 * Font-size (px) that makes `text` fill ≈ `target` px on ONE line, in `family`/`weight`.
 * Width is ~linear in size, so measure at a reference size and scale, then refine once
 * to absorb hinting drift. This is exact-fit display type — impossible to eyeball in CSS.
 */
export function fitFontSize(text, { family, weight = 400, target, min = 8, max = 600 }) {
  const ref = 100;
  const w0 = measureWidth(text, `${weight} ${ref}px ${family}`);
  if (!w0) return min;
  let size = ref * (target / w0);
  const w1 = measureWidth(text, `${weight} ${size}px ${family}`);
  if (w1) size *= target / w1;
  return Math.max(min, Math.min(max, size));
}

/**
 * Flow `text` down a column where each line's max width is `widthAt(yMid, lineIndex)`.
 * The engine guarantees every returned line fits its per-line width, so the ragged right
 * edge traces whatever shape widthAt() describes. Returns placed lines + total height.
 */
export function flowAround(text, font, { lineHeight, widthAt, minWidth = 24, maxLines = 600 }) {
  const segs = prepareWithSegments(text, font);
  let state = { segmentIndex: 0, graphemeIndex: 0 };
  let y = 0;
  const lines = [];
  for (let i = 0; i < maxLines; i++) {
    const avail = Math.max(minWidth, widthAt(y + lineHeight * 0.5, i));
    const line = layoutNextLine(segs, state, avail);
    if (!line) break;
    lines.push({ text: line.text, width: line.width, avail, y, i });
    const next = line.end;
    if (next.segmentIndex === state.segmentIndex && next.graphemeIndex === state.graphemeIndex) break; // no-progress guard
    state = next;
    y += lineHeight;
  }
  return { lines, height: lines.length * lineHeight, lineCount: lines.length };
}

/** Quick estimate of how many lines `text` takes at width `w` — used to size obstacle profiles. */
export function estimateLineCount(text, font, w, lineHeight) {
  return layout(prepare(text, font), w, lineHeight).lineCount;
}

/**
 * Metric justification: every line but the last fills `width` exactly by adding word-spacing.
 * Real CSS `text-align: justify` can't give you the per-line numbers (or justify the last line
 * deliberately ragged) — Pretext measures each line so we distribute the slack ourselves.
 */
export function justifyParagraph(text, font, { width, lineHeight, justifyLast = false }) {
  const segs = prepareWithSegments(text, font);
  const { lines } = layoutWithLines(segs, width, lineHeight);
  return lines.map((ln, i) => {
    const spaces = (ln.text.match(/ /g) || []).length;
    const isLast = i === lines.length - 1;
    const slack = width - ln.width;
    const wordSpacing = (spaces > 0 && (!isLast || justifyLast) && slack > 0) ? slack / spaces : 0;
    return { text: ln.text.replace(/\s+$/, ''), width: ln.width, wordSpacing, y: i * lineHeight, isLast };
  });
}

/**
 * Tightest width that still wraps `text` into the same number of lines it has at `maxWidth`.
 * The chat-bubble shrinkwrap: a tile hugs its text instead of leaving a ragged gutter.
 */
export function shrinkwrap(text, font, maxWidth, lineHeight) {
  const h = prepare(text, font);
  const target = layout(h, maxWidth, lineHeight).lineCount;
  let lo = 8, hi = maxWidth;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (layout(h, mid, lineHeight).lineCount <= target) hi = mid;
    else lo = mid;
  }
  const fin = layout(h, hi, lineHeight);
  return { width: Math.ceil(hi), height: fin.height, lineCount: fin.lineCount };
}

/** Read a themed CSS custom property off :root (so JS-drawn SVG follows the active theme). */
export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Build a piecewise-linear interpolator over points [{t,p}] keyed by a 0..1 fraction. */
export function lerpSeries(points, key = 'p') {
  const ys = points.map((d) => d[key]);
  const n = ys.length;
  return (f) => {
    if (n === 0) return 0;
    if (n === 1) return ys[0];
    const x = Math.max(0, Math.min(1, f)) * (n - 1);
    const k = Math.min(n - 1, Math.floor(x));
    const k1 = Math.min(n - 1, k + 1);
    return ys[k] + (ys[k1] - ys[k]) * (x - k);
  };
}

const el = (tag, props = {}, kids = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('data-') || k === 'role' || k === 'aria-label' || k === 'title') e.setAttribute(k, v);
    else e[k] = v;
  }
  for (const kid of [].concat(kids)) if (kid) e.append(kid);
  return e;
};
export { el };
