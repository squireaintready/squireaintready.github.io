/* ============================================================================
   main.js — progressive enhancement for the portfolio.
   The site is fully functional with JS disabled; this layer adds:
     • theme picker (5 themes) with persistence
     • sticky nav: scrolled state, active-section links, scroll progress
     • reveal-on-scroll, exact-fit display type (Pretext), inline count-ups
     • live NY clock, generative hero signal (canvas)
     • ⌘K command palette (jump / open / theme / connect)
     • The Craft: prose that genuinely flows around the seal (Pretext flowAround)
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

/* shared live telemetry from the hero physics field → read by the signal readout */
const FIELD = { n: 0, v: 0, e: 0, hits: 0, peak: 0 };
/* shared car box → the physics field collides shapes against it (one unified world) */
const CAR = { x: -1e4, y: -1e4, w: 0, h: 0, vx: 0 };

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
          bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
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

/* ---------- Live hero signal (canvas) ---------- */
function resolveColor(expr) {
  const p = document.createElement("span");
  p.style.cssText = "position:absolute;visibility:hidden;color:" + expr;
  document.body.appendChild(p);
  const c = getComputedStyle(p).color; p.remove();
  return c;
}
const parseRGB = (s) => (s.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

function initHeroSignal() {
  const canvas = $("[data-signal]");
  if (!canvas) return;
  const wrap = canvas.parentElement, ctx = canvas.getContext("2d");
  const readout = $("[data-signal-readout]");
  const sigE = $("[data-sig-e]"), sigC = $("[data-sig-c]"), sigN = $("[data-sig-n]");
  if (!ctx) return;
  let W = 0, H = 0, dpr = 1;
  const N = 100, data = new Array(N).fill(0.06), cData = new Array(N).fill(0);
  let frac = 0, lastHits = 0, COL = readColors();
  const STEP = 6; // frames between new samples — higher = calmer scroll

  function readColors() {
    return {
      stroke: parseRGB(resolveColor("var(--accent)")),     // kinetic-energy line
      impact: parseRGB(resolveColor("var(--up)")),          // collision impulse spikes
      grid: resolveColor("var(--grid-line)"),
    };
  }
  function resize() {
    const r = wrap.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function path(n, xAt, yAt) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = xAt(i), y = yAt(data[i]);
      if (i === 0) { ctx.moveTo(x, y); continue; }
      const px = xAt(i - 1), py = yAt(data[i - 1]), mx = (px + x) / 2, my = (py + y) / 2;
      ctx.quadraticCurveTo(px, py, mx, my);
    }
  }
  function draw(fr = 0) {
    ctx.clearRect(0, 0, W, H);
    const padTop = 38, padBot = 14, gh = H - padTop - padBot, n = data.length;
    const stepW = W / (n - 1), baseY = padTop + gh;
    const xAt = (i) => i * stepW - fr * stepW, yAt = (val) => padTop + (1 - val) * gh;
    // grid
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= 3; i++) { const y = Math.round(padTop + (gh * i) / 3) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // collisions → impulse spikes rising from the baseline (recent ones brighter)
    ctx.lineWidth = 2; ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const c = cData[i]; if (c <= 0.001) continue;
      const x = xAt(i); if (x < -3 || x > W + 3) continue;
      ctx.strokeStyle = rgba(COL.impact, 0.16 + 0.44 * (i / n));
      ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - c * gh * 0.92); ctx.stroke();
    }
    // kinetic energy → area + line
    path(n, xAt, yAt); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, padTop, 0, H);
    g.addColorStop(0, rgba(COL.stroke, 0.15)); g.addColorStop(1, rgba(COL.stroke, 0));
    ctx.fillStyle = g; ctx.fill();
    path(n, xAt, yAt); ctx.strokeStyle = rgba(COL.stroke, 0.92); ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.stroke();
    // leading dot on the energy line
    const lx = xAt(n - 1), ly = yAt(data[n - 1]);
    ctx.beginPath(); ctx.arc(lx, ly, 9, 0, 6.2832); ctx.fillStyle = rgba(COL.stroke, 0.14); ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 3.2, 0, 6.2832); ctx.fillStyle = rgba(COL.stroke, 1); ctx.fill();
  }
  function advance() {
    // two correlated series read straight from the physics field:
    //   data[]  = kinetic energy (the line)   ·   cData[] = collisions since last sample (the spikes)
    const e = FIELD.n ? clamp(0.06 + Math.sqrt(FIELD.e) / 13, 0.05, 0.98) : 0.06;
    const rate = Math.max(0, FIELD.hits - lastHits); lastHits = FIELD.hits;
    data.push(e); data.shift();
    cData.push(clamp(rate / 6, 0, 1)); cData.shift();
    if (readout) readout.textContent = (e * 100).toFixed(1);
    if (sigC) sigC.textContent = FIELD.hits.toLocaleString("en-US");
    if (sigN) sigN.textContent = FIELD.n;
  }

  resize();
  document.addEventListener("themechanged", () => { COL = readColors(); draw(); });
  addEventListener("resize", debounce(() => { resize(); draw(); }, 150));

  if (prefersReduced) {
    for (let i = 0; i < N; i++) data[i] = clamp(0.5 + 0.26 * Math.sin(i / 9) + 0.08 * Math.sin(i / 3.3), 0.05, 0.95);
    draw();
    setTimeout(() => { if (readout) readout.textContent = (clamp(0.06 + Math.sqrt(FIELD.e) / 13, 0.05, 0.98) * 100).toFixed(1); if (sigE) sigE.textContent = Math.round(FIELD.e); if (sigC) sigC.textContent = FIELD.hits.toLocaleString("en-US"); if (sigN) sigN.textContent = FIELD.n; }, 120);
    return;
  }
  let raf = 0, visible = true;
  const loop = () => { frac += 1 / STEP; if (frac >= 1) { frac -= 1; advance(); } draw(frac); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0 }).observe(wrap);
  } else start();
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });
}

