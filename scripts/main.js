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
function evalHand(cards) {
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
  if (straight && flush && uniq[0] === 10) return "Royal Flush";
  if (straight && flush) return "Straight Flush";
  if (vals[0] === 4) return "Four of a Kind";
  if (vals[0] === 3 && vals[1] === 2) return "Full House";
  if (flush) return "Flush";
  if (straight) return "Straight";
  if (vals[0] === 3) return "Three of a Kind";
  if (vals[0] === 2 && vals[1] === 2) return "Two Pair";
  if (vals[0] === 2) return "Pair";
  return "High Card";
}
function initPlay() {
  const deck = $("#deck"), btn = $("#deal-btn"), result = $("#play-result");
  if (!deck || !btn || !result) return;
  const FULL = [];
  SUITS.forEach((su) => RANKS.forEach((rk) => FULL.push({ ...rk, ...su })));
  let busy = false;
  function deal() {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    const d = FULL.slice();
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    const hand = d.slice(0, 5);
    deck.innerHTML = "";
    result.textContent = "";
    hand.forEach((c, i) => {
      const card = document.createElement("div");
      card.className = "pcard" + (c.red ? " red" : "");
      card.innerHTML = `<span class="pcard__side pcard__back"></span><span class="pcard__side pcard__face"><span class="rank">${c.l}</span><span class="suit">${c.s}</span></span>`;
      deck.appendChild(card);
      setTimeout(() => card.classList.add("in"), prefersReduced ? 0 : 90 * i + 50);
    });
    setTimeout(() => {
      result.innerHTML = `${evalHand(hand)} <span class="muted">— ${hand.map((c) => c.l + c.s).join("  ")}</span>`;
      busy = false; btn.disabled = false;
    }, prefersReduced ? 0 : 90 * 5 + 340);
  }
  btn.addEventListener("click", deal);
  deal();
}

function init() {
  initTheme();
  initNav();
  initReveals();
  initYear();
  initFit();
  initPlay();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
