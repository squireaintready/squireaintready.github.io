# Samuel Jo — Portfolio

A personal portfolio for **Samuel Jo**, software & AI engineer. Editorial, typographic,
mobile-first. Built as a **static, zero-dependency, zero-build** site — semantic HTML and
CSS with a thin layer of vanilla ES modules, typeset with [Pretext](https://github.com/chenglou/pretext).

**Featured work:** [Crowdtells](https://crowdtells.com) · [RegWatch](https://regwatch.nyc) ·
Tells · [miztips](https://miztips.vercel.app)

---

## Preview locally

No build step. Serve the folder over HTTP (needed for ES-module + font loading):

```bash
cd samjo_portfolio
python3 -m http.server 8765
# open http://localhost:8765
```

(Opening `index.html` via `file://` won't work — the `<script type="module">` and absolute
asset paths require a server.)

## What's inside

```
samjo_portfolio/
├── index.html              # home: hero, work, about, skills, contact
├── work/                   # one case study per project
│   ├── crowdtells.html
│   ├── regwatch.html
│   ├── tells.html
│   └── miztips.html
├── 404.html
├── styles/
│   ├── tokens.css          # design tokens: color (light+dark), type, spacing, motion
│   ├── base.css            # reset, typography, layout primitives, nav, buttons, footer
│   ├── home.css            # home-page sections
│   └── case.css            # case-study layout
├── scripts/main.js         # theme toggle, nav state, scroll reveals, Pretext type-fitting
├── assets/
│   ├── fonts/              # Inter, Fraunces, Source Serif 4 (self-hosted woff2)
│   └── vendor/             # pretext.mjs + lib.js (the Pretext engine)
├── public/img/             # live-site screenshots, app icon, OG image
├── favicon.svg · robots.txt · sitemap.xml
└── Samuel-Jo-Resume.pdf
```

## Design system

- **Type:** Fraunces (display) · Inter (UI/labels) · Source Serif 4 (body) · system mono (data).
- **Theme:** warm-paper light by default, dark "dossier" via the header toggle (persisted in
  `localStorage`, respects `prefers-color-scheme`, set pre-paint to avoid flash).
- **Per-project accent:** each project carries a hue from its real app (Crowdtells ink-blue,
  RegWatch amber, miztips indigo, Tells felt-green). `--proj` is the vivid decorative value;
  `--proj-ink` is a contrast-safe variant used for text.
- **Pretext:** the hero name and the contact heading are sized to fill their column exactly
  via `fitFontSize()` (re-fits on resize). The about bio wraps a monogram via CSS
  `shape-outside`. Everything degrades gracefully with JS disabled.

## Accessibility & performance

- One `<h1>` per page, ordered headings, landmarks, skip link, visible focus rings.
- WCAG-AA color contrast in both themes; `prefers-reduced-motion` disables animation.
- Self-hosted fonts with `preload` + `font-display: swap`; screenshots optimized to JPEG.
- No framework, no bundler, no runtime dependencies beyond the ~30 KB Pretext engine.

## Customize before deploy

1. **Domain:** replace `samuel-jo.com` in the `<link rel="canonical">` / Open Graph tags
   (every page), `sitemap.xml`, and `robots.txt` with your real domain.
2. **Résumé:** `Samuel-Jo-Resume.pdf` is the linked file — swap it for whichever version you want.
3. **Content:** edit copy directly in the HTML; project accents live in `styles/tokens.css`.

## Deploy

Any static host works — drag-and-drop or connect the repo:

- **Cloudflare Pages / Netlify / Vercel / GitHub Pages** — no build command, output dir is the repo root.
- `404.html` is wired up for custom-404 hosts.

## Credits

Typeset with [Pretext](https://github.com/chenglou/pretext) by chenglou. Fonts: Inter,
Fraunces, Source Serif 4.
