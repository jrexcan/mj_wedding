# Setup

Six files plus a folder: `index.html`, `styles.css`, `script.js`, `data.json`, `photos.json`, `rsvp-backend.gs`, and a `photos/` folder holding the gallery images. Keep everything except `rsvp-backend.gs` together — that one goes into Google, not the folder.

Out of the box the invitation works, but replies only save to the guest's own browser and the page says so. Do step 1 to start collecting real RSVPs.

---

## 0. Edit the names, entourage, and venue

Everything that used to be placeholder text in `index.html` — names, the entourage, the schedule, the venue — now lives in `data.json`. Open it in any text editor; you don't need to touch the HTML, CSS, or JS at all.

It's grouped in entourage order, matching the pages of the invitation:

1. `couple` — the two names and the display date shown on the cover
2. `parents` — parents of the groom, then the bride
3. `honorAttendants` — maid of honor, best man
4. `principalSponsors` — `men` and `women` arrays, shown as two columns
5. `secondarySponsors` — candle, veil, cord, in that ceremonial order; each has `role`, `sponsor1`, and `sponsor2`, shown as its own labeled line like Maid of Honor / Best Man
6. `bridalParty` — bridesmaid/groomsman pairs
7. `littleAttendants` — `flowerGirls` (a plain list of names) and `bearers` (each with a `role` and a `name`, shown the same way as the secondary sponsors)
8. `schedule` — the timeline of events
9. `venue` — `name`, `address` (leave `""` to hide the address line), and `mapUrl` (the Google Maps link behind "Open map")
10. `rsvpDeadline` — the date shown on the RSVP page

Add or remove entries freely — e.g. a 6th principal sponsor pair, or a 5th bridesmaid/groomsman pair — the page renders however many you list. Keep the file valid JSON: every name in quotes, commas between entries, no trailing comma after the last one in a list. If you're not sure, paste the file into jsonlint.com before saving.

**This only works once the site is hosted** (step 1). Opening `index.html` by double-clicking it loads it as a `file://` page, and browsers block a page from reading a sibling file that way — the invitation will fall back to showing generic placeholder names instead of failing. That's a browser security rule, not a bug in the site; the moment it's live on GitHub Pages, `data.json` loads normally. To preview your edits locally before pushing, run `npx serve` in the folder and open the localhost link it gives you.

---

## 0b. Edit the gallery photos and page backgrounds

`photos.json` is the second data file — separate from `data.json` because it's about images, not names. It has two parts:

**`pageBackgrounds`** — one entry per page, using the URL of the photo behind it. All 9 original pages keep their existing Unsplash photos by default; the two new gallery pages start with `""` (empty), which means a plain white background rather than a photo — sensible since those pages are already full of your actual photos. Set any of these to your own image path (e.g. `"photos/venue.jpg"`) or leave a page as `""` for no background photo at all.

**`gallery`** — the two new pages, each with a `title`, a `caption`, and a `photos` array. Each photo is `{ "src": "photos/gallery-01.jpg", "alt": "" }`. Add, remove, or reorder entries freely; the grid and the lightbox both follow whatever's listed. `alt` is optional but worth filling in — it's read aloud by screen readers and shows if an image fails to load.

**The `photos/` folder** is where the actual image files live, sitting next to `index.html`. Twelve placeholder images are already in there for each gallery page (`gallery-01.jpg` … `gallery-12.jpg`, and `prenup-01.jpg` … `prenup-12.jpg`) — plain navy placeholders labeled "Photo 1", "Photo 2", and so on. Replace them with your real photos **using the exact same filenames** and the gallery updates automatically, no JSON edit needed. To add even more photos to a page, save the new file into `photos/` and add a matching line to that page's `photos` array in `photos.json` — the grid isn't hardcoded to any particular count, so it renders however many are listed.

**Optional: thumbnails for the grid.** The gallery shows each photo in a tile roughly 120px wide, but it downloads the full file to do it. If your photos are large, you can drop smaller copies into `photos/thumbs/` using the *same filenames*, then set this at the top of `photos.json`:

```json
"thumbnails": { "enabled": true, "folder": "photos/thumbs/" }
```

The grid then uses the small copies and the lightbox still opens the full-resolution original — your actual photos are never touched or downscaled. If a thumbnail is missing, that tile quietly falls back to the full image, so a half-finished folder won't break anything. With ImageMagick installed, the whole set is one command from inside `photos/`:

