/* ============================================================================
   main.js — progressive enhancement for the portfolio.
   The site is fully functional with JS disabled; this layer adds:
     • theme toggle (light / dark) with persistence
     • sticky-nav scrolled state + active section link
     • reveal-on-scroll
     • Pretext: exact-fit display type ([data-fit]) so headings fill their column
   ========================================================================== */
import { readyFonts, fitFontSize } from "../assets/vendor/lib.js";

const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- Theme ---------- */
function systemTheme() {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || systemTheme();
}
const THEMES = [
  { id: "light", name: "Paper" },
  { id: "dark", name: "Dossier" },
  { id: "midnight", name: "Midnight" },
  { id: "bordeaux", name: "Bordeaux" },
  { id: "forest", name: "Forest" },
];
function applyTheme(id) {
  document.documentElement.setAttribute("data-theme", id);
  try { localStorage.setItem("theme", id); } catch (e) {}
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
  sync();
}

/* ---------- Sticky nav: scrolled state + active link ---------- */
function initNav() {
  const nav = $(".site-nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
  }

  const links = $$(".nav-links a[href^='#']");
  const map = new Map();
  links.forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    const sec = id && document.getElementById(id);
    if (sec) map.set(sec, a);
  });
  if (!map.size || !("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.removeAttribute("aria-current"));
          const a = map.get(e.target);
          if (a) a.setAttribute("aria-current", "page");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  map.forEach((_, sec) => obs.observe(sec));
}

/* ---------- Reveal on scroll ---------- */
function initReveals() {
  const items = $$(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const obs = new IntersectionObserver(
    (entries, o) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); o.unobserve(e.target); }
      });
    },
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
  const max = parseFloat(el.dataset.fitMax) || 280;
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
  // Re-fit once more after first paint settles (covers late font swaps)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
}

/* ---------- Year stamp ---------- */
function initYear() {
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
}

/* ---------- Play: poker mini-game (nods to Tells) ---------- */
const SUITS = [ { s: "♠", red: false }, { s: "♥", red: true }, { s: "♦", red: true }, { s: "♣", red: false } ];
const RANKS = [
  { r: 2, l: "2" }, { r: 3, l: "3" }, { r: 4, l: "4" }, { r: 5, l: "5" }, { r: 6, l: "6" },
  { r: 7, l: "7" }, { r: 8, l: "8" }, { r: 9, l: "9" }, { r: 10, l: "10" },
  { r: 11, l: "J" }, { r: 12, l: "Q" }, { r: 13, l: "K" }, { r: 14, l: "A" },
];
const SUIT_NAME = { "♠": "Spades", "♥": "Hearts", "♦": "Diamonds", "♣": "Clubs" };
const RANK_NAME = { J: "Jack", Q: "Queen", K: "King", A: "Ace" };
const cardName = (c) => `${RANK_NAME[c.l] || c.l} of ${SUIT_NAME[c.s]}`;

