/* ============================================================================
   main.js — progressive enhancement for the portfolio.
   The site is fully functional with JS disabled; this layer adds:
     • theme picker (Forest / Paper / Indigo) with persistence
     • sticky nav: scrolled state, active-section links, scroll progress
     • reveal-on-scroll + inline count-ups
     • live New York clock + current year
     • ⌘K command palette (jump / open / theme / connect)
     • a heads-up Texas Hold'em mini-game (Play) — the engine behind facecard
     • Pretext exact-fit: the giant hero name is measured + sized to fill its column live
   ========================================================================== */
import { readyFonts } from "../assets/vendor/lib.js";

const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const escapeHTML = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const EMAIL = "sungjohak@gmail.com";
const LINKS = { github: "https://github.com/squireaintready", linkedin: "https://www.linkedin.com/in/samuel-jo/" };
let portalGo = null;   // set by initPortal(); lets the ⌘K palette route through the portal too

/* ---------- Theme ---------- */
function systemTheme() { return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
function currentTheme() { return document.documentElement.getAttribute("data-theme") || "paper"; }
const THEMES = [
  { id: "paper", name: "Paper", note: "Ink on warm paper" },
  { id: "forest", name: "Forest", note: "Bottle-green & tan" },
  { id: "indigo", name: "Indigo", note: "Deep indigo & periwinkle" },
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
  // Arrived through a portal? The portal already showed this content, so reveal it instantly
  // (no second fade-in) instead of re-animating it on load.
  let viaPortal = false;
  try { viaPortal = !!sessionStorage.getItem("portalReveal"); if (viaPortal) sessionStorage.removeItem("portalReveal"); } catch (e) {}
  if (viaPortal || prefersReduced || !("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("is-in")); return; }
  const obs = new IntersectionObserver(
    (entries, o) => { entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); o.unobserve(e.target); } }); },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );
  items.forEach((el) => obs.observe(el));
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
  const nav = (id, label) => ({ group: onHome ? "Jump to" : "Go to", icon: IC.jump, title: label, sub: onHome ? "#" + id : "/#" + id, kw: id + " " + label, run: () => (document.getElementById(id) ? goTo(id) : (portalGo ? portalGo("/#" + id) : location.assign("/#" + id))) });
  const live = (title, url) => ({ group: "Open live", icon: IC.ext, title, sub: url.replace(/^https?:\/\//, "").replace(/\/$/, ""), kw: title + " live open site", run: () => openExt(url) });
  const study = (title, url) => ({ group: "Case studies", icon: IC.doc, title: title + " — case study", sub: url, kw: title + " case study read", run: () => (portalGo ? portalGo(url) : location.assign(url)) });
  const theme = (t) => ({ group: "Theme", iconHTML: `<span class="sw sw-${t.id}"></span>`, title: t.name, sub: t.note, kw: "theme " + t.name + " " + t.note, keepOpen: true, run: () => { applyTheme(t.id); render(input.value); } });

  const COMMANDS = [
    nav("work", "Work"), nav("about", "About"), nav("capabilities", "Capabilities"), nav("play", "Play"), nav("contact", "Contact"),
    live("Crowdtells", "https://crowdtells.com/"), live("RegWatch", "https://regwatch.nyc/"), live("facecard", "https://facer-fti6.onrender.com/"), live("miztips", "https://miztips.vercel.app/"), live("phos-analysis", "https://phos-analysis.vercel.app/"),
    study("Crowdtells", "/work/crowdtells.html"), study("RegWatch", "/work/regwatch.html"), study("facecard", "/work/facecard.html"), study("miztips", "/work/miztips.html"), study("phos-analysis", "/work/phos-analysis.html"),
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

/* ---------- Play: three-handed Texas Hold'em (the game behind facecard) ---------- */
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
// (categories + kickers) the facecard engine uses to settle a showdown.
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
const DECK = (() => { const d = []; SUITS.forEach((su) => RANKS.forEach((rk) => d.push({ ...rk, ...su }))); return d; })();
const key = (c) => c.l + c.s;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Best 5-card hand out of 5–7 cards → { score, cat, cards }. KEEP[n] memoises the
// "choose 5 of n" index sets, so this single scorer serves the flop, turn, and river.
const KEEP = {};
function keep(n) {
  if (!KEEP[n]) { const out = []; const rec = (start, acc) => { if (acc.length === 5) { out.push(acc.slice()); return; } for (let i = start; i < n; i++) { acc.push(i); rec(i + 1, acc); acc.pop(); } }; rec(0, []); KEEP[n] = out; }
  return KEEP[n];
}
function bestOf(cards) {
  let score = null, five = null;
  for (const ix of keep(cards.length)) { const f = ix.map((i) => cards[i]); const s = rank5(f); if (!score || cmpScore(s, score) > 0) { score = s; five = f; } }
  return { score, cat: score[0], cards: five };
}

// Monte-Carlo equity: P(win) for `hole` against `nOpp` unseen hands, averaged over
// `samples` random runouts of the rest of the board. It scores every runout with the
// same bestOf that settles the showdown — so an opponent's nerve is the real engine's
// read. Split pots count fractionally; cards this seat can't see stay live in the deck.
function equity(hole, board, nOpp, samples) {
  if (nOpp <= 0) return 1;
  const dead = new Set([...hole, ...board].map(key));
  const live = DECK.filter((c) => !dead.has(key(c)));
  const need = 5 - board.length;
  let total = 0;
  for (let s = 0; s < samples; s++) {
    shuffle(live);
    let k = need;
    const full = need ? board.concat(live.slice(0, need)) : board;
    const me = bestOf([...hole, ...full]).score;
    let beat = true, tied = 1;
    for (let o = 0; o < nOpp; o++) {
      const d = cmpScore(me, bestOf([live[k++], live[k++], ...full]).score);
      if (d < 0) { beat = false; break; }
      if (d === 0) tied++;
    }
    if (beat) total += 1 / tied;
  }
  return total / samples;
}
function initPlay() {
  const oppWrap = $("#opponents"), youEl = $("#you-cards"), boardEl = $("#board-cards");
  const btn = $("#deal-btn"), foldBtn = $("#fold-btn"), checkBtn = $("#check-btn"), result = $("#play-result");
  const chipsEl = $("#play-chips"), potEl = $("#play-pot"), hint = $("#play-hint");
  if (!oppWrap || !youEl || !boardEl || !btn || !foldBtn || !checkBtn) return;

  const ANTE = 5, NUM_OPP = 2;
  const BET = { flop: 5, turn: 10, river: 10 };           // fixed-limit bet for each street
  const MAX_IN = ANTE + BET.flop + BET.turn + BET.river;  // most you can commit in one hand (30) → the broke line
  const SAMPLES = 220;                                    // Monte-Carlo runouts behind every equity read
  const T = prefersReduced ? 0 : 1;                       // T scales every delay (0 ⇒ instant)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * T));
  const noop = () => {};
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // opponent seats, built once: two hole cards + a live action label ("bets 5" / "calls" / "folds")
  const oppEls = [], oppActEls = [], oppSeats = [];
  for (let i = 0; i < NUM_OPP; i++) {
    const seat = document.createElement("div");
    seat.className = "holdem__seat";
    seat.innerHTML = '<span class="holdem__tag">Opponent</span>';
    const cards = document.createElement("div"); cards.className = "hcards";
    const act = document.createElement("span"); act.className = "holdem__act";
    seat.append(cards, act); oppWrap.appendChild(seat);
    oppEls.push(cards); oppActEls.push(act); oppSeats.push(seat);
  }

  let chips = 100, you = [], opps = [], board = [];
  let pot = 0, youIn = 0, shown = 0, liveOpps = [], handLive = false, busy = false;
  let onPrimary = deal, onFold = null, onCheck = null;

  const setChips = (v) => { chips = Math.max(0, v); if (chipsEl) chipsEl.textContent = chips; };
  const setPot = (v) => { pot = v; if (potEl) potEl.textContent = v; };
  const setHint = (t) => { if (hint) hint.textContent = t; };
  const setPrimary = (label, show = true) => { btn.innerHTML = `${label} <span class="arrow" aria-hidden="true">→</span>`; btn.hidden = !show; btn.disabled = !show; };
  const ghost = (el, label, show) => { el.hidden = !show; el.disabled = !show; if (show) el.textContent = label; };
  const broke = () => chips < MAX_IN;                     // can't cover a full hand → offer a reset
  const shownBoard = () => board.slice(0, shown);         // the community cards revealed so far

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

  // a face-down "table set" between hands
  function rest() {
    handLive = false; busy = false; you = []; opps = []; board = []; liveOpps = []; shown = 0; youIn = 0;
    setPot(0);
    oppSeats.forEach((s) => s.classList.remove("is-folded"));
    oppActEls.forEach((a) => { a.textContent = ""; a.removeAttribute("data-act"); });
    oppEls.forEach((el) => fill(el, [DECK[0], DECK[0]], false));
    fill(boardEl, [DECK[0], DECK[0], DECK[0], DECK[0], DECK[0]], false);
    fill(youEl, [DECK[0], DECK[0]], false);
    result.innerHTML = "";
    setHint(`${NUM_OPP + 1}-handed — ante ${ANTE} to play.`);
    ghost(foldBtn, "Fold", false); ghost(checkBtn, "Check", false);
    setPrimary("Deal me in"); onPrimary = deal; onFold = onCheck = null;
  }

  // ---- the table acts before you, so you always close the street ----

  async function label(o, text, kind) {           // show an opponent's move, then pause so you can read it
    oppActEls[o].textContent = text;
    if (kind) oppActEls[o].setAttribute("data-act", kind); else oppActEls[o].removeAttribute("data-act");
    await sleep(430);
  }
  function muck(o) { liveOpps = liveOpps.filter((x) => x !== o); oppSeats[o].classList.add("is-folded"); }

  // one opponent's move from its own seat: value-bet / call by Monte-Carlo equity, priced
  // against the pot, with a little noise and the occasional bluff so it reads human
  function oppMove(o, toCall) {
    const e = equity(opps[o], shownBoard(), liveOpps.length, SAMPLES);   // vs the rest of the live field (incl. you)
    const r = Math.random();
    if (toCall > 0) {
      const odds = toCall / (pot + toCall);                                    // equity it needs to call
      return r < clamp((e - odds) * 2.2 + 0.2, 0.04, 0.97) ? "call" : "fold";
    }
    return r < clamp((e - 0.5) * 1.7, 0, 0.85) + (e < 0.22 ? 0.07 : 0) ? "bet" : "check";
  }
  async function respond(o, toCall) {              // an opponent facing a bet
    if (oppMove(o, toCall) === "call") { setPot(pot + toCall); await label(o, "calls", "in"); }
    else { muck(o); await label(o, "folds", "fold"); }
  }
  // run the table's action for a street; returns the bet that lands on you (0 = checked through)
  async function opponentsAct(bet) {
    let toCall = 0; const checked = [];
    for (const o of liveOpps.slice()) {
      if (toCall === 0) {
        if (oppMove(o, 0) === "bet") { toCall = bet; setPot(pot + bet); await label(o, `bets ${bet}`, "in"); }
        else { checked.push(o); await label(o, "checks", "check"); }
      } else { await respond(o, toCall); }
    }
    if (toCall > 0) for (const o of checked) await respond(o, toCall);          // earlier checkers now face the bet
    return toCall;
  }

  // ---- you ----

  function payYou(amt) { setChips(chips - amt); youIn += amt; setPot(pot + amt); }

  function showYou(toCall) {                       // surface your made hand + live equity, then the prompt
    const made = bestOf([...you, ...shownBoard()]);
    const e = Math.round(equity(you, shownBoard(), liveOpps.length, SAMPLES) * 100);
    result.innerHTML = `<span class="play__hands">You hold <b>${HAND_NAMES[made.cat]}</b> · <b>${e}%</b> to win</span>`;
    setHint(toCall > 0 ? `Facing a bet of ${toCall} — call or fold.` : "Checked to you — check or bet.");
  }

  // your decision; resolves with "fold" | "check" | "call" | "bet" when you click
  function youAct(toCall, bet) {
    return new Promise((resolve) => {
      const facing = toCall > 0;
      ghost(foldBtn, "Fold", facing); ghost(checkBtn, "Check", !facing);
      setPrimary(facing ? `Call ${toCall}` : `Bet ${bet}`);
      btn.focus({ preventScroll: true });            // the reused control was just re-shown; keep keyboard focus on it
      const done = (kind) => { ghost(foldBtn, "Fold", false); ghost(checkBtn, "Check", false); btn.hidden = true; onFold = onCheck = null; onPrimary = noop; resolve(kind); };
      onPrimary = () => done(facing ? "call" : "bet");
      onFold = () => done("fold");
      onCheck = () => done("check");
    });
  }

  // one street: reveal the new card(s) → the table acts → you act
  async function playStreet(name) {
    shown = name === "flop" ? 3 : name === "turn" ? 4 : 5;
    const bet = BET[name];
    if (name !== "flop") { flip(boardEl.children[shown - 1]); await sleep(560); }   // turn / river card
    setHint(`${cap(name)} — the table acts…`);
    await sleep(360);
    const toCall = await opponentsAct(bet);
    showYou(toCall);
    const choice = await youAct(toCall, bet);
    if (choice === "fold") return finishFold();
    if (choice === "call") payYou(toCall);
    else if (choice === "bet") {
      payYou(bet); setHint("You bet — the table decides…");
      for (const o of liveOpps.slice()) await respond(o, bet);
      if (!liveOpps.length) return finishUncontested();
    }
    // check / call / called-bet → on to the next street
  }

  // ---- endings ----
  function endHand() {
    busy = false; handLive = false;
    ghost(foldBtn, "Fold", false); ghost(checkBtn, "Check", false); onFold = onCheck = null;
    setPrimary(broke() ? "Reset chips" : "Deal again"); onPrimary = deal; btn.focus({ preventScroll: true });
  }
  function finishFold() {
    result.innerHTML = `<span class="muted">You fold — −${youIn}</span>`;
    setHint(""); setPot(0); endHand();
  }
  function finishUncontested() {                   // everyone folded to your bet — you take it down, no cards shown
    const won = pot - youIn; setChips(chips + pot);
    result.innerHTML = `<span class="play__hands">The table folds — you take it down.</span><span class="play__win">You win +${won}</span>`;
    setHint(""); setPot(0); endHand();
  }
  async function showdown() {                       // among the seats still live → best hand wins, ties split
    setHint("Showdown.");
    for (const o of liveOpps) $$(".pcard", oppEls[o]).forEach(flip);
    await sleep(320);
    const yb = bestOf([...you, ...board]);
    const obs = liveOpps.map((o) => bestOf([...opps[o], ...board]));
    let best = yb.score; obs.forEach((h) => { if (cmpScore(h.score, best) > 0) best = h.score; });
    const bestOpp = obs.reduce((m, h) => (!m || cmpScore(h.score, m.score) > 0 ? h : m), null);
    const youWin = cmpScore(yb.score, best) === 0;
    const winners = (youWin ? 1 : 0) + obs.filter((h) => cmpScore(h.score, best) === 0).length;
    const win5 = new Set(yb.cards.map(key));         // lift the five that make your hand
    [youEl, boardEl].forEach((el) => $$(".pcard", el).forEach((c) => { if (c._card && win5.has(key(c._card))) c.classList.add("is-best"); }));
    let out;
    if (youWin) { const share = Math.round(pot / winners), net = share - youIn; setChips(chips + share); out = net > 0 ? `<span class="play__win">You win +${net}</span>` : `<span class="muted">Split — push</span>`; }
    else out = `<span class="play__lose">You lose −${youIn}</span>`;
    result.innerHTML = `<span class="play__hands">You <b>${HAND_NAMES[yb.cat]}</b> · Best opp <b>${HAND_NAMES[bestOpp.cat]}</b></span>${out}`;
    setPot(0); endHand();
  }

  // deal a fresh hand and run it flop → turn → river → showdown
  async function deal() {
    if (busy || handLive) return;
    if (broke()) setChips(100);                      // top up when you can't cover a full hand
    busy = true; handLive = true;
    oppSeats.forEach((s) => s.classList.remove("is-folded"));
    oppActEls.forEach((a) => { a.textContent = ""; a.removeAttribute("data-act"); });
    result.innerHTML = ""; ghost(foldBtn, "Fold", false); ghost(checkBtn, "Check", false);
    setPrimary("Deal me in", false);
    const d = shuffle(DECK.slice()); let k = 0;
    you = [d[k++], d[k++]];
    opps = oppEls.map(() => [d[k++], d[k++]]);
    board = [d[k++], d[k++], d[k++], d[k++], d[k++]];
    liveOpps = oppEls.map((_, i) => i);
    setChips(chips - ANTE); youIn = ANTE; setPot(ANTE * (NUM_OPP + 1));         // everyone antes
    oppEls.forEach((el, i) => fill(el, opps[i], false));   // opponents' hole cards face-down
    fill(youEl, you, true, 60);
    boardEl.innerHTML = "";
    board.forEach((card, i) => boardEl.appendChild(cardEl(card, i < 3, i < 3 ? 220 + i * 90 * T : 0)));  // flop up, turn+river down
    await sleep(720);
    for (const name of ["flop", "turn", "river"]) {
      await playStreet(name);
      if (!handLive) return;                         // folded or won uncontested
    }
    await showdown();
  }

  btn.addEventListener("click", () => { if (!btn.disabled && !btn.hidden) onPrimary(); });
  foldBtn.addEventListener("click", () => { if (onFold) onFold(); });
  checkBtn.addEventListener("click", () => { if (onCheck) onCheck(); });
  rest();
}

/* ---------- Inter-orb collision — while both orbs are loose they bounce off each other instead of
   overlapping. Each loose orb registers a handle (viewport-space centre / radius / velocity, whether
   it's currently held, plus hooks to nudge + wake it); a shared rAF resolves circle-circle overlaps
   with a mass-weighted elastic response, so the little "o" ricochets off the big SJ orb while the SJ
   barely budges. Runs only while ≥2 orbs are loose. ---------- */
const looseOrbs = [];
let collideRaf = 0;
function resolveOrbCollisions() {
  for (let i = 0; i < looseOrbs.length; i++) for (let j = i + 1; j < looseOrbs.length; j++) {
    const a = looseOrbs[i], b = looseOrbs[j];
    let dx = b.cx() - a.cx(), dy = b.cy() - a.cy(), dist = Math.hypot(dx, dy);
    const min = a.r() + b.r();
    if (dist >= min) continue;
    if (dist < 0.01) { dx = Math.random() - 0.5; dy = -Math.random() - 0.1; dist = Math.hypot(dx, dy) || 1; }  // dead-centre overlap → shove apart
    const nx = dx / dist, ny = dy / dist, overlap = min - dist;
    const ia = a.held() ? 0 : 1 / a.mass(), ib = b.held() ? 0 : 1 / b.mass(), inv = ia + ib;   // held = immovable
    if (!inv) continue;
    a.nudge(-nx * overlap * (ia / inv), -ny * overlap * (ia / inv));   // separate, weighted by inverse mass
    b.nudge(nx * overlap * (ib / inv), ny * overlap * (ib / inv));
    const vn = (b.vx() - a.vx()) * nx + (b.vy() - a.vy()) * ny;        // relative velocity along the contact normal
    if (vn < 0) {                                                      // only if they're closing
      const imp = -1.7 * vn / inv;                                    // restitution ~0.7
      a.setV(a.vx() - imp * ia * nx, a.vy() - imp * ia * ny);
      b.setV(b.vx() + imp * ib * nx, b.vy() + imp * ib * ny);
    }
    a.wake(); b.wake();
  }
}
function collideLoop() { if (looseOrbs.length < 2) { collideRaf = 0; return; } resolveOrbCollisions(); collideRaf = requestAnimationFrame(collideLoop); }
function registerOrb(h) { if (looseOrbs.indexOf(h) < 0) looseOrbs.push(h); if (!collideRaf && looseOrbs.length >= 2) collideRaf = requestAnimationFrame(collideLoop); }
function deregisterOrb(h) { const i = looseOrbs.indexOf(h); if (i >= 0) looseOrbs.splice(i, 1); }

/* ---------- Interactive monogram orb (About) ---------- */
function initOrb() {
  const shape = $(".about__shape");
  const orb = shape && $(".about__orb", shape);
  const face = $("[data-orb]");
  if (!shape || !orb || !face) return;
  const mono = face.querySelector(".about__monogram");

  let loose = false, dragging = false, armed = false, armedMouse = false, downX = 0, downY = 0;
  let x = 0, y = 0, vx = 0, vy = 0, w = 0, h = 0, rafId = 0, lastT = 0, dragDX = 0, dragDY = 0, hist = [], sjX = 0, sjY = 0, sjR = 0;
  const collHandle = { cx: () => x + w / 2, cy: () => y + h / 2, r: () => w / 2, mass: () => w / 2, vx: () => vx, vy: () => vy, setV: (a, b) => { vx = a; vy = b; }, held: () => dragging, nudge: (ddx, ddy) => { x = clamp(x + ddx, 0, vw() - w); y = clamp(y + ddy, 0, vh() - h); draw(); }, wake: () => run() };

  // ---- hover tilt (locked state, mouse only) ----
  if (!prefersReduced) {
    const zone = face.closest("section") || face;
    const MAX = 9;
    let raf = 0;
    zone.addEventListener("pointermove", (e) => {
      if (loose || (e.pointerType && e.pointerType !== "mouse")) return;
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

  if (prefersReduced) return;  // the physics toy is motion — skip it entirely under reduced-motion

  // A fixed, viewport-sized, overflow-hidden stage. The loose bubble (and its squish) live inside it, so they can
  // never spill past the edges and spawn a scrollbar. pointer-events:none keeps the stage from blocking the page.
  let layer = null;
  const stage = () => (layer || (layer = document.body.appendChild(Object.assign(document.createElement("div"), { className: "orb-layer" }))));

  // ---- physics: click to pop loose → gravity + wall bounce; drag to fling; drag back to the cutout to re-lock ----
  const GRAV = 0.44, REST = 0.72, FLOOR_REST = 0.62, FLOORF = 0.93, AIRX = 0.992, AIRY = 0.999;
  const vw = () => document.documentElement.clientWidth;   // clientWidth excludes the scrollbar, so a fixed bubble at the edge never spawns one
  const vh = () => document.documentElement.clientHeight;
  const homeRect = () => shape.getBoundingClientRect();
  const draw = () => { orb.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)"; };
  const squish = () => { face.classList.remove("is-squish"); void face.offsetWidth; face.classList.add("is-squish"); };
  face.addEventListener("animationend", () => face.classList.remove("is-squish"));
  const swayMono = () => {
    const hh = h || 1, nx = sjX / hh, sunk = clamp(sjY / (hh * 0.16), 0, 1);   // 0 held/centered → 1 fully sunk
    // as the SJ sinks it also tips forward a touch (perspective rotateX) so the monogram itself reads as angled-down
    if (mono) mono.style.transform = "translate(" + sjX.toFixed(1) + "px," + sjY.toFixed(1) + "px) perspective(360px) rotateX(" + (sunk * 8).toFixed(1) + "deg) rotate(" + sjR.toFixed(1) + "deg)";
    face.style.setProperty("--lx", (36 - nx * 80).toFixed(1) + "%");            // light shifts opposite the lean
    face.style.setProperty("--ly", (26 - (sjY / hh) * 95).toFixed(1) + "%");    // and rides up as the SJ sinks → ball tips to face down
    face.style.setProperty("--sx", (50 + nx * 60).toFixed(1) + "%");            // cast follows the heavy (SJ) side
    face.style.setProperty("--sh-x", (sjX * 0.42).toFixed(1) + "px");           // inset occlusion follows the SJ, rim light goes opposite
  };

  // return-home button — lazily created, shown only while the orb is loose
  let resetBtn = null;
  const getReset = () => {
    if (!resetBtn) {
      resetBtn = Object.assign(document.createElement("button"), { className: "orb-reset", type: "button" });
      resetBtn.innerHTML = '<span class="orb-reset__i" aria-hidden="true">↺</span> Return SJ';
      resetBtn.addEventListener("click", () => { if (loose) snapHome(); });
      document.body.appendChild(resetBtn);
    }
    return resetBtn;
  };

  function loop(t) {
    if (!loose) { rafId = 0; return; }
    const dt = lastT ? clamp((t - lastT) / 16.6667, 0.5, 2.4) : 1;
    lastT = t;
    let moving = false;   // recomputed fresh each frame — no sticky "at rest" flag that could freeze a fresh fling mid-air
    if (!dragging) {
      vy += GRAV * dt; vx *= Math.pow(AIRX, dt); vy *= Math.pow(AIRY, dt);
      x += vx * dt; y += vy * dt;
      const W = vw() - w, H = vh() - h;
      let hit = 0;
      if (x <= 0) { x = 0; vx = -vx * REST; hit = Math.abs(vx); }
      else if (x >= W) { x = W; vx = -vx * REST; hit = Math.abs(vx); }
      if (y <= 0) { y = 0; vy = -vy * REST; }
      else if (y >= H) { y = H; if (Math.abs(vy) > 2.4) hit = Math.max(hit, Math.abs(vy)); vy = -vy * FLOOR_REST; vx *= FLOORF; }
      if (hit > 4.5) squish();
      draw();
      // Ease to rest instead of snapping. A hard velocity cutoff is what read as an abrupt stop, so once it's
      // on the floor and slow, bleed off the last dying bounces gradually and only park when it's truly still.
      const onFloor = y >= H - 0.5;
      if (onFloor && Math.abs(vy) < 1.3) vy *= 0.8;
      const parked = onFloor && Math.abs(vy) < 0.16 && Math.abs(vx) < 0.09;
      if (parked) { vx = vy = 0; }
      moving = !parked;
    }
    // SJ "gravity": while HELD the monogram stays centered (a glow shows it's grabbed, no tilt yet); once
    // RELEASED it sinks to the bottom — slow and heavy — and the light + shadow ride down with it, so the
    // tip-down reads as real weight. Target sway comes from the current velocity.
    const sink = h * 0.16;
    const held = dragging;
    const syTarget = held ? 0 : sink;
    const tx = held ? 0 : clamp(-vx, -h * 0.09, h * 0.09);
    const tr = held ? 0 : clamp(-vx * 0.65, -11, 11);
    const syRate = held ? 0.16 : 0.036;   // released: slow + dramatic sink (gravity); held: snappy return to centre
    const swR = held ? 0.16 : 0.10;
    sjX += (tx - sjX) * swR; sjY += (syTarget - sjY) * syRate; sjR += (tr - sjR) * swR;
    swayMono();
    const sjSettled = Math.abs(sjY - syTarget) < 0.4 && Math.abs(sjX) < 0.4 && Math.abs(sjR) < 0.4;
    if (!moving && sjSettled) { rafId = 0; return; }   // ball parked (or held still mid-drag) + SJ settled → idle until the next input
    rafId = requestAnimationFrame(loop);
  }
  const run = () => { if (!rafId) { lastT = 0; rafId = requestAnimationFrame(loop); } };
  const halt = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };

  function unlock(pop) {
    if (loose) return;
    const r = orb.getBoundingClientRect();
    w = r.width; h = r.height; x = r.left; y = r.top;
    orb.style.width = w + "px"; orb.style.height = h + "px";
    face.style.setProperty("--rx", "0deg"); face.style.setProperty("--ry", "0deg");
    orb.classList.add("is-loose"); shape.classList.add("is-loose");
    draw();
    stage().appendChild(orb);   // move into the clip layer, keeping its on-screen spot via the transform
    loose = true; registerOrb(collHandle);
    sjX = sjY = sjR = 0;        // SJ starts centered, then eases down to the bottom in the loop
    getReset().classList.add("is-shown");
    if (pop) { vx = (Math.random() * 2 - 1) * 2.4; vy = -7; squish(); }   // a single click pops it straight up with a light bounce
    else { vx = 0; vy = 0; }                                              // a drag grabs it in place (no pop)
    run();
  }
  function relock() {
    loose = false; halt(); deregisterOrb(collHandle);
    shape.appendChild(orb);   // reparent back into its float box (home)
    orb.classList.remove("is-loose"); shape.classList.remove("is-loose", "is-target");
    orb.style.transition = ""; orb.style.transform = ""; orb.style.width = ""; orb.style.height = "";
    if (mono) mono.style.transform = "";   // SJ back to its centered badge position
    face.style.removeProperty("--lx"); face.style.removeProperty("--ly"); face.style.removeProperty("--sx"); face.style.removeProperty("--sh-x"); face.classList.remove("is-grabbed");
    sjX = sjY = sjR = 0;
    if (resetBtn) resetBtn.classList.remove("is-shown");
  }
  const near = () => {
    const hr = homeRect();
    return Math.hypot((x + w / 2) - (hr.left + hr.width / 2), (y + h / 2) - (hr.top + hr.height / 2)) < Math.max(64, w * 0.5);
  };
  function snapHome() {
    const hr = homeRect();
    halt();
    orb.style.transition = "transform 0.36s var(--ease-spring)";
    x = hr.left; y = hr.top; draw();
    let done = false;
    const finish = () => { if (done) return; done = true; orb.removeEventListener("transitionend", finish); relock(); };
    orb.addEventListener("transitionend", finish);
    setTimeout(finish, 440);
  }

  const DRAG_THRESH = 7;   // past this a locked-orb press becomes a grab-and-pull; under it, a plain click just pops
  function beginDrag(e) {
    dragging = true;
    dragDX = e.clientX - x; dragDY = e.clientY - y;
    hist = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    orb.style.transition = "";
    run();   // keep the loop alive so the SJ rolls (eases) to the bottom while carried — never jumps
  }
  orb.addEventListener("pointerdown", (e) => {
    if (loose) { face.classList.add("is-grabbed"); try { orb.setPointerCapture(e.pointerId); } catch (_) {} beginDrag(e); e.preventDefault(); return; }
    // locked: arm — a click/tap pops it loose, a mouse/pen drag pulls it straight out in one gesture
    armed = true; armedMouse = e.pointerType !== "touch"; downX = e.clientX; downY = e.clientY;
    // press feedback + capture + preventDefault only for mouse/pen; on touch stay hands-off so a vertical swipe still scrolls
    if (armedMouse) { face.classList.add("is-grabbed"); try { orb.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); }
  });
  orb.addEventListener("pointermove", (e) => {
    if (armed && !loose) {
      if (armedMouse && Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_THRESH) { armed = false; unlock(false); beginDrag(e); }
      else return;   // touch: let a swipe scroll; a tap pops on pointerup
    }
    if (!dragging) return;
    x = clamp(e.clientX - dragDX, 0, vw() - w); y = clamp(e.clientY - dragDY, 0, vh() - h);
    draw();
    hist.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (hist.length > 6) hist.shift();
    shape.classList.toggle("is-target", near());
    run();   // ensure the SJ keeps easing smoothly while dragging
  });
  function release(e) {
    face.classList.remove("is-grabbed");
    if (armed && !loose) { armed = false; unlock(true); return; }   // tap → pop loose + bounce
    if (!dragging) return;
    dragging = false;
    if (hist.length >= 2) {
      const a = hist[0], b = hist[hist.length - 1], d = Math.max(8, b.t - a.t);
      vx = clamp((b.x - a.x) / d * 16.6667, -42, 42); vy = clamp((b.y - a.y) / d * 16.6667, -42, 42);
    }
    if (near()) snapHome(); else run();
  }
  orb.addEventListener("pointerup", release);
  orb.addEventListener("pointercancel", (e) => { armed = false; release(e); });
  addEventListener("resize", () => { if (loose && !dragging) { x = clamp(x, 0, vw() - w); y = clamp(y, 0, vh() - h); draw(); } }, { passive: true });
}

/* ---------- Hero wordmark: the "o" in "Jo" is the SECOND live orb — a glossy torus with the full
   pop → gravity → fling → drag-back-to-the-cutout physics. Self-contained (a cousin of initOrb) so
   both orbs can be loose at once; it shares the fixed .orb-layer stage. Lighting is fixed (CSS), the
   sheen layer carries the spin, and the wordmark keeps its layout via the .hero__o cutout box. ---- */
function initHeroOrb() {
  const home = $(".hero__o");
  const orb = home && $(".hero__o-orb", home);
  const face = orb && $(".hero__o-face", orb);
  if (!home || !orb || !face) return;

  let loose = false, dragging = false, armed = false, armedMouse = false, downX = 0, downY = 0;
  let x = 0, y = 0, vx = 0, vy = 0, w = 0, h = 0, rafId = 0, lastT = 0, dragDX = 0, dragDY = 0, hist = [];
  const collHandle = { cx: () => x + w / 2, cy: () => y + h / 2, r: () => w / 2, mass: () => w / 2, vx: () => vx, vy: () => vy, setV: (a, b) => { vx = a; vy = b; }, held: () => dragging, nudge: (ddx, ddy) => { x = clamp(x + ddx, 0, vw() - w); y = clamp(y + ddy, 0, vh() - h); draw(); }, wake: () => run() };

  // ---- hover tilt (locked, mouse only): the o leans toward the cursor as it sweeps the name ----
  if (!prefersReduced) {
    const zone = home.closest(".hero__main") || home.closest(".hero") || home;
    const MAX = 11;
    let raf = 0;
    zone.addEventListener("pointermove", (e) => {
      if (loose || e.pointerType === "touch") return;
      const r = orb.getBoundingClientRect();
      const px = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 7), -1, 1);
      const py = clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 7), -1, 1);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { face.style.setProperty("--ry", (px * MAX).toFixed(2) + "deg"); face.style.setProperty("--rx", (-py * MAX).toFixed(2) + "deg"); });
    }, { passive: true });
    zone.addEventListener("pointerleave", () => { face.style.setProperty("--rx", "0deg"); face.style.setProperty("--ry", "0deg"); });
  }
  if (prefersReduced) return;   // physics is motion — under reduced-motion the o stays a static torus

  // shared fixed clip-layer — both orbs live here while loose, so neither can spill and spawn a scrollbar
  const stage = () => $(".orb-layer") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "orb-layer" }));

  const GRAV = 0.44, REST = 0.72, FLOOR_REST = 0.62, FLOORF = 0.93, AIRX = 0.992, AIRY = 0.999;
  const vw = () => document.documentElement.clientWidth;   // excludes the scrollbar → a fixed bubble never spawns one
  const vh = () => document.documentElement.clientHeight;
  const homeRect = () => home.getBoundingClientRect();
  const draw = () => { orb.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)"; };
  const squish = () => { face.classList.remove("is-squish"); void face.offsetWidth; face.classList.add("is-squish"); };
  face.addEventListener("animationend", () => face.classList.remove("is-squish"));

  // ---- discoverability callout: a one-time "poke me" tooltip so first-time visitors learn the o is a
  // toy. It surfaces once the landing choreography has settled and retires the instant the o is touched
  // (persisted, so a visitor who's found it is never nagged again; shown at most once per session). ----
  let hintEl = null, hintTimer = 0;
  const seen = () => { try { return !!localStorage.getItem("heroOrbSeen"); } catch (_) { return false; } };
  const hintedThisSession = () => { try { return !!sessionStorage.getItem("heroOrbHinted"); } catch (_) { return false; } };
  const dismissHint = (persist) => {
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = 0; }
    if (persist) { try { localStorage.setItem("heroOrbSeen", "1"); } catch (_) {} }
    if (hintEl) { const el = hintEl; hintEl = null; el.classList.remove("is-shown"); setTimeout(() => el.remove(), 450); }
  };
  if (!seen() && !hintedThisSession()) {
    hintTimer = setTimeout(() => {
      if (loose || seen()) return;             // they already found it during the wait → skip the hint
      try { sessionStorage.setItem("heroOrbHinted", "1"); } catch (_) {}
      hintEl = document.createElement("span");
      hintEl.className = "hero__o-hint"; hintEl.setAttribute("aria-hidden", "true");
      hintEl.innerHTML = '<span class="hero__o-hint-inner"><span class="hero__o-hint-tail"></span>poke me</span>';
      home.appendChild(hintEl);
      requestAnimationFrame(() => { if (hintEl) hintEl.classList.add("is-shown"); });
      hintTimer = setTimeout(() => dismissHint(false), 12000);   // retire quietly if ignored (may re-hint next session)
    }, 2500);
  }

  // return-home button — lazily created, stacked above the About orb's so both can be live at once
  let resetBtn = null;
  const getReset = () => {
    if (!resetBtn) {
      resetBtn = Object.assign(document.createElement("button"), { className: "orb-reset orb-reset--hero", type: "button" });
      resetBtn.innerHTML = '<span class="orb-reset__i" aria-hidden="true">↺</span> Return o';
      resetBtn.addEventListener("click", () => { if (loose) snapHome(); });
      document.body.appendChild(resetBtn);
    }
    return resetBtn;
  };

  function loop(t) {
    if (!loose) { rafId = 0; return; }
    const dt = lastT ? clamp((t - lastT) / 16.6667, 0.5, 2.4) : 1;
    lastT = t;
    if (!dragging) {
      vy += GRAV * dt; vx *= Math.pow(AIRX, dt); vy *= Math.pow(AIRY, dt);
      x += vx * dt; y += vy * dt;
      const W = vw() - w, H = vh() - h;
      let hit = 0;
      if (x <= 0) { x = 0; vx = -vx * REST; hit = Math.abs(vx); }
      else if (x >= W) { x = W; vx = -vx * REST; hit = Math.abs(vx); }
      if (y <= 0) { y = 0; vy = -vy * REST; }
      else if (y >= H) { y = H; if (Math.abs(vy) > 2.4) hit = Math.max(hit, Math.abs(vy)); vy = -vy * FLOOR_REST; vx *= FLOORF; }
      if (hit > 4.5) squish();
      draw();
      const onFloor = y >= H - 0.5;
      if (onFloor && Math.abs(vy) < 1.3) vy *= 0.8;   // bleed the dying bounces so it eases to rest, not a hard stop
      if (onFloor && Math.abs(vy) < 0.16 && Math.abs(vx) < 0.09) { vx = vy = 0; rafId = 0; return; }
    }
    rafId = requestAnimationFrame(loop);
  }
  const run = () => { if (!rafId) { lastT = 0; rafId = requestAnimationFrame(loop); } };
  const halt = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };

  let poppedAt = 0;   // when the o last popped loose — swallows the tap's ghost click so it can't snap right back
  function unlock(pop) {
    if (loose) return;
    const r = orb.getBoundingClientRect();
    w = r.width; h = r.height; x = r.left; y = r.top;
    orb.style.width = w + "px"; orb.style.height = h + "px";
    face.style.setProperty("--rx", "0deg"); face.style.setProperty("--ry", "0deg");
    orb.classList.add("is-loose"); home.classList.add("is-loose");
    draw();
    stage().appendChild(orb);   // pop into the clip layer, keeping its on-screen spot via the transform
    loose = true; registerOrb(collHandle);
    getReset().classList.add("is-shown");
    poppedAt = performance.now();
    if (pop) { vx = (Math.random() * 2 - 1) * 2.4; vy = -7; squish(); }   // a click pops it straight up with a light bounce
    else { vx = 0; vy = 0; }                                              // a drag grabs it in place
    run();
  }
  function relock() {
    loose = false; halt(); deregisterOrb(collHandle);
    home.appendChild(orb);   // back into the wordmark cutout (home)
    orb.classList.remove("is-loose"); home.classList.remove("is-loose", "is-target");
    orb.style.transition = ""; orb.style.transform = ""; orb.style.width = ""; orb.style.height = "";
    face.classList.remove("is-grabbed");
    if (resetBtn) resetBtn.classList.remove("is-shown");
  }
  const near = () => {
    const hr = homeRect();
    return Math.hypot((x + w / 2) - (hr.left + hr.width / 2), (y + h / 2) - (hr.top + hr.height / 2)) < Math.max(70, w * 1.2);
  };
  function snapHome() {
    const hr = homeRect();
    halt();
    orb.style.transition = "transform 0.36s var(--ease-spring)";
    x = hr.left; y = hr.top; draw();
    let done = false;
    const finish = () => { if (done) return; done = true; orb.removeEventListener("transitionend", finish); relock(); };
    orb.addEventListener("transitionend", finish);
    setTimeout(finish, 440);
  }

  const DRAG_THRESH = 7;   // past this a locked press becomes a grab-and-pull; under it a plain click pops
  function beginDrag(e) {
    dragging = true;
    dragDX = e.clientX - x; dragDY = e.clientY - y;
    hist = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    orb.style.transition = "";
  }
  orb.addEventListener("pointerenter", () => dismissHint(true));   // hovered → they've noticed the toy
  orb.addEventListener("pointerdown", (e) => {
    dismissHint(true);                                             // first touch retires the hint for good
    if (loose) { face.classList.add("is-grabbed"); try { orb.setPointerCapture(e.pointerId); } catch (_) {} beginDrag(e); e.preventDefault(); return; }
    armed = true; armedMouse = e.pointerType !== "touch"; downX = e.clientX; downY = e.clientY;
    if (armedMouse) { face.classList.add("is-grabbed"); try { orb.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); }
  });
  orb.addEventListener("pointermove", (e) => {
    if (armed && !loose) {
      if (armedMouse && Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_THRESH) { armed = false; unlock(false); beginDrag(e); }
      else return;   // touch: let a vertical swipe scroll; a tap pops on pointerup
    }
    if (!dragging) return;
    x = clamp(e.clientX - dragDX, 0, vw() - w); y = clamp(e.clientY - dragDY, 0, vh() - h);
    draw();
    hist.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (hist.length > 6) hist.shift();
    home.classList.toggle("is-target", near());
  });
  function release(e) {
    face.classList.remove("is-grabbed");
    if (armed && !loose) { armed = false; unlock(true); return; }   // tap → pop loose + bounce
    if (!dragging) return;
    dragging = false;
    if (hist.length >= 2) {
      const a = hist[0], b = hist[hist.length - 1], d = Math.max(8, b.t - a.t);
      vx = clamp((b.x - a.x) / d * 16.6667, -42, 42); vy = clamp((b.y - a.y) / d * 16.6667, -42, 42);
    }
    if (near()) snapHome(); else run();
  }
  orb.addEventListener("pointerup", release);
  orb.addEventListener("pointercancel", (e) => { armed = false; release(e); });
  // click the cutout (the ring at the o's spot) to snap the orb home — the target is `home` itself, not
  // the orb (which is off in the clip layer while loose). On touch, popping loose flies the o up and the
  // tap fires a synthesized click on the now-exposed cutout — the 320ms guard swallows that so a light
  // tap can't pop-and-immediately-snap-back; a deliberate later tap on the cutout still resets.
  home.addEventListener("click", (e) => { if (loose && e.target === home && performance.now() - poppedAt > 320) snapHome(); });
  addEventListener("resize", () => { if (loose && !dragging) { x = clamp(x, 0, vw() - w); y = clamp(y, 0, vh() - h); draw(); } }, { passive: true });
}

