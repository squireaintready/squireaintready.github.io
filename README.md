# Samuel Jo — Portfolio

**Live at [samjo.me](https://samjo.me)** — the personal portfolio of Samuel Jo, software & AI engineer.

Editorial, typographic, mobile-first. A **static, zero-dependency, zero-build** site: semantic
HTML and CSS with a thin layer of vanilla ES modules, typeset at runtime with
[Pretext](https://github.com/chenglou/pretext). Deployed on GitHub Pages.

**Featured work:** [Crowdtells](https://crowdtells.com) · [RegWatch](https://regwatch.nyc) ·
[Tells](https://facer-fti6.onrender.com) · [miztips](https://miztips.vercel.app)

---

## Highlights

- **Pretext, live in the browser** — the hero name and contact heading aren't images; they're
  measured and sized to fill their column exactly with `fitFontSize()`, re-fitting on resize.
- **5-theme editorial design system** — warm-paper light + four dark themes, persisted in
  `localStorage`, set pre-paint to avoid flash, respects `prefers-color-scheme`.
- **Interactive, by hand** — a playable five-card-draw poker game (Jacks-or-Better evaluator),
  draggable wax-seal medallions that reverse spin on click, and a monogram that tilts in 3D
  toward the cursor. All reduced-motion aware.
- **Accessible & fast** — one `<h1>` per page, landmarks, skip link, visible focus, WCAG-AA
  contrast in every theme, self-hosted fonts, no framework or bundler.

## Run locally

No build step. Serve the folder over HTTP (ES modules + fonts need a server):

```bash
python3 -m http.server 8765   # then open http://localhost:8765
```

(Opening `index.html` over `file://` won't work — `<script type="module">` and absolute asset
paths require a server.)

## What's inside

```
├── index.html              # home: hero, work, about, capabilities, craft, play, contact
├── work/                   # one case study per project (crowdtells, regwatch, tells, miztips)
├── styles/
│   ├── tokens.css          # design tokens: color (5 themes), type, spacing, motion
│   ├── base.css            # reset, typography, layout primitives, nav, buttons, footer
│   ├── home.css            # home-page sections
│   └── case.css            # case-study layout
├── scripts/main.js         # theme picker, scroll reveals, Pretext type-fitting,
│                           # the poker game, draggable seals, the 3D tilt orb
├── assets/fonts            # Inter, Fraunces, Source Serif 4 (self-hosted woff2)
├── assets/vendor           # pretext.mjs + lib.js (the Pretext engine)
├── public/img/             # live-site screenshots, app icon, OG image
└── favicon.svg · robots.txt · sitemap.xml · CNAME
```

## Design system

- **Type:** Fraunces (display) · Inter (UI/labels) · Source Serif 4 (body) · system mono (data).
- **Per-project accent:** each project carries a hue from its real app (Crowdtells ink-blue,
  RegWatch amber, miztips indigo, Tells felt-green). `--proj` is the vivid decorative value;
  `--proj-ink` is the contrast-safe variant used for text.
- **Tokens** live in `styles/tokens.css`; components never hardcode color or type.

## Accessibility & performance

- One `<h1>` per page, ordered headings, landmarks, skip link, visible focus rings.
- WCAG-AA color contrast in every theme; `prefers-reduced-motion` disables animation.
- Self-hosted fonts with `preload` + `font-display: swap`; screenshots optimized to JPEG.
- No framework, no bundler, no runtime dependencies beyond the ~30 KB Pretext engine.

## Deploy

GitHub Pages, served from `main` at the repo root, custom domain **[samjo.me](https://samjo.me)**
(HTTPS enforced), analytics via GA4. `404.html` is wired for the custom-404 path.

## Credits

Typeset with [Pretext](https://github.com/chenglou/pretext) by chenglou. Fonts: Inter, Fraunces,
Source Serif 4.
