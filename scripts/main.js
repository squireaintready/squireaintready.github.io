/* ============================================================================
   main.js — progressive enhancement for the portfolio.
   The site is fully functional with JS disabled; this layer adds:
     • theme picker (5 themes) with persistence
     • sticky nav: scrolled state, active-section links, scroll progress
     • reveal-on-scroll, exact-fit display type (Pretext), inline count-ups
     • live New York clock + current year
     • ⌘K command palette (jump / open / theme / connect)
     • The Craft: prose that genuinely flows around the seals (Pretext flowAround),
       which you can drag to re-flow (wide) or reposition (narrow)
     • interactive monogram orb (About) and a poker mini-game (Play)
   ========================================================================== */
import { readyFonts, fitFontSize, flowAround } from "../assets/vendor/lib.js";

const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const escapeHTML = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const EMAIL = "sungjohak@gmail.com";
const LINKS = { github: "https://github.com/squireaintready", linkedin: "https://www.linkedin.com/in/samuel-jo/" };

/* ---------- Theme ---------- */
function systemTheme() { return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
function currentTheme() { return document.documentElement.getAttribute("data-theme") || systemTheme(); }
const THEMES = [
  { id: "light", name: "Paper", note: "Ink on warm paper" },
  { id: "forest", name: "Forest", note: "Bottle-green & tan" },
  { id: "dark", name: "Ember", note: "Warm dark & brass" },
  { id: "midnight", name: "Midnight", note: "Deep navy & blue" },
  { id: "bordeaux", name: "Bordeaux", note: "Wine-black & brass" },
];
function applyTheme(id) {
  document.documentElement.setAttribute("data-theme", id);
  try { localStorage.setItem("theme", id); } catch (e) {}
  document.dispatchEvent(new CustomEvent("themechanged", { detail: id }));
}
function initTheme() {
  const btn = $(".theme-toggle");
  if (!btn) return;
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Change theme");

  const menu = document.createElement("div");
  menu.className = "theme-menu";
  btn.parentNode.insertBefore(menu, btn);
  menu.appendChild(btn);

  const pop = document.createElement("div");
  pop.className = "theme-pop";
  pop.setAttribute("role", "menu");
  pop.setAttribute("aria-label", "Theme");
  pop.hidden = true;
  const opts = THEMES.map((t) => {
    const o = document.createElement("button");
    o.type = "button";
    o.className = "theme-opt";
    o.setAttribute("role", "menuitemradio");
    o.dataset.theme = t.id;
    o.innerHTML = `<span class="sw sw-${t.id}" aria-hidden="true"></span><span>${t.name}</span><span class="check" aria-hidden="true">✓</span>`;
    o.addEventListener("click", () => { applyTheme(t.id); sync(); close(); btn.focus(); });
    pop.appendChild(o);
    return o;
  });
  menu.appendChild(pop);

  function sync() {
    const c = currentTheme();
    opts.forEach((o) => o.setAttribute("aria-checked", String(o.dataset.theme === c)));
  }
  function onDoc(e) { if (!menu.contains(e.target)) close(); }
  function onKey(e) { if (e.key === "Escape") { close(); btn.focus(); } }
  function open() {
    pop.hidden = false; btn.setAttribute("aria-expanded", "true"); sync();
    addEventListener("keydown", onKey);
    setTimeout(() => addEventListener("click", onDoc), 0);
  }
  function close() {
    pop.hidden = true; btn.setAttribute("aria-expanded", "false");
    removeEventListener("keydown", onKey); removeEventListener("click", onDoc);
  }
  btn.addEventListener("click", (e) => { e.stopPropagation(); pop.hidden ? open() : close(); });
  document.addEventListener("themechanged", sync);
  sync();
}

/* ---------- Sticky nav: scrolled state + active links + scroll progress ---------- */
function initNav() {
  const nav = $(".site-nav");
  const bar = $("[data-progress]");
  if (nav || bar) {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);
        if (bar) {
          const h = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.transform = "scaleX(" + (h > 0 ? clamp(window.scrollY / h, 0, 1) : 0) + ")";
        }
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
  }

  const links = $$(".nav-links a[href^='#'], .index-rail a[href^='#']");
  const bySection = new Map();
  links.forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    const sec = id && document.getElementById(id);
    if (!sec) return;
    if (!bySection.has(sec)) bySection.set(sec, []);
    bySection.get(sec).push(a);
  });
  if (!bySection.size || !("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((l) => l.removeAttribute("aria-current"));
        (bySection.get(e.target) || []).forEach((a) => a.setAttribute("aria-current", "page"));
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  bySection.forEach((_, sec) => obs.observe(sec));
}

/* ---------- Reveal on scroll ---------- */
function initReveals() {
  const items = $$(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("is-in")); return; }
  const obs = new IntersectionObserver(
    (entries, o) => { entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); o.unobserve(e.target); } }); },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );
  items.forEach((el) => obs.observe(el));
}