/* ---------- Hero physics field (hand-rolled 2D engine: gravity, collisions, cursor-repel, grab-to-fling) ---------- */
function initPhysics() {
  const canvas = $("[data-physics]");
  if (!canvas) return;
  const wrap = canvas.parentElement, ctx = canvas.getContext("2d");
  if (!ctx) return;
  let W = 0, H = 0, dpr = 1, bodies = [], COL = readPhysColors();

  function readPhysColors() {
    const p = (e) => parseRGB(resolveColor(e));
    return { palette: [p("var(--accent)"), p("var(--proj-crowdtells)"), p("var(--proj-regwatch)"), p("var(--proj-miztips)"), p("var(--proj-tells)")] };
  }
  function makeBodies() {
    const n = W < 640 ? 6 : 14;
    bodies = [];
    for (let i = 0; i < n; i++) {
      const r = 9 + Math.random() * (W < 640 ? 15 : 25);
      const kind = i % 5 === 0 ? "diamond" : i % 2 === 0 ? "ring" : "disc";
      bodies.push({ x: r + Math.random() * (W - 2 * r), y: r + Math.random() * (H - 2 * r), vx: (Math.random() - 0.5) * 1.1, vy: (Math.random() - 0.5) * 1.1, r, kind, color: COL.palette[i % COL.palette.length], rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.03 });
    }
  }

  /* glyph collision: rasterize the name to an offscreen mask, then collide shapes
     against the real letterforms (a handful of pixel lookups per shape per frame). */
  const nameEl = document.querySelector(".hero__name");
  const maskC = document.createElement("canvas");
  const mctx = maskC.getContext("2d", { willReadFrequently: true });
  let mask = null, nameBottom = -1, lastMaskW = -1;
  function buildMask() {
    if (!nameEl || !mctx || !W || !H) { mask = null; return; }
    if (W === lastMaskW && mask) return; // width unchanged (e.g. mobile URL-bar resize) → keep mask, skip costly rebuild
    lastMaskW = W;
    maskC.width = W; maskC.height = H;
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = "#000"; mctx.textBaseline = "middle"; mctx.textAlign = "left";
    const cr = canvas.getBoundingClientRect();
    let bottom = 0;
    nameEl.querySelectorAll(".hero__name-l").forEach((ln) => {
      const r = ln.getBoundingClientRect(), cs = getComputedStyle(ln);
      const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      mctx.font = `${cs.fontWeight} ${parseFloat(cs.fontSize)}px '${fam}'`;
      mctx.fillText(ln.textContent.trim(), r.left - cr.left, r.top - cr.top + r.height / 2);
      bottom = Math.max(bottom, r.bottom - cr.top);
    });
    const rule = nameEl.querySelector(".hero__name-rule");
    if (rule) { const r = rule.getBoundingClientRect(); mctx.fillRect(r.left - cr.left, r.top - cr.top, r.width, Math.max(2, r.height)); }
    try {
      const d = mctx.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
      for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 24 ? 1 : 0;
      mask = m; nameBottom = bottom + 6;
    } catch (e) { mask = null; }
  }
  const solidAt = (x, y) => (!mask || x < 0 || y < 0 || x >= W || y >= H) ? 0 : mask[(y | 0) * W + (x | 0)];
  function maskCollide(b) {
    if (!mask || b.y - b.r > nameBottom) return;
    let nx = 0, ny = 0, hits = 0;
    for (let k = 0; k < 8; k++) { const a = k * 0.7854, sx = b.x + Math.cos(a) * b.r, sy = b.y + Math.sin(a) * b.r; if (solidAt(sx, sy)) { nx += b.x - sx; ny += b.y - sy; hits++; } }
    if (!hits) { if (solidAt(b.x, b.y)) { ny = -1; hits = 1; } else return; }
    const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
    b.x += nx * 2.2; b.y += ny * 2.2;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { FIELD.hits++; b.vx -= (1 + REST) * vn * nx; b.vy -= (1 + REST) * vn * ny; }
  }
  // unified world: shapes also collide with the drivable car (an AABB it shares via CAR)
  function carCollide(b) {
    if (CAR.w <= 0) return;
    const cx = clamp(b.x, CAR.x, CAR.x + CAR.w), cy = clamp(b.y, CAR.y, CAR.y + CAR.h);
    const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= b.r * b.r) return;
    const d = Math.sqrt(d2), nx = d > 0.01 ? dx / d : 0, ny = d > 0.01 ? dy / d : -1;
    b.x = cx + nx * b.r; b.y = cy + ny * b.r;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= (1 + REST) * vn * nx; b.vy -= (1 + REST) * vn * ny; }
    b.vx += CAR.vx * 0.7; // the car shoves shapes along its travel
    FIELD.hits++;
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    W = rect.width; H = rect.height;
    dpr = Math.min(W < 640 ? 1.5 : 2, window.devicePixelRatio || 1); // cap lower on phones for perf
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!bodies.length) makeBodies();
    else for (const b of bodies) { b.r = Math.min(b.r, Math.min(W, H) / 2 - 1); b.x = clamp(b.x, b.r, W - b.r); b.y = clamp(b.y, b.r, H - b.r); }
    buildMask();
  }

  let px = -1e4, py = -1e4, drag = null, gx = 0, gy = 0, lpx = 0, lpy = 0;
  const REST = 0.86, AIR = 0.997, MAXV = 13; // floating field — no gravity, gentle damping, bouncy walls

  function physics() {
    for (const b of bodies) {
      if (b === drag) continue;
      const dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy, R = 130;
      if (d2 < R * R && d2 > 0.5) { const d = Math.sqrt(d2), f = (1 - d / R) * 1.5; b.vx += (dx / d) * f; b.vy += (dy / d) * f; }
      b.vx *= AIR; b.vy *= AIR;
      const sp = Math.hypot(b.vx, b.vy); if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
      b.x += b.vx; b.y += b.vy; b.rot += b.vr;
      if (b.x < b.r) { b.x = b.r; b.vx = -b.vx * REST; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -b.vx * REST; }
      if (b.y < b.r) { b.y = b.r; b.vy = -b.vy * REST; }
      if (b.y > H - b.r) { b.y = H - b.r; b.vy = -b.vy * REST; }
      maskCollide(b); // bounce off the actual name letterforms
      carCollide(b);  // bounce off / get shoved by the car
    }
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rs = a.r + b.r;
      if (d2 < rs * rs && d2 > 0.5) {
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (rs - d) / 2;
        if (a !== drag) { a.x -= nx * ov; a.y -= ny * ov; } if (b !== drag) { b.x += nx * ov; b.y += ny * ov; }
        const relv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relv < 0) { FIELD.hits++; const imp = relv * REST; if (a !== drag) { a.vx += nx * imp; a.vy += ny * imp; } if (b !== drag) { b.vx -= nx * imp; b.vy -= ny * imp; } }
      }
    }
    if (drag) { drag.vx = px - lpx; drag.vy = py - lpy; drag.x = px - gx; drag.y = py - gy; lpx = px; lpy = py; }
    // live telemetry for the signal readout
    let sv = 0, en = 0;
    for (const b of bodies) { const s = Math.hypot(b.vx, b.vy); sv += s; en += s * s; }
    FIELD.n = bodies.length; FIELD.v = bodies.length ? sv / bodies.length : 0; FIELD.e = en; if (en > FIELD.peak) FIELD.peak = en;
    // keep the field subtly alive when it would otherwise fall asleep
    if (FIELD.v < 0.32 && Math.random() < 0.045) { const b = bodies[(Math.random() * bodies.length) | 0]; if (b && b !== drag) { b.vx += (Math.random() - 0.5) * 1.9; b.vy += (Math.random() - 0.5) * 1.9; } }
  }
  function drawBody(b) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
    if (b.kind === "disc") { ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 6.2832); ctx.fillStyle = rgba(b.color, 0.15); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(b.color, 0.5); ctx.stroke(); }
    else if (b.kind === "ring") { ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 6.2832); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(b.color, 0.6); ctx.stroke(); }
    else { const s = b.r * 0.9; ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(b.color, 0.55); ctx.strokeRect(-s, -s, 2 * s, 2 * s); }
    ctx.restore();
  }
  function draw() { ctx.clearRect(0, 0, W, H); for (const b of bodies) drawBody(b); }

  const at = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  wrap.addEventListener("pointermove", (e) => { [px, py] = at(e); }, { passive: true });
  wrap.addEventListener("pointerleave", () => { px = py = -1e4; });
  wrap.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return; // never hijack touch scroll; shapes still float ambiently
    if (e.target.closest && e.target.closest("a, button, input")) return;
    const [x, y] = at(e); let hit = null;
    for (let i = bodies.length - 1; i >= 0; i--) { const b = bodies[i]; if ((b.x - x) ** 2 + (b.y - y) ** 2 < b.r * b.r) { hit = b; break; } }
    if (!hit) return;
    e.preventDefault(); // we grabbed a shape — suppress text selection
    drag = hit; gx = x - hit.x; gy = y - hit.y; px = lpx = x; py = lpy = y;
  });
  const release = () => { drag = null; };
  addEventListener("pointerup", release); addEventListener("pointercancel", release);

  resize();
  document.addEventListener("themechanged", () => { COL = readPhysColors(); bodies.forEach((b, i) => (b.color = COL.palette[i % COL.palette.length])); });
  addEventListener("resize", debounce(resize, 200));
  // build the glyph mask once the Pretext fit has sized the name
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(buildMask, 90));
  setTimeout(buildMask, 680);

  if (prefersReduced) { for (let i = 0; i < 260; i++) physics(); draw(); return; }
  let raf = 0, visible = true;
  const loop = () => { physics(); draw(); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0 }).observe(wrap);
  else start();
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });
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

  // drag a seal → reflow the prose around it (throttled); click → reverse its spin
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; build(); }); };
  discs.forEach((disc, i) => {
    const s = seals[i], seal = disc.querySelector(".seal"), ring = disc.querySelector(".seal__ring");
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = 0, pid = null, rev = false;
    disc.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; pid = e.pointerId; sx = e.clientX; sy = e.clientY; ox = s.dx; oy = s.dy; disc.classList.add("is-grabbing"); try { disc.setPointerCapture(pid); } catch (_) {} });
    disc.addEventListener("pointermove", (e) => { if (!dragging) return; const mvx = e.clientX - sx, mvy = e.clientY - sy; moved = Math.max(moved, Math.abs(mvx) + Math.abs(mvy)); s.dx = ox + mvx; s.dy = oy + mvy; schedule(); });
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
      const isTheme = c.group === "Theme" && c.iconHTML ? "" : "";
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

