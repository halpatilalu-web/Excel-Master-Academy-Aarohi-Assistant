# MINI PLAY ARCADE 🎮

> **PLAY. COMPETE. REPEAT.**
> A fast, mobile-first, zero-download HTML5 browser gaming platform featuring **10 complete original games**, guest LocalStorage progression, rotating daily challenges, transparent local/demo leaderboards, full SEO metadata, legal/privacy pages, and safe Google AdSense preparation.

---

## Included Playable Games (All 10 Complete)

| # | Game Title | Category | Highlights |
|---|------------|----------|------------|
| 1 | **Stack Master** | Arcade | 2.5D sliding neon slabs, overhang slicing physics, Perfect Drop shockwaves, combo streak slab expansion |
| 2 | **Color Switch Rush** | Arcade | Bouncing neon orb, rotating 4-color rings & sliding gates, star pickups, chromatic switcher orbs |
| 3 | **Fruit Merge** | Puzzle | 10 original fruit tiers, multi-substep 2D circle physics, fruit fusion, chain multipliers, danger-line guard |
| 4 | **Tap Speed Challenge** | Reaction | 5-round reflex benchmark, randomized start signals, false-start guard, `performance.now()` millisecond tracking |
| 5 | **Flip Master** | Sports | Charge-leap arc preview, mid-air tuck & flips, upright landing lock, sky rings, bullseye & moving platforms |
| 6 | **Don't Fall** | Casual | Endless sky-bridge runner, spikes & abyss gaps, double-jump, persistent coin wallet, 6 cosmetic runner skins |
| 7 | **Brain Trap** | Brain Games | **30 original interactive lateral-thinking puzzles** (Easy, Medium, Hard), draggable objects, clickable prompt words, hints |
| 8 | **Bubble Pop Frenzy** | Casual | 60s cluster-popping blitz, up to 10x speed combos, Bomb, Laser, Prism, and +5s Chrono special bubbles |
| 9 | **Guess The Emoji** | Puzzle | **100 original emoji clues** across 6 categories, countdown timer, 5x streak multipliers, 50/50 lifeline |
| 10 | **Mini Golf Crazy** | Sports | **20 handcrafted playable courses**, drag-to-aim trajectory & power meter, bumpers, sand, water, moving gates, par scoring |

---

## Project Structure

```text
mini-play-arcade/
├── index.html                  # Homepage (Hero, Featured, Trending, Daily Challenge, Searchable Library)
├── games/
│   ├── *.html                  # 10 Dedicated Individual Game Pages
│   └── engines/*.js            # 10 Self-Contained Vanilla JS / HTML5 Canvas Game Engines
├── pages/
│   ├── all-games.html          # Searchable & filterable catalog
│   ├── categories.html         # 6-genre category browser
│   ├── daily-challenge.html    # 24h date-rotated challenge hub + badge tracker
│   ├── leaderboard.html        # Daily / Weekly / All-Time local + demo rankings (Firebase/Supabase ready)
│   ├── favorites.html          # Favorites, Recently Played, Personal Bests & 12 Achievements
│   ├── about.html              # About Us
│   ├── contact.html            # Contact Us
│   ├── privacy-policy.html     # Privacy Policy + AdSense cookie disclosures
│   ├── terms.html              # Terms and Conditions
│   ├── disclaimer.html         # Disclaimer
│   └── cookie-policy.html      # Cookie Policy + live consent manager
├── css/
│   ├── style.css               # Neon dark glassmorphism design system
│   └── game-page.css           # Responsive arcade cabinet & mobile scroll-locked stage styles
├── js/
│   ├── games-data.js           # Master game catalog, SEO descriptions & achievements
│   ├── storage.js              # LocalStorage guest profile, scores, favorites, history & consent
│   ├── sound.js                # Zero-download Web Audio API arcade sound synthesizer
│   ├── daily-challenge.js      # Deterministic daily challenge rotation engine
│   ├── leaderboard.js          # Local + demo leaderboard & cloud adapter interface
│   ├── ads.js                  # Safe Google AdSense loader (disabled by default)
│   ├── ui.js                   # Shared header, drawer, profile modal, toasts, consent banner, footer
│   ├── home.js                 # Homepage & searchable library controller
│   └── game-shell.js           # Universal game HUD, pause/resume/restart, share score & related games
├── config/
│   └── adsense-config.js       # Separate AdSense publisher & slot ID configuration
├── images/                     # Custom SVG brand logo, favicon, OG banner, hero & 10 game thumbnails
├── public/                     # Web manifest & root mirror files
├── tests/
│   └── verify-site.mjs         # Automated end-to-end verification suite
├── robots.txt                  # Crawler rules + sitemap pointer
├── sitemap.xml                 # Full XML sitemap (22 pages)
├── ads.txt                     # Ready for official Google AdSense publisher record
├── vercel.json                 # Vercel static deployment config
├── render.yaml                 # Render Static Site Blueprint config
└── ADSENSE_SETUP.md            # Complete 9-step AdSense setup & review guide
```

---

## 1. How to Run the Website Locally