/* ---------- Pretext: exact-fit display type ---------- */
function fitOne(el) {
  const text = (el.dataset.fitText || el.textContent || "").trim();
  if (!text) return;
  const cs = getComputedStyle(el);
  const family = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
  const weight = parseInt(cs.fontWeight, 10) || 360;
  const target = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (target <= 0) return;
  let max = parseFloat(el.dataset.fitMax) || 280;
  const vh = parseFloat(el.dataset.fitVh);          // optional: cap size to a fraction of viewport height
  if (vh) max = Math.min(max, innerHeight * vh);    // keeps a full-screen hero from overflowing on short laptops
  const min = parseFloat(el.dataset.fitMin) || 22;
  const size = fitFontSize(text, { family: `'${family}'`, weight, target, min, max });
  el.style.fontSize = size.toFixed(2) + "px";
  el.classList.add("is-fitted");
}
async function initFit() {
  const els = $$("[data-fit]");
  if (!els.length) return;
  try { await readyFonts(); } catch (e) {}
  const run = () => els.forEach(fitOne);
  run();
  let raf;
  addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
}

/* ---------- Year + live New York clock ---------- */
function initYear() { $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); }); }
function initClock() {
  const els = $$("[data-clock]");
  if (!els.length) return;
  let fmt;
  try { fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }); }
  catch (e) { return; }
  const tick = () => { const t = fmt.format(new Date()); els.forEach((e) => (e.textContent = t)); };
  tick();
  setInterval(tick, 15000);
}

/* ---------- Inline count-ups (woven into context, never big cards) ---------- */
function initCounters() {
  const els = $$(".count[data-count-to]");
  if (!els.length) return;
  const fmt = (v, dec) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const final = (el) => { const dec = +(el.dataset.countDecimals || 0); el.textContent = fmt(+el.dataset.countTo, dec) + (el.dataset.countSuffix || ""); };
  if (prefersReduced || !("IntersectionObserver" in window)) { els.forEach(final); return; }
  const animate = (el) => {
    const to = +el.dataset.countTo, dec = +(el.dataset.countDecimals || 0), suffix = el.dataset.countSuffix || "", dur = 1100;
    let start;
    const step = (ts) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3), val = to * e;
      el.textContent = fmt(dec ? val : Math.round(val), dec) + suffix;
      if (p < 1) requestAnimationFrame(step); else final(el);
    };
    requestAnimationFrame(step);
  };
  const obs = new IntersectionObserver((ents, o) => { ents.forEach((e) => { if (e.isIntersecting) { animate(e.target); o.unobserve(e.target); } }); }, { threshold: 0.6 });
  els.forEach((el) => { const dec = +(el.dataset.countDecimals || 0); el.textContent = fmt(0, dec) + (el.dataset.countSuffix || ""); obs.observe(el); });
}

