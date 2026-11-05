# Google AdSense Setup & Review Guide — MINI PLAY ARCADE

**MINI PLAY ARCADE** ships with a safe, policy-aware Google AdSense integration architecture (`config/adsense-config.js` + `js/ads.js`) that keeps advertisements **disabled by default** (`ADS_ENABLED: false`) until your production domain is officially approved by Google AdSense.

> **Important Policy Reminders**
> - Never invent or guess a publisher ID (`ca-pub-...`) or slot ID.
> - Never click your own live advertisements or generate artificial impressions.
> - Before submitting for review, update `https://miniplayarcade.example.com` and `support@miniplayarcade.example.com` across `sitemap.xml`, `robots.txt`, and `pages/` to match your real custom domain and contact email.

---

## 1. How to Create a Google AdSense Account

1. Deploy **MINI PLAY ARCADE** to your live custom domain (see `README.md` for Vercel and Render deployment steps).
2. Visit [https://adsense.google.com/start/](https://adsense.google.com/start/) and sign in with the Google Account you want associated with publisher payouts.
3. Enter your live website root URL (for example, `https://yourdomain.com`), select your payment country/territory, review the AdSense Terms & Conditions, and click **Start using AdSense**.
4. Complete your **Payments profile** (legal name, address, and tax details) inside the AdSense dashboard.

---

## 2. How to Add Your Website in AdSense

1. Open your Google AdSense dashboard and navigate to **Sites** in the left sidebar.
2. Click **+ New site**.
3. Enter your bare root domain (e.g., `yourdomain.com` without subpaths) and click **Save**.

---

## 3. How to Verify Website Ownership

Google AdSense offers three verification methods under **Sites → Verify your site**:

- **Method A — `ads.txt` snippet (Recommended for static sites):**
  Copy the exact single-line seller record Google displays (format: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`), paste it into `ads.txt` in the project root, redeploy, and verify `https://yourdomain.com/ads.txt` loads in your browser.
- **Method B — AdSense code snippet:**
  Add your real `ADS_CLIENT_ID` (`ca-pub-XXXXXXXXXXXXXXXX`) in `config/adsense-config.js` or paste Google's verification `<meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX">` tag inside `<head>` on `index.html`.
- **Method C — Meta tag verification:**
  Copy the `<meta name="google-adsense-account" ...>` tag provided by AdSense into `<head>` of `index.html`, deploy, and click **Verify** in AdSense.

---

## 4. Where to Add Your AdSense Publisher ID

Open `config/adsense-config.js`:

```javascript
const ADS_CONFIG = {
  ADS_ENABLED: false, // Keep false until approved!
  ADS_CLIENT_ID: 'ca-pub-XXXXXXXXXXXXXXXX', // <-- Paste your official Publisher ID here
  ...
};
```

Replace `'YOUR_ADSENSE_PUBLISHER_ID'` with your exact `ca-pub-...` Publisher ID from **AdSense → Account → Settings → Account information**.

---

## 5. Where to Add Advertisement Slot IDs

Once your AdSense account is active, create **Display ad units** (Responsive) inside **AdSense → Ads → By ad unit → Display ads**:

1. Create up to 6 responsive display units corresponding to Mini Play Arcade's safe ad containers:
   - `HOME_BELOW_HERO` — Homepage below the hero section (`index.html`)
   - `HOME_BETWEEN_SECTIONS` — Homepage between Featured and Trending games (`index.html`)
   - `LIBRARY_BETWEEN_ROWS` — Game library between game rows (`index.html`, `pages/all-games.html`, `pages/categories.html`)
   - `GAME_BELOW_STAGE` — Individual game pages safely below the arcade cabinet (`games/*.html`)
   - `GAME_BELOW_INSTRUCTIONS` — Individual game pages below the How-to-Play panel (`games/*.html`)
   - `FOOTER_BANNER` — Above footer links across pages
2. Copy the numeric `data-ad-slot` ID for each ad unit and paste it into `config/adsense-config.js`:

```javascript
  SLOTS: {
    HOME_BELOW_HERO: '1234567890',
    HOME_BETWEEN_SECTIONS: '2345678901',
    LIBRARY_BETWEEN_ROWS: '3456789012',
    GAME_BELOW_INSTRUCTIONS: '4567890123',
    GAME_BELOW_STAGE: '5678901234',
    FOOTER_BANNER: '6789012345'
  }
```

*(Any slot left with a `YOUR_...` placeholder stays automatically collapsed so unused slots never leave blank gaps.)*

---

## 6. How to Activate Advertisements

After Google emails you confirming your site status is **Ready** in **AdSense → Sites**:

1. Open `config/adsense-config.js`.
2. Ensure `ADS_PREVIEW_MODE` is `false`.
3. Set `ADS_ENABLED: true`:
   ```javascript
   ADS_ENABLED: true,
   ADS_CLIENT_ID: 'ca-pub-XXXXXXXXXXXXXXXX',
   ADS_PREVIEW_MODE: false,
   ```
4. If you serve visitors in the EEA, UK, or Switzerland, also enable Google's **GDPR Consent Message** inside **AdSense → Privacy & messaging** (Google's certified CMP integrates automatically with the AdSense script).
5. Commit and push to redeploy on Vercel or Render.

---

## 7. How to Upload `ads.txt`

1. Open `/ads.txt` (and `/public/ads.txt` if your host serves `/public` at root).
2. Remove the comment `#` and paste ONLY the exact publisher record provided inside your AdSense dashboard:
   ```text
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
3. Deploy your changes and open `https://yourdomain.com/ads.txt` in an incognito browser tab to confirm it returns HTTP `200 OK` as plain text.

---

## 8. How to Test Ad Placements Safely

- **Layout Spacing Test (Before Approval):**
  Temporarily set `ADS_PREVIEW_MODE: true` (while keeping `ADS_ENABLED: false`) in `config/adsense-config.js` on `localhost` only. This reveals dashed developer layout boxes in all 6 responsive locations so you can verify spacing on mobile and desktop without calling Google servers. **Always set `ADS_PREVIEW_MODE: false` before deploying to production.**
- **Placement Safety Checklist (Built-In):**
  - Zero ad containers exist inside `#game-stage` or over any Start / Pause / Restart / Touch control.
  - Duplicate script loading is prevented automatically by `js/ads.js`.
  - Never click live ads on your own site; use **Google Publisher Toolbar** or AdSense's built-in **Ad review / Preview** tools instead.

---

## 9. How to Request Website Review

Before clicking **Request review** in **AdSense → Sites**:

1. Confirm your custom domain serves HTTPS cleanly with no broken links (`npm test` runs automated verification).
2. Replace `miniplayarcade.example.com` and `support@miniplayarcade.example.com` with your real production domain and working contact email in:
   - `index.html`, `games/*.html`, `pages/*.html`
   - `sitemap.xml` and `robots.txt`
   - `js/games-data.js` (`CANONICAL_BASE`)
3. Verify `ads.txt` or the verification snippet is live at your root domain.
4. Confirm all legal pages (`Privacy Policy`, `Cookie Policy`, `Terms and Conditions`, `Disclaimer`, `About Us`, `Contact Us`) are accessible from the footer.
5. In **Google AdSense → Sites**, select your domain, confirm verification passed, and click **Request review**. Reviews typically take a few days to 2–4 weeks.
