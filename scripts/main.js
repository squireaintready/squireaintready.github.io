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
function currentTheme() { return document.documentElement.getAttribute("data-theme") || "forest"; }
const THEMES = [
  { id: "forest", name: "Forest", note: "Bottle-green & tan" },
  { id: "paper", name: "Paper", note: "Ink on warm paper" },
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
  if (prefersReduced || !("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("is-in")); return; }
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
  orb.addEventListener("pointerdown", (e) => {
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
/* Multi-page site, so the effect spans a real navigation. A portal opens dead-centre: a
   small spinning ring of sparks ignites, holds a beat, then expands in one smooth motion.
   On arrival it opens onto the new page inside the ring and keeps rushing forward — the
   ring blows past the screen and the page scales up — as if you're pulled through; on
   departure the same ring swallows the current page into a warm void, then navigates. The
   outgoing side flags sessionStorage and the incoming page is masked before first paint by
   an inline <head> guard, so there's no flash. Gold-orange sparks, centre origin; skipped
   under reduced motion; <head> + timer failsafes make sure a page is never left covered. */
function initPortal() {
  if (prefersReduced) return;   // motion-heavy — links just navigate; the head guard no-ops too

  const TAU = Math.PI * 2;
  const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 640;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const N = mobile ? 210 : 360;                 // spark count — a dense sparkler ring
  const SPIN = 0.0019;                          // ring rotation, rad/ms
  const OUT_MS = 500, IN_MS = 860, HOLD = 60;   // out → navigate → in

  // white-gold → deep-orange sparks, pre-rendered once to sprites (cheap additive stamps)
  const HUES = ["255,247,224", "255,206,120", "248,150,54", "222,96,26"];
  const sprites = HUES.map((rgb) => {
    const s = 32, c = document.createElement("canvas"); c.width = c.height = s;
    const g = c.getContext("2d"), rad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rad.addColorStop(0, `rgba(${rgb},1)`); rad.addColorStop(0.4, `rgba(${rgb},0.6)`); rad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = rad; g.fillRect(0, 0, s, s); return c;
  });

  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  // a sparkler particle: sits in the ring band, sprays outward over its short life and rains down
  function makeEmbers() {
    const a = [], spray = mobile ? 34 : 56, band = mobile ? 9 : 13;
    for (let i = 0; i < N; i++) {
      const t = Math.random();
      a.push({
        a: Math.random() * TAU,
        band: (Math.random() * 2 - 1) * band,          // radial spread within the ring band
        sz: 0.8 + t * t * (mobile ? 3.2 : 4.6),        // skewed small — lots of fine sparks, a few fat ones
        al: 0.45 + Math.random() * 0.55,
        hue: (Math.random() * HUES.length) | 0,
        tw: 0.006 + Math.random() * 0.016, ph: Math.random() * TAU,
        rate: 0.0011 + Math.random() * 0.0024,         // spark life-cycle speed (per ms)
        life0: Math.random(),                          // staggered start
        spray: spray * (0.4 + Math.random() * 0.9),    // how far it flies out
        grav: (mobile ? 24 : 40) * Math.random(),      // downward rain
        trail: Math.random() < 0.5,
      });
    }
    return a;
  }

  function drawRing(ctx, cx, cy, R, el, embers, ringA) {
    const rot = el * SPIN;
    // glowing annulus: wide soft glow → hot gold body → white-hot core
    ctx.globalAlpha = 0.30 * ringA; ctx.lineWidth = Math.max(7, R * 0.05);
    ctx.strokeStyle = "rgba(236,140,52,1)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.70 * ringA; ctx.lineWidth = mobile ? 3 : 4.5;
    ctx.strokeStyle = "rgba(255,190,96,1)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.95 * ringA; ctx.lineWidth = mobile ? 1.4 : 2;
    ctx.strokeStyle = "rgba(255,247,222,1)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    // sparks spraying off the ring
    for (const e of embers) {
      const lp = (el * e.rate + e.life0) % 1;                     // 0..1 spark life
      const fl = 0.55 + 0.45 * Math.sin(el * e.tw + e.ph);
      const ang = e.a + rot, rr = R + e.band + e.spray * lp;
      const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr + e.grav * lp * lp;
      const a = clamp(e.al * fl * (1 - lp) * ringA, 0, 1);
      if (a < 0.012) continue;
      const sz = e.sz * (1 - 0.45 * lp), sp = sprites[e.hue];
      ctx.globalAlpha = a;
      ctx.drawImage(sp, px - sz, py - sz, sz * 2, sz * 2);
      if (e.trail) {                                              // short motion-blur streak back toward the ring
        const tr = R + e.band + e.spray * lp * 0.55;
        ctx.globalAlpha = a * 0.5;
        ctx.drawImage(sp, cx + Math.cos(ang) * tr - sz * 0.7, cy + Math.sin(ang) * tr + e.grav * lp * lp * 0.3 - sz * 0.7, sz * 1.4, sz * 1.4);
      }
    }
    ctx.globalAlpha = 1;
  }

  // scale the page content (not the canvas — it lives on <html>) for the "pulled through" depth.
  // Pivot at the viewport centre in page coords (scroll-aware) so a tall/scrolled page zooms
  // toward the portal, not around the document's middle.
  const bodyEl = document.body;
  function pageScale(s) {
    if (s == null) { bodyEl.style.transform = ""; bodyEl.style.transformOrigin = ""; bodyEl.style.willChange = ""; return; }
    bodyEl.style.transformOrigin = (scrollX + innerWidth / 2) + "px " + (scrollY + innerHeight / 2) + "px";
    bodyEl.style.willChange = "transform";
    bodyEl.style.transform = "scale(" + s.toFixed(4) + ")";
  }

  // one portal pass — "out" swallows the page into the void, "in" opens onto the new page
  function run({ polarity, dur, beat, block, onFirst, onDone }) {
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    const cv = document.createElement("canvas");
    cv.className = "portal-fx" + (block ? " is-block" : "");
    cv.setAttribute("aria-hidden", "true");
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    document.documentElement.appendChild(cv);   // on <html> so the page's scale transform never scales the effect
    const ctx = cv.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const R0 = Math.min(W, H) * 0.05;                       // the small starting ring
    const maxR = Math.hypot(cx, cy) * 1.18 + 40;            // rushes well past the corners
    const embers = makeEmbers();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0, "#1b120a"); grad.addColorStop(0.5, "#0b0806"); grad.addColorStop(1, "#050403");
    let t0 = 0, first = false, done = false;
    function finish() { if (done) return; done = true; pageScale(null); if (onDone) onDone(cv); }

    function frame(ts) {
      if (done) return;
      if (!t0) t0 = ts;
      const el = ts - t0, p = clamp(el / dur, 0, 1);

      // radius: pop the small ring in → hold the beat → expand and rush past the edges
      let R, expo = 0;
      if (p < beat) { const b = p / beat; R = R0 * (b < 0.5 ? easeOut(b / 0.5) : 1); }
      else { expo = easeInOut((p - beat) / (1 - beat)); R = R0 + (maxR - R0) * expo; }
      const ringA = 1 - Math.max(0, (p - 0.9) / 0.1) * 0.5;                    // ease the ring out at the very end
      pageScale(polarity === "in" ? 0.9 + 0.1 * expo : 1 - 0.05 * expo);       // arrival pulled forward, departure recedes

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);                          // the warm void
      ctx.globalCompositeOperation = polarity === "in" ? "destination-out" : "destination-in";
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.01, R), 0, TAU); ctx.fill();   // carve the portal disc
      ctx.globalCompositeOperation = "lighter";
      if (p < beat + 0.12) {                                                   // warm ignite glow while the ring is small
        const ig = clamp(1 - p / (beat + 0.12), 0, 1), gr = R0 * 6;
        const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
        gg.addColorStop(0, "rgba(255,224,160,1)"); gg.addColorStop(1, "rgba(255,180,90,0)");
        ctx.globalAlpha = 0.55 * ig; ctx.fillStyle = gg; ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2); ctx.globalAlpha = 1;
      }
      drawRing(ctx, cx, cy, R, el, embers, ringA);                            // the sparkler ring on the boundary
      ctx.globalCompositeOperation = "source-over";

      if (!first) { first = true; if (onFirst) onFirst(); }
      if (p < 1) requestAnimationFrame(frame); else finish();
    }
    requestAnimationFrame(frame);
    return finish;
  }

  // ---- outgoing ----
  let leaving = false;
  function depart(href) {
    if (leaving) return; leaving = true;
    try { const l = document.createElement("link"); l.rel = "prefetch"; l.href = href; document.head.appendChild(l); } catch (e) {}
    try { sessionStorage.setItem("portal", JSON.stringify({ rx: 0.5, ry: 0.5, t: Date.now() })); } catch (e) {}
    run({ polarity: "out", dur: OUT_MS, beat: 0.14, block: true });   // visual only — the void holds until unload
    setTimeout(() => { location.href = href; }, OUT_MS + HOLD);       // navigate on a clock (survives a throttled tab)
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

  // Back/forward: a page we portalled away from is frozen with the void canvas + a scaled body.
  // On bfcache restore, strip any leftover overlay and reset the page so it's never stuck.
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    leaving = false;
    pageScale(null);
    document.querySelectorAll(".portal-fx").forEach((c) => c.remove());
    document.documentElement.classList.remove("portal-arrive");
  });

  // ---- incoming: the <head> guard set .portal-arrive + window.__portal before first paint ----
  if (window.__portal) {
    window.__portal = null;
    clearTimeout(window.__portalKill);
    const dropCover = () => {   // remove the flat pre-paint cover (idempotent: onFirst + the failsafe both call it)
      const el = document.documentElement;
      el.classList.remove("portal-arrive");
      el.style.removeProperty("--portal-x"); el.style.removeProperty("--portal-y");
    };
    const finish = run({
      polarity: "in", dur: IN_MS, beat: 0.17,
      onFirst: dropCover,                // canvas has painted the void → drop the cover seamlessly
      onDone: (cv) => cv.remove(),
    });
    setTimeout(() => { dropCover(); pageScale(null); finish(); }, IN_MS + 800);   // failsafe: never leave the cover / canvas / scale behind
  }
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