/* ---------- The Craft: real Pretext flow of prose around the seal ---------- */
async function initCraftFlow() {
  const flow = $("[data-craft-flow]");
  if (!flow) return;
  const p = flow.querySelector("p");
  const discs = $$(".craft__disc", flow);
  if (!p || !discs.length) return;

  // build a plain string + per-character bold mask from the paragraph's DOM
  const runs = [];
  p.childNodes.forEach((node) => {
    const bold = node.nodeType === 1 && node.tagName === "STRONG";
    const text = node.textContent;
    if (text) runs.push({ text, bold });
  });
  let plain = "", mask = [];
  runs.forEach((r) => { plain += r.text; for (let i = 0; i < r.text.length; i++) mask.push(r.bold); });

  try { await readyFonts(); } catch (e) {}
  let lineEls = [];
  const seals = discs.map(() => ({ dx: 0, dy: 0 })); // per-seal drag offset

  function lineHTML(text, offset) {
    // wrap consecutive bold chars in <strong>, escaping HTML; trims trailing space
    const t = text.replace(/\s+$/, "");
    let html = "", buf = "", cur = null;
    const flush = () => { if (!buf) return; html += cur ? `<strong>${escapeHTML(buf)}</strong>` : escapeHTML(buf); buf = ""; };
    for (let i = 0; i < t.length; i++) {
      const b = !!mask[offset + i];
      if (b !== cur) { flush(); cur = b; }
      buf += t[i];
    }
    flush();
    return html;
  }

  function build() {
    lineEls.forEach((e) => e.remove()); lineEls = [];
    flow.classList.remove("is-flowing");
    flow.style.height = "";
    discs.forEach((d) => { d.style.position = ""; d.style.left = ""; d.style.top = ""; d.style.width = ""; d.style.height = ""; d.style.transform = ""; });

    const W = flow.clientWidth;
    if (W < 680) return; // narrow screens: normal stacked flow (CSS handles the seals)

    const cs = getComputedStyle(flow);
    const family = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const fontPx = parseFloat(cs.fontSize);
    const realLh = fontPx * 1.72; // matches .craft__flow line-height (getComputedStyle lineHeight is unreliable cross-browser)
    const font = `${weight} ${fontPx}px '${family}'`;

    const D = clamp(Math.round(W * 0.15), 112, 146), r = D / 2, gap = 20;
    const homes = [{ x: 0, y: 0 }, { x: W - D, y: realLh * 5 }];
    const centers = seals.map((s, i) => { const h = homes[i] || { x: (i % 2) ? W - D : 0, y: realLh * (3 + i * 3) }; return { cx: h.x + r + s.dx, cy: h.y + r + s.dy }; });

    discs.forEach((d, i) => {
      const c = centers[i];
      d.style.position = "absolute"; d.style.left = "0"; d.style.top = "0"; d.style.width = D + "px"; d.style.height = D + "px";
      d.style.transform = `translate(${(c.cx - r).toFixed(1)}px, ${(c.cy - r).toFixed(1)}px)`;
    });

    const halfAt = (cy, yMid) => { const dy = Math.abs(yMid - cy); return dy < r ? Math.sqrt(r * r - dy * dy) : 0; };
    const bounds = (yMid) => {
      let xs = 0, xe = W;
      for (const c of centers) { const hw = halfAt(c.cy, yMid); if (!hw) continue; if (c.cx < W / 2) xs = Math.max(xs, c.cx + hw + gap); else xe = Math.min(xe, c.cx - hw - gap); }
      return { xs: Math.max(0, xs), xe: Math.min(W, xe) };
    };

    const res = flowAround(plain, font, { lineHeight: realLh, widthAt: (yMid) => { const b = bounds(yMid); return Math.max(50, b.xe - b.xs); }, minWidth: 50 });
    if (!res.lines.length) return;

    flow.classList.add("is-flowing");
    let offset = 0;
    res.lines.forEach((ln) => {
      const yMid = ln.y + realLh * 0.5, b = bounds(yMid);
      const d = document.createElement("div");
      d.className = "craft__line"; d.setAttribute("aria-hidden", "true");
      d.innerHTML = lineHTML(ln.text, offset);
      d.style.transform = `translate(${b.xs.toFixed(1)}px, ${ln.y.toFixed(1)}px)`;
      d.style.width = (b.xe - b.xs) + "px";
      flow.appendChild(d); lineEls.push(d);
      offset += ln.text.length;
    });
    flow.style.height = Math.ceil(res.height + realLh * 0.4) + "px";
  }

  // Drag a seal. Wide screens (flowing): move its center and reflow the prose around it.
  // Narrow screens (stacked, no flow): translate it directly via --dx/--dy, clamped on-screen.
  // A tap (no real drag, in either mode) reverses the spin.
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; build(); }); };
  discs.forEach((disc, i) => {
    const s = seals[i], seal = disc.querySelector(".seal"), ring = disc.querySelector(".seal__ring");
    // s.dx/s.dy = flow offset (wide, drives reflow); tx/ty = translate offset (narrow, drives --dx/--dy).
    // Kept separate so a resize across the breakpoint never carries one mode's offset into the other.
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = 0, pid = null, rev = false, mx = 0, my = 0, tx = 0, ty = 0;
    disc.addEventListener("pointerdown", (e) => {
      dragging = true; moved = 0; pid = e.pointerId; sx = e.clientX; sy = e.clientY;
      const flowing = flow.classList.contains("is-flowing");
      ox = flowing ? s.dx : tx; oy = flowing ? s.dy : ty;
      const D = disc.offsetWidth || 130; mx = Math.max(40, (flow.clientWidth - D) / 2 - 4); my = 132; // clamp range (narrow mode)
      disc.classList.add("is-grabbing"); try { disc.setPointerCapture(pid); } catch (_) {}
    });
    disc.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const mvx = e.clientX - sx, mvy = e.clientY - sy;
      moved = Math.max(moved, Math.abs(mvx) + Math.abs(mvy));
      if (flow.classList.contains("is-flowing")) { s.dx = ox + mvx; s.dy = oy + mvy; schedule(); }       // wide: reflow
      else {                                                                                              // narrow: translate, clamped
        tx = clamp(ox + mvx, -mx, mx); ty = clamp(oy + mvy, -my, my);
        disc.style.setProperty("--dx", tx.toFixed(1) + "px"); disc.style.setProperty("--dy", ty.toFixed(1) + "px");
      }
    });
    const end = () => {
      if (!dragging) return; dragging = false; disc.classList.remove("is-grabbing");
      if (pid != null) { try { disc.releasePointerCapture(pid); } catch (_) {} pid = null; }
      if (moved < 6 && ring && seal) { rev = !rev; ring.style.animationDirection = rev ? "reverse" : "normal"; seal.classList.add("is-spun"); clearTimeout(seal._t); seal._t = setTimeout(() => seal.classList.remove("is-spun"), 1200); }
    };
    disc.addEventListener("pointerup", end); disc.addEventListener("pointercancel", end);
  });

  build();
  addEventListener("resize", debounce(build, 180));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
}