/* Same hand ranking the real Tells engine uses, plus a Jacks-or-Better paytable. */
function analyze(cards) {
  const ranks = cards.map((c) => c.r).sort((a, b) => a - b);
  const suits = cards.map((c) => c.s);
  const counts = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const vals = Object.values(counts).sort((a, b) => b - a);
  const flush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let straight = uniq.length === 5 && uniq[4] - uniq[0] === 4;
  const wheel = uniq.length === 5 && uniq[0] === 2 && uniq[4] === 14 && uniq[3] === 5; // A-2-3-4-5
  if (wheel) straight = true;
  if (straight && flush && uniq[0] === 10) return { name: "Royal Flush", mult: 250 };
  if (straight && flush) return { name: "Straight Flush", mult: 50 };
  if (vals[0] === 4) return { name: "Four of a Kind", mult: 25 };
  if (vals[0] === 3 && vals[1] === 2) return { name: "Full House", mult: 9 };
  if (flush) return { name: "Flush", mult: 6 };
  if (straight) return { name: "Straight", mult: 4 };
  if (vals[0] === 3) return { name: "Three of a Kind", mult: 3 };
  if (vals[0] === 2 && vals[1] === 2) return { name: "Two Pair", mult: 2 };
  if (vals[0] === 2) {
    const pairRank = +Object.keys(counts).find((r) => counts[r] === 2);
    return pairRank >= 11 ? { name: "Jacks or Better", mult: 1 } : { name: "Pair", mult: 0 };
  }
  return { name: "High Card", mult: 0 };
}
function initPlay() {
  const deck = $("#deck"), btn = $("#deal-btn"), result = $("#play-result");
  const chipsEl = $("#play-chips"), hint = $("#play-hint");
  if (!deck || !btn || !result) return;

  const FULL = [];
  SUITS.forEach((su) => RANKS.forEach((rk) => FULL.push({ ...rk, ...su })));
  const BET = 5;
  const flipWait = prefersReduced ? 0 : 70 * 5 + 420;

  let chips = 100, hand = [], rest = [], phase = "idle", busy = false, freeHand = true;
  let onClick = deal;

  const setChips = (v) => { chips = Math.max(0, v); if (chipsEl) chipsEl.textContent = chips; };
  const setHint = (t) => { if (hint) hint.textContent = t; };
  const setBtn = (label) => { btn.innerHTML = `${label} <span class="arrow" aria-hidden="true">→</span>`; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function render() {
    deck.innerHTML = "";
    hand.forEach((h, i) => {
      const slot = document.createElement("div");
      slot.className = "pslot" + (h.held ? " held" : "");
      const card = document.createElement("div");
      card.className = "pcard" + (h.card.red ? " red" : "");
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.setAttribute("aria-pressed", String(h.held));
      card.setAttribute("aria-label", cardName(h.card) + (phase === "hold" ? " — press to hold" : ""));
      card.innerHTML = `<span class="pcard__side pcard__back"></span><span class="pcard__side pcard__face"><span class="rank">${h.card.l}</span><span class="suit">${h.card.s}</span></span>`;
      const tab = document.createElement("span");
      tab.className = "pslot__hold"; tab.textContent = "Hold"; tab.setAttribute("aria-hidden", "true");
      slot.append(tab, card);
      deck.appendChild(slot);
      if (h.fresh) setTimeout(() => card.classList.add("in"), prefersReduced ? 0 : 70 * i + 40);
      else card.classList.add("in");
      const toggle = () => {
        if (phase !== "hold" || busy) return;
        h.held = !h.held;
        slot.classList.toggle("held", h.held);
        card.setAttribute("aria-pressed", String(h.held));
      };
      card.addEventListener("click", toggle);
      card.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
    });
  }

  function deal() {
    if (busy) return;
    if (freeHand) freeHand = false;
    else { if (chips < BET) setChips(100); setChips(chips - BET); }
    busy = true; btn.disabled = true;
    const d = shuffle(FULL.slice());
    hand = d.slice(0, 5).map((card) => ({ card, held: false, fresh: true }));
    rest = d.slice(5);
    phase = "hold";
    render();
    result.innerHTML = "";
    setHint("Tap the cards you want to keep, then draw.");
    setTimeout(() => {
      const a = analyze(hand.map((h) => h.card));
      result.innerHTML = `<span class="muted">Holding · ${a.name}</span>`;
      setBtn("Draw"); onClick = draw;
      btn.disabled = false; busy = false;
    }, flipWait);
  }

  function draw() {
    if (busy) return;
    busy = true; btn.disabled = true;
    hand.forEach((h) => { if (!h.held) { h.card = rest.pop(); h.fresh = true; } else h.fresh = false; });
    phase = "show";
    render();
    setHint("");
    setTimeout(() => {
      const a = analyze(hand.map((h) => h.card));
      const pay = a.mult * BET;
      if (pay > 0) setChips(chips + pay);
      result.innerHTML = pay > 0
        ? `${a.name} <span class="play__win">+${pay}</span>`
        : `${a.name} <span class="muted">— no pay</span>`;
      setBtn(chips < BET ? "Reset chips" : "Deal again"); onClick = deal;
      btn.disabled = false; busy = false;
    }, flipWait);
  }

  btn.addEventListener("click", () => onClick());
  deal();
}

/* ---------- Interactive monogram orb (About): float + cursor tilt + click pop ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function initOrb() {
  const face = $("[data-orb]");
  if (!face) return;
  const mono = face.querySelector(".about__monogram");
  if (!prefersReduced) {
    const zone = face.closest("section") || face;
    const MAX = 9; // degrees of tilt at the edges
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
    zone.addEventListener("pointerleave", () => {
      face.style.setProperty("--rx", "0deg");
      face.style.setProperty("--ry", "0deg");
    });
  }
  if (mono) {
    face.addEventListener("click", () => {
      if (prefersReduced) return;
      mono.classList.remove("is-pop");
      void mono.offsetWidth; // restart the keyframe
      mono.classList.add("is-pop");
    });
    mono.addEventListener("animationend", () => mono.classList.remove("is-pop"));
  }
}

/* ---------- Seals (The Craft): drag to move, click to reverse the spin ---------- */
function initSeals() {
  $$(".craft__disc").forEach((disc) => {
    const seal = disc.querySelector(".seal");
    const ring = disc.querySelector(".seal__ring");
    if (!seal || !ring) return;
    let dx = 0, dy = 0, ox = 0, oy = 0, sx = 0, sy = 0, moved = 0, dragging = false, pid = null, reversed = false;

    disc.addEventListener("pointerdown", (e) => {
      dragging = true; moved = 0; pid = e.pointerId;
      sx = e.clientX; sy = e.clientY; ox = dx; oy = dy;
      disc.classList.add("is-grabbing");
      try { disc.setPointerCapture(pid); } catch (_) {}
    });
    disc.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const mvx = e.clientX - sx, mvy = e.clientY - sy;
      moved = Math.max(moved, Math.abs(mvx) + Math.abs(mvy));
      dx = clamp(ox + mvx, -150, 150);
      dy = clamp(oy + mvy, -110, 110);
      disc.style.setProperty("--dx", dx + "px");
      disc.style.setProperty("--dy", dy + "px");
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      disc.classList.remove("is-grabbing");
      if (pid != null) { try { disc.releasePointerCapture(pid); } catch (_) {} pid = null; }
      if (moved < 6) { // a click, not a drag -> flip spin direction + quick burst
        reversed = !reversed;
        ring.style.animationDirection = reversed ? "reverse" : "normal";
        seal.classList.add("is-spun");
        clearTimeout(seal._spin);
        seal._spin = setTimeout(() => seal.classList.remove("is-spun"), 1200);
      }
    };
    disc.addEventListener("pointerup", end);
    disc.addEventListener("pointercancel", end);
  });
}

function init() {
  initTheme();
  initNav();
  initReveals();
  initYear();
  initFit();
  initPlay();
  initOrb();
  initSeals();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