/* ---------- Play: poker mini-game (nods to Tells) ---------- */
const SUITS = [{ s: "♠", red: false }, { s: "♥", red: true }, { s: "♦", red: true }, { s: "♣", red: false }];
const RANKS = [
  { r: 2, l: "2" }, { r: 3, l: "3" }, { r: 4, l: "4" }, { r: 5, l: "5" }, { r: 6, l: "6" },
  { r: 7, l: "7" }, { r: 8, l: "8" }, { r: 9, l: "9" }, { r: 10, l: "10" },
  { r: 11, l: "J" }, { r: 12, l: "Q" }, { r: 13, l: "K" }, { r: 14, l: "A" },
];
const SUIT_NAME = { "♠": "Spades", "♥": "Hearts", "♦": "Diamonds", "♣": "Clubs" };
const RANK_NAME = { J: "Jack", Q: "Queen", K: "King", A: "Ace" };
const cardName = (c) => `${RANK_NAME[c.l] || c.l} of ${SUIT_NAME[c.s]}`;

function analyze(cards) {
  const ranks = cards.map((c) => c.r).sort((a, b) => a - b);
  const suits = cards.map((c) => c.s);
  const counts = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const vals = Object.values(counts).sort((a, b) => b - a);
  const flush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let straight = uniq.length === 5 && uniq[4] - uniq[0] === 4;
  const wheel = uniq.length === 5 && uniq[0] === 2 && uniq[4] === 14 && uniq[3] === 5;
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

/* ---------- Seal (The Craft): drag to move, click to reverse the spin ---------- */
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
      dx = clamp(ox + mvx, -150, 150); dy = clamp(oy + mvy, -110, 110);
      disc.style.setProperty("--dx", dx + "px"); disc.style.setProperty("--dy", dy + "px");
    });
    const end = () => {
      if (!dragging) return;
      dragging = false; disc.classList.remove("is-grabbing");
      if (pid != null) { try { disc.releasePointerCapture(pid); } catch (_) {} pid = null; }
      if (moved < 6) {
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

/* ---------- Drive-able car: gravity + text-block platforms, hop, fall-off-map + reset ----------
   Drive ←/→ (or A/D) along whatever it's standing on; ↑/W to hop; drag it anywhere.
   It rests on the name rule, the name lines, the statement and the lead (one-way platforms),
   drives off their edges and falls. Off the bottom = off the map -> auto-recovers, or hit reset. */
function initCar() {
  const car = $("[data-car]"), hero = $(".hero");
  if (!car || !hero) return;
  const wheels = $$("[data-wheel]", car);
  const hint = $("[data-car-hint]", car);
  const resetBtn = $("[data-car-reset]");
  const coarse = matchMedia("(hover: none)").matches;

  let x = 0, y = 0, vx = 0, vy = 0, rot = 0, bodyRot = 0, deform = 0, lastDir = 1, cw = 56, ch = 24, fo = 22, heroW = 0, heroH = 0;
  let grounded = false, wasGrounded = true, off = false, driven = false, raf = 0, heroVis = true;
  let dragging = false, lastX = 0, lastY = 0, dvx = 0, dvy = 0, moved = 0, offTimer = 0;
  let platforms = [], home = { x: 0, y: 0 };
  const L = {}, R = {};
  const ACC = 0.5, FR = 0.82, AIRFR = 0.99, MAXVX = 8, G = 0.6, JUMP = 11.5, MAXVY = 18, FOOT = 0.9, TOL = 9;

  function measure() {
    const hr = hero.getBoundingClientRect();
    heroW = hr.width; heroH = hr.height;
    cw = car.offsetWidth || 56; ch = car.offsetHeight || 24; fo = ch * FOOT;
    CAR.w = cw; CAR.h = ch;
    const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - hr.left, y: r.top - hr.top, w: r.width }; };
    platforms = [];
    // text-block platforms (one-way, land on top): name lines, statement, lead
    [$(".hero__name-l:not(.hero__name-l2)"), $(".hero__name-l2 > span:first-child"), $(".hero__statement"), $(".hero__lead")]
      .forEach((el) => { if (el) { const p = rectOf(el); if (p.w > 16) platforms.push(p); } });
    const rule = $(".hero__name-rule");
    if (rule) { const r = rectOf(rule); platforms.push(r); home = { x: r.x + 6, y: r.y - fo }; }
    else home = { x: heroW * 0.4, y: heroH * 0.45 };
    platforms.sort((a, b) => a.y - b.y);
    if (!driven && !dragging && !off) { x = home.x; y = home.y; place(); }
  }
  function place() {
    const sx = (1 + deform * 0.45).toFixed(3), sy = (1 - deform * 0.55).toFixed(3); // squash (land) / stretch (hop)
    car.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${bodyRot.toFixed(1)}deg) scale(${sx}, ${sy})`;
    const t = `rotate(${rot.toFixed(1)}deg)`;
    for (const wl of wheels) wl.style.transform = t;
    if (!off) { CAR.x = x; CAR.y = y; CAR.vx = dragging ? dvx : vx; } // share with the physics field
  }
  const mark = () => { if (!driven) { driven = true; car.classList.add("is-driven"); } };

  function step() {
    if (dragging) { rot += dvx * 3; bodyRot += (clamp(dvx * 1.4, -24, 24) - bodyRot) * 0.25; place(); raf = requestAnimationFrame(step); return; }
    if (L.on) vx -= ACC;
    if (R.on) vx += ACC;
    vx = clamp(vx, -MAXVX, MAXVX);
    vy = clamp(vy + G, -MAXVY, MAXVY);
    const prevFoot = y + fo;
    x = clamp(x + vx, 0, heroW - cw);                         // stay fully on-screen: never half-clipped off a side
    y += vy;
    vx *= grounded ? FR : AIRFR;
    if (Math.abs(vx) < 0.03) vx = 0;
    // land on the first platform the wheels cross from above
    grounded = false;
    const cx = x + cw / 2, foot = y + fo;
    for (const p of platforms) {
      if (cx < p.x - 2 || cx > p.x + p.w + 2) continue;
      if (vy >= 0 && foot >= p.y && prevFoot <= p.y + TOL) { y = p.y - fo; grounded = true; break; }
    }
    if (grounded && !wasGrounded) deform = Math.min(0.5, vy * 0.045); // squash scaled by how hard it hit
    if (grounded) vy = 0;
    deform *= 0.8; if (Math.abs(deform) < 0.01) deform = 0;
    if (vx > 0.2) lastDir = 1; else if (vx < -0.2) lastDir = -1;
    if (grounded) {
      rot += vx * 6;                            // wheels roll along the surface
      bodyRot += (0 - bodyRot) * 0.28;          // settle level on landing
      if (Math.abs(bodyRot) < 0.25) bodyRot = 0;
    } else {
      rot += vx * 4;
      bodyRot += (clamp(vy * 2.6 * lastDir, -54, 54) - bodyRot) * 0.12; // nose pitches into the fall
    }
    if (grounded !== wasGrounded) { car.classList.toggle("is-air", !grounded); wasGrounded = grounded; }
    place();
    if (y > heroH + 60) { goOff(); return; }                  // dropped off the bottom of the map
    if (!grounded || vx !== 0 || vy !== 0 || deform !== 0 || L.on || R.on) raf = requestAnimationFrame(step); else raf = 0;
  }
  const kick = () => { if (!raf && heroVis && !off) raf = requestAnimationFrame(step); };
  function hop() { if (grounded && !dragging && !off) { vy = -JUMP; grounded = false; deform = -0.3; mark(); kick(); } }
  function goOff() {
    off = true; raf = 0;
    car.classList.add("is-off"); hero.classList.add("car-lost");
    CAR.x = -1e4; CAR.y = -1e4; CAR.vx = 0;                    // drop it from the physics field
    clearTimeout(offTimer); offTimer = setTimeout(reset, 1200); // self-recover (reset button also pulses)
  }
  function reset() {
    clearTimeout(offTimer);
    off = false; dragging = false; L.on = R.on = false;
    car.classList.remove("is-off"); hero.classList.remove("car-lost");
    x = home.x; y = home.y - clamp(heroH * 0.16, 80, 150);     // drop in from above so the return reads
    vx = 0; vy = 0; rot = 0; bodyRot = 0; grounded = false; wasGrounded = false;
    car.classList.add("is-air");                              // glows on the way back down
    place(); kick();
  }
  const typing = (el) => el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable);

  addEventListener("keydown", (e) => {
    if (!heroVis || typing(e.target)) return;
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") { L.on = true; e.preventDefault(); mark(); kick(); }
    else if (k === "ArrowRight" || k === "d" || k === "D") { R.on = true; e.preventDefault(); mark(); kick(); }
    else if (k === "ArrowUp" || k === "w" || k === "W") { e.preventDefault(); hop(); }
  });
  addEventListener("keyup", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") L.on = false;
    if (k === "ArrowRight" || k === "d" || k === "D") R.on = false;
  });
  car.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; dvx = dvy = 0; moved = 0; mark();
    try { car.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault(); kick();
  });
  addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dvx = e.clientX - lastX; dvy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dvx) + Math.abs(dvy);
    x = clamp(x + dvx, 0, heroW - cw); y += dvy; place();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    const wasOnGround = grounded; grounded = false;
    if (moved < 6 && wasOnGround) { vy = -JUMP; deform = -0.3; }   // a tap (not a drag) hops — handy on touch
    else { vx = clamp(dvx, -MAXVX, MAXVX); vy = clamp(dvy, -MAXVY, MAXVY); } // otherwise fling it
    kick();
  };
  addEventListener("pointerup", endDrag); addEventListener("pointercancel", endDrag);
  if (resetBtn) resetBtn.addEventListener("click", () => { reset(); resetBtn.blur(); });
  if (hint) hint.textContent = coarse ? "tap to hop · drag to fling" : "← → drive · ↑ hop";

  measure(); kick();
  addEventListener("resize", debounce(() => { measure(); kick(); }, 180));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(() => { measure(); kick(); }, 80));
  setTimeout(() => { measure(); kick(); }, 640);
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => {
    heroVis = es[0].isIntersecting;
    if (!heroVis && raf) { cancelAnimationFrame(raf); raf = 0; }
    else if (heroVis) kick();
  }, { threshold: 0 }).observe(hero);
}

function init() {
  initTheme();
  initNav();
  initReveals();
  initYear();
  initClock();
  initCounters();
  initFit();
  initHeroSignal();
  initPhysics();
  initCar();
  initCraftFlow();
  initCommandPalette();
  initPlay();
  initOrb();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