/* ---------- Buttery smooth in-page scrolling (anchor clicks only — never hijacks free scroll) ---------- */
function initSmoothScroll() {
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 60;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
  let raf = 0, stop = null;

  function focusTarget(el) { if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }

  function glide(targetY, el) {
    const maxY = document.documentElement.scrollHeight - innerHeight;
    targetY = Math.max(0, Math.min(targetY, maxY));
    const startY = window.scrollY, dist = targetY - startY;
    if (prefersReduced || Math.abs(dist) < 2) { window.scrollTo(0, targetY); if (el) focusTarget(el); return; }
    const dur = clamp(Math.abs(dist) * 0.5, 380, 720); // distance-scaled, capped — quick but smooth
    let t0 = null, killed = false;
    cancelAnimationFrame(raf); if (stop) stop();
    const cancel = () => { killed = true; cancelAnimationFrame(raf); if (stop) { stop(); stop = null; } };
    const onKey = (e) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) cancel(); };
    addEventListener("wheel", cancel, { passive: true });
    addEventListener("touchstart", cancel, { passive: true });
    addEventListener("keydown", onKey);
    stop = () => { removeEventListener("wheel", cancel); removeEventListener("touchstart", cancel); removeEventListener("keydown", onKey); };
    const step = (now) => {
      if (killed) return;
      if (t0 == null) t0 = now;
      const p = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, startY + dist * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else { if (stop) { stop(); stop = null; } if (el) focusTarget(el); }
    };
    raf = requestAnimationFrame(step);
  }

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    const a = e.target.closest('a[href^="#"], a[href^="/#"]');
    if (!a || a.classList.contains("skip-link")) return;       // skip-link jumps instantly (a11y)
    const id = a.getAttribute("href").replace(/^\//, "").slice(1);
    const el = id && document.getElementById(id);
    if (!el) return;                                            // cross-page hash (e.g. /#work on a case page) → let it navigate
    e.preventDefault();
    glide(el.getBoundingClientRect().top + window.scrollY - navH - 12, el);
    history.replaceState(null, "", "#" + id);
  });
}

