# Deploy — samjo.me

Static site, **no build step**. Domain `samjo.me` is registered at Namecheap (BasicDNS).
Pick one host below. All are free.

## Push to GitHub first (needed for A & C, easiest for B)

```bash
cd ~/Desktop/samjo_portfolio
gh repo create samjo-portfolio --public --source=. --remote=origin --push
```

`gh` is currently authenticated as **squireaintready**. To use a different account (e.g. your
student / other GitHub), run `gh auth login` first, or add the remote by hand:

```bash
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

---

## Option A — Cloudflare Pages  (recommended — same host as Crowdtells, best performance)

1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
2. Build settings: **Framework preset = None**, **Build command = (blank)**, **Output dir = `/`**. Deploy.
3. Project → **Custom domains** → add `samjo.me` and `www.samjo.me`.
4. Point DNS by moving the domain to Cloudflare (cleanest):
   - Cloudflare → **Add site** `samjo.me` → it shows **2 nameservers**.
   - Namecheap → Domain List → samjo.me → **Nameservers → Custom DNS** → paste those 2. Save.
   - Cloudflare auto-creates the Pages records. (Propagation: ~30 min–24 h.)

## Option B — GitHub Pages  (fastest with current Namecheap DNS — no nameserver change)

1. Push the repo (above).
2. Repo → **Settings → Pages** → Source = **Deploy from a branch** → Branch = `main` / `/ (root)` → Save.
   (The `CNAME` file already pins the domain to `samjo.me`.)
3. Namecheap → samjo.me → **Advanced DNS** → add:
   | Type | Host | Value |
   |------|------|-------|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | `<your-github-username>.github.io.` |
4. Repo → Settings → Pages → **Custom domain** = `samjo.me` → wait for the check → **Enforce HTTPS**.

## Option C — Vercel  (same host as miztips)

1. Push the repo → Vercel → **New Project** → import → Framework = **Other**, no build. Deploy.
2. Vercel → Project → **Settings → Domains** → add `samjo.me`. It shows:
   | Type | Host | Value |
   |------|------|-------|
   | A | @ | 76.76.21.21 |
   | CNAME | www | `cname.vercel-dns.com` |
3. Add those at Namecheap → Advanced DNS.

---

### Before going live — checklist
- [ ] Confirm contact email (currently `sungjohak@gmail.com` across site + résumé).
- [ ] Swap `Samuel-Jo-Resume.pdf` if you tweak the résumé (`resume.html` is the source → print to PDF, or re-run the render).
- [ ] After deploy, validate the share card with the [OpenGraph debugger](https://www.opengraph.xyz/) (`/public/img/og.png`).
