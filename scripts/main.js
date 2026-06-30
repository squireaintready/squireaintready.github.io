/* ============================================================================
   main.js — progressive enhancement for the portfolio.
   The site is fully functional with JS disabled; this layer adds:
     • theme picker (Forest / Paper / Indigo) with persistence
     • sticky nav: scrolled state, active-section links, scroll progress
     • reveal-on-scroll + inline count-ups
     • live New York clock + current year
     • ⌘K command palette (jump / open / theme / connect)
     • a heads-up Texas Hold'em mini-game (Play) — the engine behind facecard
   ========================================================================== */
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
  const nav = (id, label) => ({ group: onHome ? "Jump to" : "Go to", icon: IC.jump, title: label, sub: onHome ? "#" + id : "/#" + id, kw: id + " " + label, run: () => (document.getElementById(id) ? goTo(id) : location.assign("/#" + id)) });
  const live = (title, url) => ({ group: "Open live", icon: IC.ext, title, sub: url.replace(/^https?:\/\//, "").replace(/\/$/, ""), kw: title + " live open site", run: () => openExt(url) });
  const study = (title, url) => ({ group: "Case studies", icon: IC.doc, title: title + " — case study", sub: url, kw: title + " case study read", run: () => location.assign(url) });
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

function init() {
  initTheme();
  initNav();
  initSmoothScroll();
  initRailFade();
  initReveals();
  initYear();
  initClock();
  initCounters();
  initCommandPalette();
  initPlay();
  initOrb();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