```
mkdir -p thumbs && mogrify -path thumbs -resize 600x600^ -quality 82 *.jpg
```

Keep photos reasonably sized — under about 400 KB each — since guests will often be opening this on mobile data. Any image editor or a free tool like squoosh.app can shrink a photo without a visible quality loss.

On the invitation itself: **tap or click any gallery photo to open it full-screen** (with the previous/next arrows or the arrow keys to browse, and Escape or tapping outside the photo to close). **Hovering a photo** on desktop darkens it slightly and shows a small expand icon, signaling it's clickable.

---

## 1. Put it on GitHub Pages

1. Create a new GitHub repository (public, unless you're on a paid plan that allows private Pages sites).
2. Add everything to it — `index.html`, `styles.css`, `script.js`, `data.json`, `photos.json`, `rsvp-backend.gs`, and the whole `photos/` folder — either by dragging them into the GitHub web UI or with `git push`.
3. In the repo: **Settings → Pages**. Under "Build and deployment", set **Source** to **Deploy from a branch**, pick your branch (usually `main`) and the `/ (root)` folder, then **Save**.
4. GitHub gives you a URL like `https://yourusername.github.io/your-repo-name/`. It can take a minute or two to go live the first time.

That link is HTTPS by default, which is what you want — some services (Formspree included) don't work well from `http://` pages.

---

## 2. Collect replies with Formspree

Formspree sits between your form and your inbox — no server of your own, no deploy step, and it works fine on GitHub Pages.

1. Go to **formspree.io** and sign up (free tier covers 50 submissions/month, which is plenty for a wedding).
2. Click **New Form**, name it something like "Wedding RSVP".
3. Formspree gives you an endpoint that looks like `https://formspree.io/f/abcdwxyz`. Copy it.
4. Open `script.js`. Near the top:

   ```js
   const RSVP_METHOD = 'formspree';
   const FORMSPREE_ENDPOINT = 'https://formspree.io/f/abcdwxyz'; // your real endpoint
   ```

5. Push the change to GitHub (or re-upload `script.js`) and wait for Pages to redeploy.

Test it by submitting a real RSVP from the live site. The first submission from a brand-new form usually asks you to confirm it in an email Formspree sends you — do that once, then every reply after lands directly in your Formspree dashboard and gets emailed to you too.

**If Formspree isn't available later, or you'd rather use a spreadsheet:** the Google Sheets option below still works — GitHub Pages hosting and the RSVP backend are independent of each other. Just set `RSVP_METHOD` to `'endpoint'` instead of `'formspree'` and follow the steps in the next section.

---

## 3. Alternative: collect replies in a Google Sheet

Free, no account beyond Google, and you read the responses in a spreadsheet.

1. Create a new Google Sheet. Name it something like **Wedding RSVPs**.
2. In that sheet: **Extensions → Apps Script**.
3. Delete whatever is in the editor. Paste the entire contents of `rsvp-backend.gs`. Save.
4. Click **Deploy → New deployment**.
5. Click the gear next to "Select type" and choose **Web app**.
6. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Click **Deploy**. Google asks you to authorize — approve it. On the "Google hasn't verified this app" screen, choose **Advanced → Go to (your project)**.
8. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy...../exec`.
9. Open `script.js`. Set:

   ```js
   const RSVP_METHOD = 'endpoint';
   const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfy...../exec';
   ```

Test it by opening the URL in a browser tab — you should see `{"result":"ok",...}`. Then submit a test RSVP from the invitation and check that a row appears in the sheet.

**"Who has access: Anyone" is required.** Your guests are not signed into your Google account. This does not expose the sheet itself — only the script can write to it, and it only ever appends rows.

**If you change the script later,** use **Deploy → Manage deployments → edit (pencil) → Version: New version**. Creating a whole new deployment gives you a new URL and the old one keeps pointing at the old code.

---

## 4. Optional touches

**Music.** Put an mp3 named `music.mp3` in the folder. The button appears on its own once the file loads and hides itself if it's missing. Use something you have the right to use — Pixabay and the YouTube Audio Library both have free instrumental tracks. Don't hotlink someone else's URL; it will break on you eventually.

**Photos.** Page backgrounds live in `photos.json` under `pageBackgrounds` — that's the only place to change them now. The old `url('...')` lines in `styles.css` are gone, because having the photo named in both files meant every background was downloaded twice.

**Names.** The placeholders in `index.html` are only what shows if `data.json` can't load. Edit `data.json`, not the HTML.

**RSVP deadline.** Comes from `rsvpDeadline` in `data.json`. If you want the form to close itself after that date, say so and I'll add it.

---

## What changed in this round

**Principal sponsors keep two columns on phones.** A rule in `styles.css` was stacking them into one long list below 400px wide. The list is now a CSS grid with two fixed columns at every width — only the type size scales down, and long names wrap inside their own column instead of pushing the layout sideways.

**Photos load faster.** Nothing was re-encoded and no image resolution changed; what changed is *when* each file gets requested:

- Every page background was named twice — once in `styles.css` and again in `photos.json` — so each one downloaded twice. The CSS copies are gone.
- Backgrounds and gallery photos used to all fire at once. Inside a flipbook every page counts as on-screen, so `loading="lazy"` was holding nothing back: opening the cover kicked off eleven backgrounds and twenty-four gallery photos simultaneously, with the cover itself last in line. Photos are now requested one page ahead of the reader, and the rest fill in during idle time.
- `data.json` and `photos.json` were fetched one after the other, and with `no-store`, so a repeat visit re-downloaded both from scratch. They now load in parallel and revalidate against the cache.
- The page-flip library was a blocking `<script>` in the `<head>`. Both scripts are deferred now, so the page draws without waiting on the CDN.
- Opening a photo full-screen now pre-fetches the two either side, so arrowing through the gallery doesn't pause.
- Gallery tiles show a soft placeholder and fade the photo in, rather than leaving a gap then popping.
- `photos.json` gained an optional `thumbnails` setting (see section 0b) if you want the grid to use smaller copies — the lightbox still opens the originals.

**Bugs fixed along the way:**

- A `@media (prefers-reduced-motion: reduce)` block in `styles.css` had lost its opening line, leaving `* { animation: none !important; transition-duration: 0.01ms !important; }` applying to *everyone*. Every fade and hover effect on the site was dead. The wrapper is back.
- The flip sound was fetching `page-flip.mp3` while the file in the folder is `page-flip.wav`, so it always fell through to the synthesized sound. It now tries both names.
- The music button used `preload="none"` but waited for `canplay`, which that setting can prevent from ever firing — the button could stay hidden even with the file present. It now listens for `loadedmetadata` too.
- Three `<h1>` elements on the cover shared `id="couple-names"`. Duplicate IDs are invalid; they're a class now.

---

## What changed from your version

- The resize handler called `pageFlip.update()`, which isn't in the library's API. It now rebuilds the flipbook and returns the reader to their page. Phone rotation works.
- The music button flipped its own `isPlaying` flag even when playback was blocked, so the label could lie. It now follows the audio element's `play` and `pause` events.
- Height math disagreed with the CSS (`--control-height` was 55, the JS subtracted 60, then more). Both now read the same value, and the JS uses `visualViewport` so the mobile address bar doesn't push the book off screen.
- The RSVP form alerted and forgot. It now validates, posts to the sheet, disables the button while sending, falls back to local storage when the network fails, and retries stranded replies when the guest comes back online.
- Tapping a form field could start a page turn. Pointer events inside the form no longer reach the flipbook.
- Prev and Next disable at the ends. Added arrow-key navigation.
- Inputs are 16px so iOS stops zooming on focus.
- Added a hidden spam trap field, checked on both the page and the server.
- The original Unsplash background photos are back on every page, with the navy overlay preserved.
- All names, entourage roles, schedule, and venue details moved out of the HTML into `data.json`, so they can be edited without touching any code.
- The RSVP backend is now switchable (`RSVP_METHOD` in `script.js`): Formspree for GitHub Pages, a Google Sheet, Netlify Forms if hosted there instead, or local-only — one line to change, no other code to touch.
- Added two gallery pages ("Our Gallery" and "Prenup Photos"). Tapping a photo opens it full-screen with previous/next and Escape-to-close; hovering shows a darken + expand-icon hint. Every photo, on both pages, and every page's background photo now live in `photos.json` — a new file, separate from `data.json` — so images can be swapped without touching HTML or CSS. Actual image files live in a new `photos/` folder, currently filled with labeled placeholders.
- Fixed the page-flip sound lookup, which had been changed to request `page-flip.mp3` while the actual file is `page-flip.wav` — it was silently always falling back to the synthesized sound instead of playing your recording.