/* ---------- Section-index rail: fade whichever edge still has items to swipe (mobile) ---------- */
function initRailFade() {
  const rail = $(".index-rail");
  if (!rail) return;
  const update = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    rail.style.setProperty("--ml", rail.scrollLeft > 2 ? "24px" : "0px");
    rail.style.setProperty("--mr", rail.scrollLeft < max - 2 ? "24px" : "0px");
  };
  update();
  rail.addEventListener("scroll", update, { passive: true });
  addEventListener("resize", debounce(update, 150));
}

/* ---------- Pretext: exact-fit display type (the giant hero name fills its column live) ---------- */
function fitOne(el) {
  const text = (el.dataset.fitText || el.textContent || "").trim();
  if (!text) return;
  const cs = getComputedStyle(el);
  const target = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (target <= 0) return;
  let max = parseFloat(el.dataset.fitMax) || 280;
  const vh = parseFloat(el.dataset.fitVh);          // optional: cap size to a fraction of viewport height
  if (vh) max = Math.min(max, innerHeight * vh);    // keeps a full-screen hero from overflowing on short laptops
  const min = parseFloat(el.dataset.fitMin) || 22;
  // Measure the REAL rendered width via a DOM probe: canvas measureText can't express
  // font-optical-sizing or letter-spacing, so it mis-measures variable display type. The
  // width is linear in font-size (all metrics are em-based), so one probe gives the exact fit.
  const PROBE = 100;
  const lsEm = (parseFloat(cs.letterSpacing) || 0) / (parseFloat(cs.fontSize) || 1);  // px→em so it scales with the probe
  const probe = document.createElement("span");
  probe.textContent = text;
  probe.style.cssText = "position:absolute;left:-9999px;top:-9999px;white-space:nowrap;visibility:hidden;" +
    `font:${cs.fontStyle} ${cs.fontWeight} ${PROBE}px/1 ${cs.fontFamily};letter-spacing:${(lsEm * PROBE).toFixed(3)}px;` +
    `font-optical-sizing:${cs.fontOpticalSizing};font-variation-settings:${cs.fontVariationSettings};text-transform:${cs.textTransform};`;
  document.body.appendChild(probe);
  const w = probe.getBoundingClientRect().width;
  probe.remove();
  if (w <= 0) return;
  const size = Math.max(min, Math.min(max, target * PROBE / w));
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

/* ---------- Doctor Strange portal page transitions ---------- */
/* A real portal, not a page swap: on an internal-link click the destination is loaded into a
   clipped <iframe> laid over the CURRENT page, and a fiery ring opens it from the centre — you
   keep seeing the current page around the ring while more and more of the next page shows
   through it, until it fills the screen and we hand off to the real navigation (already loaded,
   so the swap is invisible). The iframe is sandboxed (renders styled, runs no scripts → no
   double analytics, no nested portal) and themed to match. Gold-orange sparks; skipped under
   reduced motion; a timer failsafe guarantees navigation even if the frame never loads. */
function initPortal() {
  if (prefersReduced) return;   // motion-heavy — links just navigate

  const TAU = Math.PI * 2;
  const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 640;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const N = mobile ? 440 : 760;                 // fire streaks — each is a tangential arc; together they build the ring of fire
  const SPIN = 0.009;                           // ring rotation, rad/ms — full spin speed; the ring spins the whole time
  const OPEN_MS = 850, HOLD_MS = 800, FADE_MS = 470;   // expand → hold (spins in place) → dissolve


  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  // a sparkler particle: sits in the ring band, sprays outward over its short life and rains down
  // The ring IS fire: most streaks flow tangentially within the band; ~a third escape and fly off as embers.
  function makeFire() {
    const a = [], bandW = mobile ? 30 : 42;
    for (let i = 0; i < N; i++) {
      a.push({
        a: Math.random() * TAU,
        band: (Math.random() * 2 - 1) * bandW,          // where in the band's thickness this streak sits
        spd: 0.88 + Math.random() * 0.34,               // tangential (spin) speed — slight spread so the fire churns
        arclen: 0.1 + Math.random() * Math.random() * 0.8,     // streak length (rad); mostly short, a few long wisps
        wide: (mobile ? 3 : 4.5) + Math.random() * Math.random() * (mobile ? 5 : 9),
        bri: 0.72 + Math.random() * 0.48,
        tw: 0.01 + Math.random() * 0.03, ph: Math.random() * TAU,          // flicker
        esc: Math.random() < 0.3,                       // escaping ember? (flies off the ring)
        rate: 0.0012 + Math.random() * 0.0026,          // escaping-ember life speed
        life0: Math.random(),
        spray: (mobile ? 70 : 120) * (0.4 + Math.random()),   // how far an escaping ember flies
      });
    }
    return a;
  }

  function drawRing(ctx, cx, cy, R, el, rot, strokeA, sparkA, sprayK, fire, RING) {
    // soft warm bloom behind the fire — a glow, not a hard painted band
    ctx.globalAlpha = 0.18 * strokeA; ctx.lineWidth = Math.max(44, R * 0.26);
    ctx.strokeStyle = "rgba(" + RING[0][0] + ",1)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.28 * strokeA; ctx.lineWidth = Math.max(20, R * 0.13);
    ctx.strokeStyle = "rgba(" + RING[1][0] + ",1)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    // the ring of fire: many tangential streaks flowing around it (white-hot → orange), with embers flying off
    ctx.lineCap = "round";
    // two segments per streak, colors hoisted out of the loop (no per-segment string alloc) — cheap at this density
    const SEG = 2, cHot = "rgba(" + RING[3][0] + ",1)", cGold = "rgba(" + RING[2][0] + ",1)", cOrange = "rgba(" + RING[1][0] + ",1)";
    for (const p of fire) {
      const fl = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(el * p.tw + p.ph));   // flicker
      let rr = R + p.band, fade = sparkA;
      if (p.esc) {                                                        // escaping ember: flies outward and fades out
        const lp = (el * p.rate + p.life0) % 1;
        rr += p.spray * sprayK * lp; fade = sparkA * (1 - lp) * (1 - lp);
      }
      const a0 = p.bri * fl * fade;
      if (a0 < 0.03) continue;
      const head = p.a + rot * p.spd, da = p.arclen / SEG;              // spins with the portal
      ctx.lineWidth = p.wide;
      for (let s = 0; s < SEG; s++) {                                    // comet taper: white-hot head → gold → orange tail
        const f = s / SEG;
        ctx.globalAlpha = clamp(a0 * (1 - f) * (1 - f), 0, 1);
        ctx.strokeStyle = f < 0.34 ? cHot : f < 0.68 ? cGold : cOrange;
        ctx.beginPath(); ctx.arc(cx, cy, rr, head - (s + 1) * da, head - s * da); ctx.stroke();
      }
    }
    ctx.lineCap = "butt";
    ctx.globalAlpha = 1;
  }

  // warm central bloom while the ring is still small (the portal igniting)
  function glow(ctx, cx, cy, r, a) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,224,160,1)"); g.addColorStop(1, "rgba(255,180,90,0)");
    ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.globalAlpha = 1;
  }

  // ---- open a portal onto the destination over the current page, then hand off to the real nav ----
  let leaving = false;
  function depart(href) {
    if (leaving) return; leaving = true;
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    const R0 = Math.min(W, H) * 0.05, diag = Math.hypot(cx, cy), Rhold = diag * 0.82, maxR = diag * 1.06 + 24;
    // additive "lighter" glows on dark themes but washes to nothing on a light (Paper) page —
    // so pick the blend by background luminance: additive glow on dark, normal paint on light.
    let bgLum = 0;
    try {
      for (const el of [document.body, document.documentElement]) {
        const c = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
        if (c && (c.length < 4 || +c[3] > 0.1)) { bgLum = (0.299 * +c[0] + 0.587 * +c[1] + 0.114 * +c[2]) / 255; break; }
      }
    } catch (e) {}
    const blend = bgLum > 0.55 ? "source-over" : "lighter";
    const dark = blend === "lighter";
    const RING = dark                                        // [rgb, baseAlpha] per stroke: halo, glow, body, core
      ? [["214,96,26", 0.16], ["240,150,54", 0.34], ["255,192,100", 0.78], ["255,248,226", 0.98]]
      : [["188,66,16", 0.36], ["220,102,28", 0.66], ["234,138,40", 0.98], ["250,176,72", 1]];
    // (the ring of fire is drawn with arc strokes now — the old spark sprites are no longer used)

    // the destination, rendered inside the portal. Sandboxed → styled but runs no scripts, so it
    // can't fire analytics or a nested portal; same-origin so we can theme it to match.
    const frame = document.createElement("iframe");
    frame.className = "portal-frame"; frame.setAttribute("aria-hidden", "true"); frame.tabIndex = -1;
    frame.setAttribute("sandbox", "allow-same-origin"); frame.setAttribute("scrolling", "no");
    frame.style.clipPath = "circle(0px at 50% 50%)";
    document.documentElement.appendChild(frame);

    // the sparks ring on top — transparent, so the current page stays visible around the portal
    const cv = document.createElement("canvas");
    cv.className = "portal-fx is-block"; cv.setAttribute("aria-hidden", "true");
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    document.documentElement.appendChild(cv);
    const ctx = cv.getContext("2d"); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const fire = makeFire();

    let ready = false, openAt = 0, start = 0, done = false, rot = 0, lastTs = 0;
    const nav = () => { if (done) return; done = true; try { sessionStorage.setItem("portalReveal", "1"); } catch (e) {} location.href = href; };
    const onReady = () => {   // frame rendered → match theme + reveal its JS-gated content, then open onto it
      if (ready) return; ready = true;
      setTimeout(nav, OPEN_MS + HOLD_MS + FADE_MS + 1200);   // hard backstop: reach the destination even if the rAF loop stalls
      try {
        const d = frame.contentDocument, t = document.documentElement.getAttribute("data-theme");
        if (t) d.documentElement.setAttribute("data-theme", t);   // else it keeps the same CSS default as this page
        const st = d.createElement("style");
        st.textContent = ".reveal{opacity:1!important;transform:none!important}";   // content is JS-gated → show it in the script-less preview
        (d.head || d.documentElement).appendChild(st);
      } catch (e) {}
    };
    // preview the destination with its <script>s stripped → styled, but fires no analytics and logs nothing
    fetch(href, { credentials: "same-origin" }).then((r) => r.text()).then((html) => {
      let doc = html.replace(/<script[\s\S]*?<\/script>/gi, "");   // strip scripts → no analytics / nested portal
      const t = document.documentElement.getAttribute("data-theme");
      if (t) doc = doc.replace(/<html\b/i, '<html data-theme="' + t + '"');   // theme the preview to match from first paint
      frame.addEventListener("load", onReady, { once: true });   // armed after content is set → skips the initial about:blank load
      frame.srcdoc = doc;
    }).catch(() => { frame.addEventListener("load", onReady, { once: true }); frame.src = href; });
    setTimeout(onReady, 1000);   // safety: open even if the fetch/load stalls

    function loop(ts) {
      if (!start) start = ts;
      if (!lastTs) lastTs = ts;
      const el = ts - start, dt = Math.min(50, ts - lastTs); lastTs = ts;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = blend;
      let R, strokeA = 1, sparkA = 1, spinMult = 1;   // spinMult 1 = full speed (spins throughout); winds down as it dissolves
      if (!ready) {                                              // charging: a small ring spun hard, so it looks strong from the first frame
        R = R0 * (0.86 + 0.14 * Math.sin(el * 0.011));
        spinMult = 2;
        glow(ctx, cx, cy, R0 * 5, 0.5);
      } else {                                                   // opening: expand → hold (spin) → dissolve
        if (!openAt) openAt = ts;
        const t = ts - openAt;
        let Rclip;
        if (t < OPEN_MS) {                                       // expand: reveal more of the next page
          const p = t / OPEN_MS;
          R = Rclip = R0 + (Rhold - R0) * easeInOut(p);
          spinMult = 1 + (1 - p) * (1 - p);                     // bursts strong out of the gate, settles as it opens
          if (p < 0.16) glow(ctx, cx, cy, R0 * 5, 0.5 * (1 - p / 0.16));
        } else if (t < OPEN_MS + HOLD_MS) {                     // hold: fully open, the ring spins in place
          R = Rclip = Rhold;
        } else {                                                // dissolve: the ring stays ALIVE — spins up, shoots sparks — as it disintegrates
          const pf = clamp((t - OPEN_MS - HOLD_MS) / FADE_MS, 0, 1);
          R = Rhold;
          Rclip = Rhold + (maxR - Rhold) * easeInOut(pf);
          strokeA = clamp(1 - pf * 1.5, 0, 1);                  // the solid ring dissolves first...
          sparkA = 1 - pf * pf * pf;                            // ...leaving a swirl of sparks that fade last
          spinMult = 1 - 0.5 * easeInOut(pf);                   // eases down as it loses energy, but keeps spinning hard
          if (pf >= 1) { nav(); return; }
        }
        frame.style.clipPath = "circle(" + Rclip.toFixed(1) + "px at 50% 50%)";
      }
      const sprayK = spinMult;                                  // spark throw tracks spin speed (centrifugal): slower spin → shorter sparks
      const omega = SPIN * spinMult;                              // current angular velocity — drives the spark motion-blur
      rot += dt * omega;
      drawRing(ctx, cx, cy, R, el, rot, strokeA, sparkA, sprayK, fire, RING);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // resolve a click to an in-site navigation URL, or null to leave the click alone
  function internalHref(a) {
    if (!a || !a.getAttribute || !a.getAttribute("href")) return null;
    const target = a.getAttribute("target");
    if ((target && target !== "_self") || a.hasAttribute("download")) return null;
    let url; try { url = new URL(a.href, location.href); } catch (e) { return null; }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return null;   // external / mailto / tel
    if (url.pathname === location.pathname && url.search === location.search) return null; // same document → smooth-scroll / no-op
    return url.href;
  }

  document.addEventListener("click", (e) => {
    if (leaving) { e.preventDefault(); return; }
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a");
    const href = internalHref(a);
    if (!href) return;
    e.preventDefault();
    depart(href);
  });

  // ⌘K palette (and any programmatic nav) can travel by portal too
  portalGo = (href) => {
    let url; try { url = new URL(href, location.href); } catch (e) { location.assign(href); return; }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) { location.assign(href); return; }
    depart(url.href);
  };

  // Back/forward: strip any leftover portal iframe/ring so a bfcache-restored page is never stuck
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    leaving = false;
    document.querySelectorAll(".portal-frame, .portal-fx").forEach((n) => n.remove());
  });
}

function init() {
  initPortal();
  initTheme();
  initNav();
  initSmoothScroll();
  initRailFade();
  initReveals();
  initYear();
  initClock();
  initCounters();
  initFit();
  initCommandPalette();
  initPlay();
  initOrb();
  initHeroOrb();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
