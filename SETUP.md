# Setup

Five files: `index.html`, `styles.css`, `script.js`, `data.json`, `rsvp-backend.gs`.
Keep the first four in the same folder. The `.gs` file goes into Google, not the folder.

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
7. `littleAttendants` — flower girl paired with each bearer role
8. `schedule` — the timeline of events
9. `venue` — `name`, `address` (leave `""` to hide the address line), and `mapUrl` (the Google Maps link behind "Open map")
10. `rsvpDeadline` — the date shown on the RSVP page

Add or remove entries freely — e.g. a 6th principal sponsor pair, or a 5th bridesmaid/groomsman pair — the page renders however many you list. Keep the file valid JSON: every name in quotes, commas between entries, no trailing comma after the last one in a list. If you're not sure, paste the file into jsonlint.com before saving.

**This only works once the site is hosted** (step 2). Opening `index.html` by double-clicking it loads it as a `file://` page, and browsers block a page from reading a sibling file that way — the invitation will fall back to showing generic placeholder names instead of failing. That's a browser security rule, not a bug in the site; the moment it's on Netlify, Cloudflare Pages, or anywhere else over `https://`, `data.json` loads normally. To preview your edits locally before uploading, run `npx serve` in the folder and open the localhost link it gives you.

---

## 1. Collect replies in a Google Sheet

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
9. Open `script.js`. On line 11, paste the URL between the quotes:

   ```js
   const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfy...../exec';
   ```

Test it by opening the URL in a browser tab — you should see `{"result":"ok",...}`. Then submit a test RSVP from the invitation and check that a row appears in the sheet.

**"Who has access: Anyone" is required.** Your guests are not signed into your Google account. This does not expose the sheet itself — only the script can write to it, and it only ever appends rows.

**If you change the script later,** use **Deploy → Manage deployments → edit (pencil) → Version: New version**. Creating a whole new deployment gives you a new URL and the old one keeps pointing at the old code.

---

## 2. Put it online

Any static host works. Drag-and-drop options, no command line:

- **Netlify Drop** — netlify.com/drop, drag the folder in, get a link immediately.
- **Cloudflare Pages** or **GitHub Pages** — both free, both fine.

Whatever you pick, the link you send guests should be HTTPS. Apps Script rejects requests from plain `http://` pages in some browsers.

---

## 3. Optional touches

**Music.** Put an mp3 named `music.mp3` in the folder. The button appears on its own once the file loads and hides itself if it's missing. Use something you have the right to use — Pixabay and the YouTube Audio Library both have free instrumental tracks. Don't hotlink someone else's URL; it will break on you eventually.

**Photos.** Each page now uses the same background photos as your original file (Unsplash, with the navy overlay on top). They're linked from Unsplash's servers, so they depend on that link staying valid and on your guests having a connection — the same trade-off as before. To swap in your own engagement photos, open `styles.css`, find the matching rule (`.bg-cover` for page 1, `.bg-two` for page 2, and so on through `.bg-nine`), and replace only the `url('...')` part:

```css
.bg-two {
  background-image:
    linear-gradient(rgba(11, 29, 58, 0.85), rgba(11, 29, 58, 0.85)),
    url('images/engagement-01.jpg');
  background-size: cover;
  background-position: center;
}
```

If you host your own photo alongside the site (an `images/` folder next to `index.html`) instead of linking out, the page no longer depends on any other server — the sturdier option for something guests will open for months. Keep each photo under about 300 KB; guests will open this on mobile data.

**Names.** `index.html` still has placeholders: "Maid of Honor Name", "Mr. Sponsor One", "Bridesmaid 1 & Groomsman 1", "Sponsor Pair 1", and the flower girls and bearers.

**RSVP deadline.** Hardcoded as May 1, 2026 in `index.html`. If you want the form to close itself after that date, say so and I'll add it.

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