No build step, bundler, or paid backend is required—**MINI PLAY ARCADE** is pure static HTML5, CSS3, and Vanilla JavaScript.

### Option A: Using Python 3 (built into macOS / Linux / Windows Python)
```bash
cd mini-play-arcade
python3 -m http.server 4173 --bind 0.0.0.0
```
Then open **http://localhost:4173** in your browser.

### Option B: Using Node.js / npm
```bash
cd mini-play-arcade
npm start
# Run the automated verification suite anytime:
npm test
```

### Option C: VS Code Live Server
Open the `mini-play-arcade` folder in VS Code and click **Go Live** with the Live Server extension.

---

## 2. How to Upload the Project to GitHub

To publish `mini-play-arcade` as its own standalone GitHub repository:

```bash
cd mini-play-arcade
git init
git branch -M main
git add .
git commit -m "Initial launch of MINI PLAY ARCADE"
git remote add origin https://github.com/<your-username>/mini-play-arcade.git
git push -u origin main
```

*(Or, if keeping `mini-play-arcade/` inside a multi-project repository, set the **Root Directory** to `mini-play-arcade` in Vercel or Render—both approaches work out of the box!)*

---

## 3. How to Deploy on Vercel

1. Sign in at [https://vercel.com](https://vercel.com) and click **Add New… → Project**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset:** `Other` (Static Site)
   - **Root Directory:** `mini-play-arcade` *(or `.` if `mini-play-arcade` is the root of your repo)*
   - **Build Command:** *(leave empty)*
   - **Output Directory:** `.`
4. Click **Deploy**. Vercel will deploy your site globally on HTTPS in seconds using the included `vercel.json` caching headers.

---

## 4. How to Deploy on Render (Static Sites)

1. Sign in at [https://dashboard.render.com](https://dashboard.render.com) and click **New + → Static Site**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name:** `mini-play-arcade`
   - **Root Directory:** `mini-play-arcade` *(or leave blank if `mini-play-arcade` is repo root)*
   - **Build Command:** *(leave blank)*
   - **Publish Directory:** `.`
4. Click **Create Static Site**. Render serves all HTML, CSS, JS, SVG, `robots.txt`, `sitemap.xml`, and `ads.txt` over global CDN HTTPS at zero cost.

---

## 5. How to Connect a Custom Domain

### On Vercel:
1. Open your Vercel project → **Settings → Domains**.
2. Enter your custom domain (e.g., `miniplayarcade.com`) and click **Add**.
3. At your domain registrar (Cloudflare, Namecheap, GoDaddy, Google/Squarespace), add the `A` record (`76.76.21.21`) and `CNAME` (`cname.vercel-dns.com`) shown by Vercel.

### On Render:
1. Open your Render Static Site → **Settings → Custom Domains → + Add Custom Domain**.
2. Follow Render's DNS instructions (`CNAME` pointing `www` to `<your-site>.onrender.com` and `A`/`ANAME` record for the apex domain).

### Update Canonical Domain After Connecting DNS:
Find and replace `https://miniplayarcade.example.com` with `https://yourdomain.com` in:
- `js/games-data.js` (`CANONICAL_BASE`)
- `index.html`, `games/*.html`, `pages/*.html`
- `sitemap.xml` and `robots.txt`

---

## 6. How to Update Website Content & Add New Games

- **Edit Game Metadata / Descriptions / Daily Targets:** Open `js/games-data.js` and edit any object in the `GAMES` array.
- **Add a 11th+ Game:**
  1. Create a thumbnail SVG/PNG in `images/games/<slug>.svg`.
  2. Add a game engine in `games/engines/<slug>.js` calling `MPA_GAME_SHELL.registerEngine('<slug>', function(api) { ... })`.
  3. Duplicate any HTML file in `games/` to `games/<slug>.html` and update its `<title>`, meta tags, `data-game-id`, instructions, and engine `<script src="engines/<slug>.js">`.
  4. Append the new game entry to `GAMES` in `js/games-data.js` and add its URL to `sitemap.xml`.
- **Update Legal / Contact Information:** Edit `pages/privacy-policy.html`, `pages/cookie-policy.html`, `pages/terms.html`, `pages/disclaimer.html`, and `pages/contact.html` with your live contact email and business details.
- **Connect Global Cloud Leaderboards (Optional Future Upgrade):** Call `MPA_LEADERBOARD.registerCloudAdapter({ fetchEntries, submitScore })` using Firebase Firestore or Supabase without rewriting the leaderboard UI.

---

## 7. How to Configure Google AdSense After Approval

Advertisements are **disabled by default** (`ADS_ENABLED: false` in `config/adsense-config.js`) so the site never loads unapproved scripts or fake ads.

Once your domain is approved in Google AdSense:
1. Paste your official Google seller line into `/ads.txt`.
2. Open `config/adsense-config.js`, set `ADS_CLIENT_ID` to your `ca-pub-XXXXXXXXXXXXXXXX` ID, paste your responsive ad unit slot IDs into `SLOTS`, and switch `ADS_ENABLED: true`.
3. Follow the complete step-by-step walkthrough in **[ADSENSE_SETUP.md](./ADSENSE_SETUP.md)**.