/* ---------- Command palette (⌘K) ---------- */
const IC = {
  jump: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
  gh: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2A10 10 0 0 0 8.8 21.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.300-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/></svg>',
  li: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3.5 8.5h3v12h-3zM10 8.5h2.9v1.6h.04c.4-.75 1.4-1.6 2.96-1.6 3.1 0 3.7 2 3.7 4.7v6.8h-3v-6c0-1.4 0-3.3-2-3.3s-2.3 1.6-2.3 3.2v6.1H10z"/></svg>',
};
function initCommandPalette() {
  const openers = $$("[data-cmdk-open]");
  if (!openers.length) return;

  const onHome = !!document.getElementById("work");
  const nav = (id, label) => ({ group: onHome ? "Jump to" : "Go to", icon: IC.jump, title: label, sub: onHome ? "#" + id : "/#" + id, kw: id + " " + label, run: () => (document.getElementById(id) ? goTo(id) : location.assign("/#" + id)) });
  const live = (title, url) => ({ group: "Open live", icon: IC.ext, title, sub: url.replace(/^https?:\/\//, "").replace(/\/$/, ""), kw: title + " live open site", run: () => openExt(url) });
  const study = (title, url) => ({ group: "Case studies", icon: IC.doc, title: title + " — case study", sub: url, kw: title + " case study read", run: () => location.assign(url) });
  const theme = (t) => ({ group: "Theme", iconHTML: `<span class="sw sw-${t.id}"></span>`, title: t.name, sub: t.note, kw: "theme " + t.name + " " + t.note, keepOpen: true, run: () => { applyTheme(t.id); render(input.value); } });

  const COMMANDS = [
    nav("work", "Work"), nav("about", "About"), nav("capabilities", "Capabilities"), nav("craft", "The Craft"), nav("play", "Play"), nav("contact", "Contact"),
    live("Crowdtells", "https://crowdtells.com/"), live("RegWatch", "https://regwatch.nyc/"), live("Tells", "https://facer-fti6.onrender.com/"), live("miztips", "https://miztips.vercel.app/"),
    study("Crowdtells", "/work/crowdtells.html"), study("RegWatch", "/work/regwatch.html"), study("Tells", "/work/tells.html"), study("miztips", "/work/miztips.html"),
    ...THEMES.map(theme),
    { group: "Connect", icon: IC.copy, title: "Copy email", sub: EMAIL, kw: "copy email address clipboard", run: () => copyEmail() },
    { group: "Connect", icon: IC.mail, title: "Email me", sub: EMAIL, kw: "email contact write", run: () => openExt("mailto:" + EMAIL) },
    { group: "Connect", icon: IC.gh, title: "GitHub", sub: "@squireaintready", kw: "github code repos", run: () => openExt(LINKS.github) },
    { group: "Connect", icon: IC.li, title: "LinkedIn", sub: "Samuel Jo", kw: "linkedin connect", run: () => openExt(LINKS.linkedin) },
  ];

  // overlay DOM
  const overlay = document.createElement("div");
  overlay.className = "cmdk"; overlay.hidden = true; overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true"); overlay.setAttribute("aria-label", "Command menu");
  overlay.innerHTML =
    '<div class="cmdk__panel">' +
      '<div class="cmdk__field">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
        '<input class="cmdk__input" type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="cmdk-list" placeholder="Search or jump anywhere…" />' +
        '<span class="cmdk__esc">esc</span>' +
      '</div>' +
      '<div class="cmdk__list" id="cmdk-list" role="listbox" aria-label="Commands"></div>' +
      '<div class="cmdk__foot"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>esc</kbd> Close</span></div>' +
    '</div>';
  document.body.appendChild(overlay);
  const panel = $(".cmdk__panel", overlay), input = $(".cmdk__input", overlay), list = $("#cmdk-list", overlay);

  let filtered = [], active = 0, lastFocus = null;

  const match = (q, c) => {
    if (!q) return true;
    q = q.toLowerCase(); const hay = (c.title + " " + c.sub + " " + c.kw).toLowerCase();
    if (hay.includes(q)) return true;
    let i = 0; for (const ch of q) { i = hay.indexOf(ch, i); if (i < 0) return false; i++; } return true; // subsequence
  };
  function render(q) {
    filtered = COMMANDS.filter((c) => match(q, c));
    list.innerHTML = "";
    if (!filtered.length) { list.innerHTML = '<p class="cmdk__empty">No matches.</p>'; input.removeAttribute("aria-activedescendant"); return; }
    let lastGroup = null, idx = 0;
    filtered.forEach((c) => {
      if (c.group !== lastGroup) { const g = document.createElement("p"); g.className = "cmdk__group"; g.textContent = c.group; list.appendChild(g); lastGroup = c.group; }
      const item = document.createElement("button");
      item.type = "button"; item.className = "cmdk__item"; item.id = "cmdk-opt-" + idx; item.setAttribute("role", "option");
      item.tabIndex = -1; // arrow-navigated via aria-activedescendant; keeps Tab on the input
      item.dataset.i = idx;
      item.innerHTML = `<span class="cmdk__item-ic">${c.iconHTML || c.icon}</span><span class="cmdk__item-tx"><b>${escapeHTML(c.title)}</b><span>${escapeHTML(c.sub)}</span></span><span class="cmdk__item-go">↵</span>`;
      item.addEventListener("click", () => exec(+item.dataset.i));
      item.addEventListener("pointermove", () => setActive(+item.dataset.i));
      list.appendChild(item); idx++;
    });
    active = 0; paint();
  }
  function paint() {
    $$(".cmdk__item", list).forEach((el) => {
      const on = +el.dataset.i === active;
      el.setAttribute("aria-selected", String(on));
      if (on) { input.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
    });
  }
  function setActive(i) { active = clamp(i, 0, filtered.length - 1); paint(); }
  function exec(i) { const c = filtered[i]; if (!c) return; const keep = c.keepOpen; c.run(); if (!keep) close(); }

  function open() {
    if (!overlay.hidden) return;
    lastFocus = document.activeElement;
    overlay.hidden = false; document.documentElement.style.overflow = "hidden";
    input.value = ""; render(""); input.focus();
  }
  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true; document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const toggle = () => (overlay.hidden ? open() : close());

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(filtered.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); exec(active); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  });
  overlay.addEventListener("pointerdown", (e) => { if (e.target === overlay) close(); });
  openers.forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); open(); }));

  const isTyping = (el) => el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable);
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); toggle(); }
    else if (e.key === "/" && overlay.hidden && !isTyping(e.target)) { e.preventDefault(); open(); }
  });

  function goTo(id) { const el = document.getElementById(id); close(); if (el) { el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" }); history.replaceState(null, "", "#" + id); } }
  function openExt(url) { close(); window.open(url, url.startsWith("mailto:") ? "_self" : "_blank", "noopener"); }
  async function copyEmail() {
    try { await navigator.clipboard.writeText(EMAIL); toast("Email copied — " + EMAIL); }
    catch (e) { openExt("mailto:" + EMAIL); return; }
    close();
  }
}

/* tiny toast */
let toastT;
function toast(msg) {
  let el = $(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add("is-on");
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("is-on"), 2200);
}

/* ---------- Play: heads-up Texas Hold'em vs. the house (the game behind Tells) ---------- */
const SUITS = [{ s: "♠", red: false }, { s: "♥", red: true }, { s: "♦", red: true }, { s: "♣", red: false }];
const RANKS = [
  { r: 2, l: "2" }, { r: 3, l: "3" }, { r: 4, l: "4" }, { r: 5, l: "5" }, { r: 6, l: "6" },
  { r: 7, l: "7" }, { r: 8, l: "8" }, { r: 9, l: "9" }, { r: 10, l: "10" },
  { r: 11, l: "J" }, { r: 12, l: "Q" }, { r: 13, l: "K" }, { r: 14, l: "A" },
];
const SUIT_NAME = { "♠": "Spades", "♥": "Hearts", "♦": "Diamonds", "♣": "Clubs" };
const RANK_NAME = { J: "Jack", Q: "Queen", K: "King", A: "Ace" };
const cardName = (c) => `${RANK_NAME[c.l] || c.l} of ${SUIT_NAME[c.s]}`;
const HAND_NAMES = ["High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush"];

// Score a 5-card hand as a comparable array [category, ...tiebreakers] — the same ranking
// (categories + kickers) the Tells engine uses to settle a showdown.
function rank5(cards) {
  const rs = cards.map((c) => c.r), suits = cards.map((c) => c.s);
  const flush = suits.every((s) => s === suits[0]);
  const cnt = {};
  rs.forEach((r) => (cnt[r] = (cnt[r] || 0) + 1));
  const ordered = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a); // by count, then rank
  const pat = ordered.map((r) => cnt[r]);                                                 // e.g. [4,1] [3,2] [2,2,1] [2,1,1,1]
  const uniq = [...new Set(rs)].sort((a, b) => b - a);
  let straight = false, high = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { straight = true; high = uniq[0]; }
    else if (uniq[0] === 14 && uniq[1] === 5) { straight = true; high = 5; }              // A-2-3-4-5 wheel
  }
  let cat;
  if (straight && flush) cat = 8;
  else if (pat[0] === 4) cat = 7;
  else if (pat[0] === 3 && pat[1] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straight) cat = 4;
  else if (pat[0] === 3) cat = 3;
  else if (pat[0] === 2 && pat[1] === 2) cat = 2;
  else if (pat[0] === 2) cat = 1;
  else cat = 0;
  return [cat, ...((cat === 8 || cat === 4) ? [high] : ordered)];                          // straights tie on high card only
}
const cmpScore = (a, b) => { for (let i = 0, n = Math.max(a.length, b.length); i < n; i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
const HOLDEM_EXCL = (() => { const e = []; for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) e.push([i, j]); return e; })(); // 21 ways to drop 2 of 7
// Best 5-card hand out of 7 (2 hole + 5 board) → { score, cat, cards }.
function best7(seven) {
  let score = null, cards = null;
  for (const [a, b] of HOLDEM_EXCL) {
    const five = seven.filter((_, k) => k !== a && k !== b);
    const s = rank5(five);
    if (!score || cmpScore(s, score) > 0) { score = s; cards = five; }
  }
  return { score, cat: score[0], cards };
}
function initPlay() {
  const youEl = $("#you-cards"), boardEl = $("#board-cards"), dealerEl = $("#dealer-cards");
  const btn = $("#deal-btn"), foldBtn = $("#fold-btn"), result = $("#play-result");
  const chipsEl = $("#play-chips"), potEl = $("#play-pot"), hint = $("#play-hint");
  if (!youEl || !boardEl || !dealerEl || !btn || !foldBtn) return;

  const DECK = [];
  SUITS.forEach((su) => RANKS.forEach((rk) => DECK.push({ ...rk, ...su })));
  const ANTE = 5, T = prefersReduced ? 0 : 1;   // T scales every animation delay (0 ⇒ instant)

  let chips = 100, you = [], dealer = [], board = [], pot = 0, phase = "idle", busy = false, onPrimary = deal;

  const setChips = (v) => { chips = Math.max(0, v); if (chipsEl) chipsEl.textContent = chips; };
  const setPot = (v) => { pot = v; if (potEl) potEl.textContent = v; };
  const setHint = (t) => { if (hint) hint.textContent = t; };
  const setBtn = (label) => { btn.innerHTML = `${label} <span class="arrow" aria-hidden="true">→</span>`; btn.hidden = false; btn.disabled = false; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const key = (c) => c.l + c.s;

  // one card element; faceUp=false renders the back, flipping up later when .in is added
  function cardEl(card, faceUp, delay) {
    const c = document.createElement("div");
    c.className = "pcard" + (card.red ? " red" : "");
    c._card = card;
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", faceUp ? cardName(card) : "Face-down card");
    c.innerHTML = `<span class="pcard__side pcard__back"></span><span class="pcard__side pcard__face"><span class="rank">${card.l}</span><span class="suit">${card.s}</span></span>`;
    if (faceUp) { if (delay && T) setTimeout(() => c.classList.add("in"), delay); else c.classList.add("in"); }
    return c;
  }
  const fill = (el, cards, faceUp, base = 0) => { el.innerHTML = ""; cards.forEach((card, i) => el.appendChild(cardEl(card, faceUp, base + i * 90 * T))); };
  const flip = (el) => { if (!el) return; el.classList.add("in"); if (el._card) el.setAttribute("aria-label", cardName(el._card)); };

  function rest() {                              // resting "table set" — nine face-down backs
    phase = "idle"; you = []; dealer = []; board = []; setPot(0);
    fill(dealerEl, [DECK[0], DECK[0]], false);
    fill(boardEl, [DECK[0], DECK[0], DECK[0], DECK[0], DECK[0]], false);
    fill(youEl, [DECK[0], DECK[0]], false);
    result.innerHTML = ""; setHint("Heads-up vs. the house — ante 5 to play."); foldBtn.hidden = true;
    setBtn("Deal me in"); onPrimary = deal;
  }

  function deal() {
    if (busy) return;
    if (chips < ANTE * 2) setChips(100);        // need the ante plus a possible play-bet; top up if short
    busy = true; result.innerHTML = ""; foldBtn.hidden = true; btn.disabled = true;
    setChips(chips - ANTE); setPot(ANTE);
    const d = shuffle(DECK.slice());
    you = [d[0], d[1]]; dealer = [d[2], d[3]]; board = [d[4], d[5], d[6], d[7], d[8]];
    fill(dealerEl, dealer, false);              // dealer hole cards face-down
    fill(youEl, you, true, 60);                 // your hole cards
    boardEl.innerHTML = "";
    board.forEach((card, i) => boardEl.appendChild(cardEl(card, i < 3, i < 3 ? 220 + i * 90 * T : 0))); // flop up, turn+river down
    phase = "decision"; onPrimary = play;
    setTimeout(() => {
      const made = rank5([...you, ...board.slice(0, 3)]);
      setHint("Your two cards + the flop. Play the hand or fold?");
      result.innerHTML = `<span class="play__hands">You're holding <b>${HAND_NAMES[made[0]]}</b></span>`;
      foldBtn.hidden = false; setBtn("Play"); busy = false;
    }, 620 * T);
  }

  function fold() {
    if (busy || phase !== "decision") return;
    foldBtn.hidden = true; phase = "done"; setPot(0);
    result.innerHTML = `<span class="muted">You folded — −${ANTE}</span>`;
    setHint(""); setBtn(chips < ANTE * 2 ? "Reset chips" : "Deal again"); onPrimary = deal;
  }

  function play() {
    if (busy || phase !== "decision") return;
    busy = true; foldBtn.hidden = true; btn.disabled = true; setHint("Running it out…");
    setChips(chips - ANTE); setPot(pot + ANTE);  // commit the play-bet → pot = 2×ante
    phase = "reveal";
    const turn = boardEl.children[3], river = boardEl.children[4];
    setTimeout(() => flip(turn), 250 * T);
    setTimeout(() => flip(river), 700 * T);
    setTimeout(() => $$(".pcard", dealerEl).forEach((c, i) => setTimeout(() => flip(c), i * 140 * T)), 1150 * T);
    setTimeout(showdown, 1650 * T);
  }

  function showdown() {
    $$(".pcard", dealerEl).forEach(flip);
    const yb = best7([...you, ...board]), db = best7([...dealer, ...board]);
    const win5 = new Set(yb.cards.map(key));     // highlight the five cards that make your hand
    [youEl, boardEl].forEach((el) => $$(".pcard", el).forEach((c) => { if (c._card && win5.has(key(c._card))) c.classList.add("is-best"); }));
    const cmp = cmpScore(yb.score, db.score);
    let out;
    if (cmp > 0) { setChips(chips + pot * 2); out = `<span class="play__win">You win +${pot}</span>`; }
    else if (cmp < 0) { out = `<span class="play__lose">Dealer wins −${pot}</span>`; }
    else { setChips(chips + pot); out = `<span class="muted">Split pot — push</span>`; }
    result.innerHTML = `<span class="play__hands">You <b>${HAND_NAMES[yb.cat]}</b> · Dealer <b>${HAND_NAMES[db.cat]}</b></span>${out}`;
    setPot(0); setHint(""); phase = "done";
    setBtn(chips < ANTE * 2 ? "Reset chips" : "Deal again"); onPrimary = deal; busy = false;
  }

  btn.addEventListener("click", () => { if (!busy) onPrimary(); });
  foldBtn.addEventListener("click", fold);
  rest();
}

/* ---------- Interactive monogram orb (About) ---------- */
function initOrb() {
  const face = $("[data-orb]");
  if (!face) return;
  const mono = face.querySelector(".about__monogram");
  if (!prefersReduced) {
    const zone = face.closest("section") || face;
    const MAX = 9;
    let raf = 0;
    zone.addEventListener("pointermove", (e) => {
      const r = face.getBoundingClientRect();
      const px = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      const py = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        face.style.setProperty("--ry", (px * MAX).toFixed(2) + "deg");
        face.style.setProperty("--rx", (-py * MAX).toFixed(2) + "deg");
      });
    }, { passive: true });
    zone.addEventListener("pointerleave", () => { face.style.setProperty("--rx", "0deg"); face.style.setProperty("--ry", "0deg"); });
  }
  if (mono) {
    face.addEventListener("click", () => {
      if (prefersReduced) return;
      mono.classList.remove("is-pop"); void mono.offsetWidth; mono.classList.add("is-pop");
    });
    mono.addEventListener("animationend", () => mono.classList.remove("is-pop"));
  }
}

function init() {
  initTheme();
  initNav();
  initReveals();
  initYear();
  initClock();
  initCounters();
  initFit();
  initCraftFlow();
  initCommandPalette();
  initPlay();
  initOrb();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
