/* ============================================================
   Mary & J-Rex — invitation logic
   ============================================================

   RSVP BACKEND — pick whichever fits how you're hosting this.
   Since this is going on GitHub Pages (plain static hosting,
   no server-side processing), the options that work are:

   1. FORMSPREE (recommended). Free, no code to deploy. Sign up
      at formspree.io, create a form, and paste the endpoint it
      gives you — like https://formspree.io/f/abcdwxyz — into
      FORMSPREE_ENDPOINT below. Set RSVP_METHOD to 'formspree'.
      Replies show up in your Formspree dashboard and are also
      emailed to you.

   2. GOOGLE SHEETS. If you'd rather have replies land in a
      spreadsheet, deploy rsvp-backend.gs as a Google Apps Script
      web app (steps in SETUP.md), paste its URL into RSVP_ENDPOINT
      below, and set RSVP_METHOD to 'endpoint'.

   3. NETLIFY FORMS only works if this is actually hosted on
      Netlify (it needs Netlify's own build step) — not GitHub
      Pages. Left in for anyone who switches hosts later.

   Until one of these is configured, RSVP_METHOD stays 'local':
   replies are saved on each guest's own device, and the page
   says so honestly rather than pretending they reached you.
   ============================================================ */
const RSVP_METHOD = 'local'; // 'formspree' | 'endpoint' | 'netlify' | 'local'
const FORMSPREE_ENDPOINT = ''; // e.g. 'https://formspree.io/f/abcdwxyz'
const RSVP_ENDPOINT = '';      // Google Apps Script URL, only used when RSVP_METHOD is 'endpoint'

const TOTAL_PAGES = 11;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadWeddingData() {
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    // Common cause: the page was opened directly as a file (file://)
    // rather than served over http(s). It will work once hosted.
    console.warn('data.json could not be loaded — showing the built-in placeholder names.', err);
    return null;
  }
}

function applyWeddingData(data) {
  if (!data) return; // keep whatever is already written in index.html

  const set = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  // Cover + celebration date
  if (data.couple) {
    // if (data.couple.partner1 && data.couple.partner2) {
    //   set('couple-names',
    //     `${escapeHtml(data.couple.partner1)} <span class="amp">&amp;</span> ${escapeHtml(data.couple.partner2)}`);
    // }
    if (data.couple.displayDate) {
      document.querySelectorAll('.js-wedding-date')
        .forEach((el) => { el.textContent = data.couple.displayDate; });
    }
  }

  // Parents & principal honors
  if (data.parents && data.honorAttendants) {
    set('parents-honors', `
      <p class="role-title">Parents of the groom</p>
      <p>${escapeHtml(data.parents.groom.join(' & '))}</p>
      <p class="role-title">Parents of the bride</p>
      <p>${escapeHtml(data.parents.bride.join(' & '))}</p>
      <div class="divider-small"></div>
      <p class="role-title">Maid of honor</p>
      <p>${escapeHtml(data.honorAttendants.maidOfHonor)}</p>
      <p class="role-title">Best man</p>
      <p>${escapeHtml(data.honorAttendants.bestMan)}</p>
    `);
  }

  // Principal sponsors, in entourage rank: men then women, paired by column
  if (data.principalSponsors) {
    const men = (data.principalSponsors.men || []).map((n) => `<p>${escapeHtml(n)}</p>`).join('');
    const women = (data.principalSponsors.women || []).map((n) => `<p>${escapeHtml(n)}</p>`).join('');
    set('principal-sponsors-list', `<div class="column">${men}</div><div class="column">${women}</div>`);
  }

  // Secondary sponsors, in ceremonial order (candle, veil, cord) — each
  // role gets its own label and its own pair of names, same treatment
  // as maid of honor / best man.
  if (Array.isArray(data.secondarySponsors)) {
    set('secondary-sponsors-list', data.secondarySponsors.map((s) => `
      <p class="role-title">${escapeHtml(s.role)} sponsors</p>
      <p class="sub-detail">${escapeHtml(s.sponsor1)} &amp; ${escapeHtml(s.sponsor2)}</p>
    `).join(''));
  }

  // Bridesmaids & groomsmen, paired
  if (Array.isArray(data.bridalParty)) {
    set('bridal-pairs-list', data.bridalParty.map((p) =>
      `<p class="sub-detail">${escapeHtml(p.bridesmaid)} &amp; ${escapeHtml(p.groomsman)}</p>`
    ).join(''));
  }

  // Little attendants: flower girls listed on their own, bearers each
  // get their own role label + name, same treatment as secondary sponsors.
  if (data.littleAttendants) {
    if (Array.isArray(data.littleAttendants.flowerGirls)) {
      set('flower-girls-list', data.littleAttendants.flowerGirls.map((name) =>
        `<p>${escapeHtml(name)}</p>`
      ).join(''));
    }
    if (Array.isArray(data.littleAttendants.bearers)) {
      set('bearers-list', data.littleAttendants.bearers.map((b) => `
        <p class="role-title">${escapeHtml(b.role)}</p>
        <p class="sub-detail">${escapeHtml(b.name)}</p>
      `).join(''));
    }
  }

  // Schedule
  if (Array.isArray(data.schedule)) {
    set('schedule-list', data.schedule.map((ev) =>
      `<div class="event"><span class="time">${escapeHtml(ev.time)}</span><span class="desc">${escapeHtml(ev.label)}</span></div>`
    ).join(''));
  }

  // Venue / location
  if (data.venue) {
    const nameEl = document.getElementById('venue-name');
    if (nameEl && data.venue.name) nameEl.textContent = data.venue.name;

    const addrEl = document.getElementById('venue-address');
    if (addrEl) {
      if (data.venue.address) {
        addrEl.textContent = data.venue.address;
        addrEl.hidden = false;
      } else {
        addrEl.hidden = true;
      }
    }

    const linkEl = document.getElementById('venue-map-link');
    if (linkEl && data.venue.mapUrl) linkEl.href = data.venue.mapUrl;
  }

  // RSVP deadline
  if (data.rsvpDeadline) {
    set('rsvp-deadline-text', `Kindly reply by ${escapeHtml(data.rsvpDeadline)}`);
  }

  // Keep the document <title> and meta tags in sync too
  if (data.couple && data.couple.partner1 && data.couple.partner2) {
    document.title = `${data.couple.partner1} & ${data.couple.partner2} — ${data.couple.displayDate || ''}`.trim();
  }
}

/* ============================================================
   Photos — page backgrounds and the two gallery pages all read
   from photos.json, so every image URL lives in one editable
   place instead of being buried in CSS or HTML.
   ============================================================ */

// Overlay opacity per background, matching what each page originally
// shipped with in styles.css — kept here so a JSON-supplied URL still
// gets the right amount of white wash over it.
const BG_OVERLAY_OPACITY = {
  cover: 0.86,
  celebration: 0.88,
  parents: 0.9,
  sponsors: 0.9,
  bridalParty: 0.9,
  littleAttendants: 0.9,
  schedule: 0.9,
  dressCode: 0.9,
  galleryOne: 0.9,
  galleryTwo: 0.9,
  rsvp: 0.9
};

async function loadPhotosData() {
  try {
    const res = await fetch('photos.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    // Common cause: opened as a local file:// page instead of served
    // over http(s). Pages keep their plain white background and the
    // gallery falls back to the filenames already in index.html.
    console.warn('photos.json could not be loaded — keeping the built-in gallery photos.', err);
    return null;
  }
}

/* ------------------------------------------------------------
   Image loading

   Every page of a flipbook is technically on screen, so the
   browser treats all of them as visible and loading="lazy" holds
   nothing back — left alone, a phone opening the cover starts
   downloading eleven backgrounds and twenty-four gallery photos
   at once, and the cover is last in that queue.

   So: nothing loads by itself. Backgrounds and gallery photos are
   requested one page ahead of the reader, and whatever is left
   fills in during idle time. No image is resized or re-encoded —
   this only changes when each file is asked for.
   ------------------------------------------------------------ */

const bgSources = {};       // bg key -> url, from photos.json
let thumbConfig = null;     // optional smaller files for the grid

// Where a background lives depends on which page it's on, so the grid
// and the backgrounds share one "warm these pages" pass.
function setBackgroundSources(pageBackgrounds) {
  Object.assign(bgSources, pageBackgrounds || {});
}

function thumbFor(src) {
  if (!thumbConfig || !thumbConfig.enabled || !thumbConfig.folder) return null;
  const file = String(src).split('/').pop();
  if (!file) return null;
  const folder = thumbConfig.folder.endsWith('/') ? thumbConfig.folder : thumbConfig.folder + '/';
  return folder + file;
}

// Swap a held-back image into a real request. The full-size file is kept
// on the button, so the lightbox always opens the original.
function loadImagesIn(root) {
  if (!root) return;
  root.querySelectorAll('img[data-src]').forEach((img) => {
    const src = img.dataset.src;
    const fallback = img.dataset.fallback;
    delete img.dataset.src;

    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    if (fallback) {
      // A thumbnail folder that doesn't exist yet shouldn't blank the grid.
      img.addEventListener('error', function onErr() {
        img.removeEventListener('error', onErr);
        img.src = fallback;
      });
    }

    img.src = src;
    if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
  });
}

function applyBackgroundFor(pageEl) {
  if (!pageEl) return;
  const content = pageEl.querySelector('[data-bg-key]');
  if (!content || content.dataset.bgState) return;
  content.dataset.bgState = 'pending';

  const key = content.dataset.bgKey;
  const url = bgSources[key];
  if (!url) { content.dataset.bgState = 'none'; return; } // "" means plain background

  const opacity = BG_OVERLAY_OPACITY[key] ?? 0.9;
  const wash = `linear-gradient(rgba(255, 255, 255, ${opacity}), rgba(255, 255, 255, ${opacity}))`;

  // Decode first, then paint — a half-drawn background photo sliding in
  // mid-flip is more distracting than the page arriving a beat plain.
  const probe = new Image();
  probe.decoding = 'async';
  probe.onload = () => {
    content.style.backgroundImage = `${wash}, url('${url}')`;
    content.dataset.bgState = 'done';
  };
  probe.onerror = () => { content.dataset.bgState = 'failed'; };
  probe.src = url;
}

function renderGalleryGrid(gridId, photos) {
  const grid = document.getElementById(gridId);
  if (!grid || !Array.isArray(photos) || !photos.length) return;

  grid.innerHTML = photos.map((p) => {
    const full = escapeHtml(p.src);
    const thumb = thumbFor(p.src);
    const shown = thumb ? escapeHtml(thumb) : full;
    const fallbackAttr = thumb ? ` data-fallback="${full}"` : '';
    return `<button type="button" class="gallery-item" data-src="${full}">
      <img data-src="${shown}"${fallbackAttr} alt="${escapeHtml(p.alt || '')}"
           width="400" height="400" decoding="async" loading="lazy" />
    </button>`;
  }).join('');
}

function applyGalleryData(gallery) {
  if (!gallery) return;

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  };

  if (gallery.pageOne) {
    set('gallery-one-title', gallery.pageOne.title);
    set('gallery-one-caption', gallery.pageOne.caption);
    renderGalleryGrid('gallery-one-grid', gallery.pageOne.photos);
  }
  if (gallery.pageTwo) {
    set('gallery-two-title', gallery.pageTwo.title);
    set('gallery-two-caption', gallery.pageTwo.caption);
    renderGalleryGrid('gallery-two-grid', gallery.pageTwo.photos);
  }
}

function applyPhotosData(photos) {
  if (!photos) return; // keep whatever is already in the HTML
  thumbConfig = photos.thumbnails || null;
  setBackgroundSources(photos.pageBackgrounds);
  applyGalleryData(photos.gallery);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Kick this off immediately so it's downloaded well before the
  // first flip — decoding happens later, once an AudioContext exists.
  // Tries the .wav first (that's the filename SETUP.md documents), then
  // .mp3, so whichever one is actually sitting in the folder gets used
  // instead of silently falling through to the synthesized swish.
  const fetchFlipSound = async () => {
    for (const name of ['page-flip.wav', 'page-flip.mp3']) {
      try {
        const res = await fetch(name);
        if (res.ok) return await res.arrayBuffer();
      } catch (_) { /* try the next extension */ }
    }
    console.warn('No page-flip.wav or .mp3 found — using the synthesized flip sound.');
    return null;
  };
  const flipSoundArrayBufferPromise = fetchFlipSound();

  /* ---------------------------------------------------------
     Names, entourage & venue — loaded from data.json so the
     couple can edit one file instead of touching any markup.
     If it can't be loaded (e.g. opened as a local file:// page
     without a server), the placeholder text already in the HTML
     is left exactly as it is.
     --------------------------------------------------------- */
  // Both files are small and independent, so they go out together rather
  // than one waiting on the other.
  const [weddingData, photosData] = await Promise.all([
    loadWeddingData(),
    loadPhotosData()
  ]);
  applyWeddingData(weddingData);

  /* ---------------------------------------------------------
     Page backgrounds & gallery photos — loaded from photos.json.
     Runs before the flipbook builds so the resize/rebuild logic
     backs up pages that already have their real photos in place.
     --------------------------------------------------------- */
  applyPhotosData(photosData);

  /* ---------------------------------------------------------
     Flipbook
     --------------------------------------------------------- */
  const flipEl = document.getElementById('flipbook');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const pageNum = document.getElementById('page-num');

  let pageFlip = null;

  // loadFromHTML reparents these nodes, so grab them before init;
  // rebuilding on resize needs the originals back.
  const pagesBackup = Array.from(document.querySelectorAll('.page'));

  const isMobile = () => window.innerWidth < 768;

  /* Request the photos for the page in front of the reader and the one
     or two just past it. pagesBackup holds the original nodes, so this
     keeps working after a resize rebuild. */
  const WARM_BEHIND = 1;
  const WARM_AHEAD = 2;

  function warmPages(index) {
    const first = Math.max(0, index - WARM_BEHIND);
    const last = Math.min(pagesBackup.length - 1, index + WARM_AHEAD);
    for (let i = first; i <= last; i++) {
      applyBackgroundFor(pagesBackup[i]);
      loadImagesIn(pagesBackup[i]);
    }
  }

  /* Once the opening pages are in hand, quietly fill in the rest so
     flipping ahead is instant. Idle time only — this never competes
     with the page the reader is actually looking at. */
  function warmRemaining() {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    let i = 0;
    const step = () => {
      if (i >= pagesBackup.length) return;
      applyBackgroundFor(pagesBackup[i]);
      loadImagesIn(pagesBackup[i]);
      i++;
      idle(step, { timeout: 2000 });
    };
    idle(step, { timeout: 2500 });
  }

  /* ---------------------------------------------------------
     Page-flip sound. Plays the real recording (page-flip.wav)
     once it's decoded; falls back to a synthesized swish if the
     file is missing or fails to decode, so a flip never goes
     silent because of a missing asset.
     --------------------------------------------------------- */
  let audioCtx = null;
  let flipAudioBuffer = null;
  let flipAudioBufferChecked = false;

  function getAudioCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  async function getFlipAudioBuffer(ctx) {
    if (flipAudioBufferChecked) return flipAudioBuffer;
    flipAudioBufferChecked = true;
    try {
      const arrayBuffer = await flipSoundArrayBufferPromise;
      if (!arrayBuffer) return null;
      flipAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn('Could not decode page-flip.wav — falling back to the synthesized flip sound.', err);
      flipAudioBuffer = null;
    }
    return flipAudioBuffer;
  }

  function playRecordedFlipSound(ctx, buffer) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = 0.7; // turn down here if it's louder than the background music

    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  function playFlipSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;

    getFlipAudioBuffer(ctx).then((buffer) => {
      if (buffer) {
        playRecordedFlipSound(ctx, buffer);
      } else {
        playSynthesizedFlipSound(ctx);
      }
    });
  }

  function playSynthesizedFlipSound(ctx) {
    if (!ctx) return;
    const now = ctx.currentTime;

    // --- Phase 1: the riffle — fluttering rustle as the page moves
    // through the air. A fast, slightly irregular amplitude wobble on
    // top of filtered noise is what reads as "paper" rather than
    // generic hiss; a plain decay envelope alone sounds like static.
    const riffleDuration = 0.16;
    const riffleSize = Math.floor(ctx.sampleRate * riffleDuration);
    const riffleBuffer = ctx.createBuffer(1, riffleSize, ctx.sampleRate);
    const riffleData = riffleBuffer.getChannelData(0);

    for (let i = 0; i < riffleSize; i++) {
      const t = i / riffleSize;
      const decay = Math.pow(1 - t, 1.6);
      // Two overlapping wobble rates avoid a too-regular, buzzy flutter.
      const flutter = 0.55
        + 0.3 * Math.sin(2 * Math.PI * 42 * t)
        + 0.15 * Math.sin(2 * Math.PI * 97 * t + 1.3);
      riffleData[i] = (Math.random() * 2 - 1) * decay * flutter;
    }

    const riffleSrc = ctx.createBufferSource();
    riffleSrc.buffer = riffleBuffer;

    const riffleFilter = ctx.createBiquadFilter();
    riffleFilter.type = 'bandpass';
    riffleFilter.frequency.setValueAtTime(5200, now);
    riffleFilter.frequency.exponentialRampToValueAtTime(2400, now + riffleDuration);
    riffleFilter.Q.value = 0.9;

    const riffleGain = ctx.createGain();
    riffleGain.gain.setValueAtTime(0.34, now);
    riffleGain.gain.exponentialRampToValueAtTime(0.001, now + riffleDuration);

    riffleSrc.connect(riffleFilter).connect(riffleGain).connect(ctx.destination);
    riffleSrc.start(now);
    riffleSrc.stop(now + riffleDuration);

    // --- Phase 2: the settle — a soft, low tap as the page lands flat.
    // Starts slightly before the riffle fully fades, the way a real
    // page's edge touches down while it's still finishing its rustle.
    const settleStart = now + riffleDuration * 0.75;
    const settleDuration = 0.08;
    const settleSize = Math.floor(ctx.sampleRate * settleDuration);
    const settleBuffer = ctx.createBuffer(1, settleSize, ctx.sampleRate);
    const settleData = settleBuffer.getChannelData(0);

    for (let i = 0; i < settleSize; i++) {
      const t = i / settleSize;
      settleData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
    }

    const settleSrc = ctx.createBufferSource();
    settleSrc.buffer = settleBuffer;

    const settleFilter = ctx.createBiquadFilter();
    settleFilter.type = 'lowpass';
    settleFilter.frequency.value = 850;

    const settleGain = ctx.createGain();
    settleGain.gain.setValueAtTime(0.16, settleStart);
    settleGain.gain.exponentialRampToValueAtTime(0.001, settleStart + settleDuration);

    settleSrc.connect(settleFilter).connect(settleGain).connect(ctx.destination);
    settleSrc.start(settleStart);
    settleSrc.stop(settleStart + settleDuration);
  }

  // The resize handler calls turnToPage() to restore the reader's
  // position after rebuilding the book — that's not a real page turn,
  // so it shouldn't make a sound. This flag tells the flip handler
  // to skip that one synthetic event.
  let suppressNextFlipSound = false;

  function calcDimensions() {
    const controls = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--control-height'),
      10
    ) || 56;

    // visualViewport tracks the real visible area on mobile browsers,
    // where window.innerHeight lies about the collapsing address bar.
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    const vw = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
    const availH = vh - controls - 16;

    if (isMobile()) {
      return {
        width: Math.max(260, Math.min(vw - 20, 430)),
        height: Math.max(380, Math.min(availH, 690)),
        portrait: true
      };
    }
    return {
      width: Math.max(300, Math.min((vw - 60) / 2, 460)),
      height: Math.max(420, Math.min(availH, 660)),
      portrait: false
    };
  }

  function markActivePage(index) {
    const pages = document.querySelectorAll('.page');
    const spread = !isMobile();
    pages.forEach((page, i) => {
      const active = i === index || (spread && i === index + 1);
      page.classList.toggle('page-active', active);
    });
  }

  function updateControls(index) {
    const shown = isMobile() ? `${index + 1} of ${TOTAL_PAGES}`
                             : `${index + 1}–${Math.min(index + 2, TOTAL_PAGES)} of ${TOTAL_PAGES}`;
    pageNum.textContent = index === 0 ? `1 of ${TOTAL_PAGES}` : shown;
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= TOTAL_PAGES - 1;
  }

  function buildFlipbook(startIndex = 0) {
    const dims = calcDimensions();

    pageFlip = new St.PageFlip(flipEl, {
      width: dims.width,
      height: dims.height,
      size: 'fixed',
      maxShadowOpacity: 0.4,
      showCover: true,
      showPageCorners: true,
      usePortrait: dims.portrait,
      mobileScrollSupport: false, // the page body doesn't scroll; pages do
      clickEventForward: true,
      disableFlipByClick: false,
      useMouseEvents: true
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    pageFlip.on('flip', (e) => {
      if (suppressNextFlipSound) {
        suppressNextFlipSound = false;
      } else {
        playFlipSound();
      }
      markActivePage(e.data);
      updateControls(e.data);
      warmPages(e.data);
    });

    if (startIndex > 0) {
      suppressNextFlipSound = true;
      pageFlip.turnToPage(startIndex);
    }

    requestAnimationFrame(() => {
      markActivePage(startIndex);
      updateControls(startIndex);
      warmPages(startIndex);
    });
  }

  buildFlipbook(0);
  warmRemaining();

  prevBtn.addEventListener('click', () => pageFlip && pageFlip.flipPrev());
  nextBtn.addEventListener('click', () => pageFlip && pageFlip.flipNext());

  document.addEventListener('keydown', (e) => {
    // While the lightbox is open, arrows browse photos and Escape
    // closes it — none of that should also flip the book underneath.
    if (lightbox && !lightbox.hidden) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showLightboxPhoto(lightboxIndex - 1);
      if (e.key === 'ArrowRight') showLightboxPhoto(lightboxIndex + 1);
      return;
    }

    if (!pageFlip) return;
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (typing) return;
    if (e.key === 'ArrowLeft') pageFlip.flipPrev();
    if (e.key === 'ArrowRight') pageFlip.flipNext();
  });

  /* The library has no supported way to resize an existing instance,
     so rebuild it and return the reader to the page they were on. */
  let resizeTimer;
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;

  window.addEventListener('resize', () => {
    // Mobile keyboards fire resize on focus; ignore height-only changes
    // while a field is focused, or the book rebuilds mid-typing.
    const focusInField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (focusInField && window.innerWidth === lastW) return;

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!pageFlip) return;
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 80) return;

      lastW = window.innerWidth;
      lastH = window.innerHeight;

      const current = pageFlip.getCurrentPageIndex();
      try { pageFlip.destroy(); } catch (_) { /* already gone */ }
      flipEl.innerHTML = '';
      pagesBackup.forEach((node) => flipEl.appendChild(node));
      buildFlipbook(Math.min(current, TOTAL_PAGES - 1));
    }, 250);
  });

  /* ---------------------------------------------------------
     Music
     --------------------------------------------------------- */
  const music = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-btn');
  const musicLabel = musicBtn.querySelector('.music-label');

  // Only offer the button if the file actually loads.
  const showMusicBtn = () => { musicBtn.hidden = false; };
  music.addEventListener('loadedmetadata', showMusicBtn, { once: true });
  music.addEventListener('canplay', showMusicBtn, { once: true });
  music.addEventListener('error', () => { musicBtn.hidden = true; });
  // Deferred so the track's metadata isn't competing with the cover photo.
  setTimeout(() => music.load(), 800);

  // Drive the label from the element's own state so it can never desync.
  music.addEventListener('play', () => {
    musicBtn.setAttribute('aria-pressed', 'true');
    musicLabel.textContent = 'Pause music';
  });
  music.addEventListener('pause', () => {
    musicBtn.setAttribute('aria-pressed', 'false');
    musicLabel.textContent = 'Play music';
  });

  musicBtn.addEventListener('click', () => {
    if (music.paused) {
      music.play().catch(() => {
        musicLabel.textContent = 'Music unavailable';
      });
    } else {
      music.pause();
    }
  });

  /* ---------------------------------------------------------
     Photo lightbox — opens on a gallery photo tap, navigates
     within whichever page's set of photos it was opened from.
     --------------------------------------------------------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  let lightboxPhotos = [];
  let lightboxIndex = 0;

  function showLightboxPhoto(index) {
    if (!lightboxPhotos.length) return;
    lightboxIndex = (index + lightboxPhotos.length) % lightboxPhotos.length; // wrap around
    const item = lightboxPhotos[lightboxIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    preloadNeighbours(lightboxIndex);
  }

  // The full-size file is only requested when a photo is opened, so fetch
  // the two either side now — arrowing through then feels immediate.
  function preloadNeighbours(index) {
    [index - 1, index + 1].forEach((n) => {
      const item = lightboxPhotos[(n + lightboxPhotos.length) % lightboxPhotos.length];
      if (!item || !item.src) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = item.src;
    });
  }

  function openLightbox(photos, index) {
    lightboxPhotos = photos;
    showLightboxPhoto(index);
    lightbox.hidden = false;
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
  }

  // Delegate from each gallery grid: works for both the placeholder
  // markup already in the HTML and whatever photos.json re-renders.
  document.querySelectorAll('.gallery-grid').forEach((grid) => {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery-item');
      if (!btn) return;
      const items = Array.from(grid.querySelectorAll('.gallery-item'));
      const photos = items.map((el) => ({
        src: el.dataset.src,
        alt: el.querySelector('img')?.alt || ''
      }));
      openLightbox(photos, items.indexOf(btn));
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => showLightboxPhoto(lightboxIndex - 1));
  lightboxNext.addEventListener('click', () => showLightboxPhoto(lightboxIndex + 1));

  // Clicking the dark backdrop (not the image or a button) closes it.
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  /* ---------------------------------------------------------
     RSVP
     --------------------------------------------------------- */
  const form = document.getElementById('rsvp-form');
  const shell = document.getElementById('rsvp-shell');
  const submitBtn = document.getElementById('rsvp-submit');
  const status = document.getElementById('rsvp-status');
  const done = document.getElementById('rsvp-done');
  const doneTitle = document.getElementById('done-title');
  const doneBody = document.getElementById('done-body');
  const againBtn = document.getElementById('rsvp-again');
  const attendance = document.getElementById('attendance');
  const guestsGroup = document.getElementById('guests-group');

  // Page-flip listens for drags anywhere in the book. Without this,
  // tapping a field — or a gallery photo — can start a page turn
  // instead of registering as a click.
  ['mousedown', 'touchstart', 'pointerdown'].forEach((evt) => {
    shell.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
  });
  document.querySelectorAll('.gallery-grid').forEach((grid) => {
    ['mousedown', 'touchstart', 'pointerdown'].forEach((evt) => {
      grid.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
    });
  });

  // Guest count is meaningless for a decline.
  attendance.addEventListener('change', () => {
    guestsGroup.hidden = attendance.value === 'Regretfully declines';
  });

  function setError(group, message) {
    group.classList.add('invalid');
    if (!group.querySelector('.field-error')) {
      const span = document.createElement('span');
      span.className = 'field-error';
      span.textContent = message;
      group.appendChild(span);
    }
  }

  function clearErrors() {
    form.querySelectorAll('.form-group.invalid').forEach((g) => {
      g.classList.remove('invalid');
      const err = g.querySelector('.field-error');
      if (err) err.remove();
    });
  }

  function validate(data) {
    clearErrors();
    let ok = true;

    if (!data.name || data.name.trim().length < 2) {
      setError(document.getElementById('full-name').closest('.form-group'),
        'Please enter the name on your invitation.');
      ok = false;
    }
    if (!data.attendance) {
      setError(attendance.closest('.form-group'), 'Let us know if you can make it.');
      ok = false;
    }
    return ok;
  }

  function readForm() {
    const fd = new FormData(form);
    return {
      name: (fd.get('name') || '').toString().trim(),
      attendance: (fd.get('attendance') || '').toString(),
      guests: fd.get('attendance') === 'Regretfully declines'
        ? 0
        : Math.max(1, Math.min(10, parseInt(fd.get('guests'), 10) || 1)),
      dietary: (fd.get('dietary') || '').toString().trim(),
      website: (fd.get('website') || '').toString(), // honeypot
      submittedAt: new Date().toISOString()
    };
  }

  function saveLocally(entry) {
    try {
      const key = 'rsvp-pending';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push(entry);
      localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (_) {
      return false;
    }
  }

  async function sendToFormspree(entry) {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: entry.name,
        attendance: entry.attendance,
        guests: entry.guests,
        dietary: entry.dietary
      })
    });
    if (!res.ok) {
      // Formspree returns JSON with details on most failures.
      const body = await res.json().catch(() => null);
      const msg = body && Array.isArray(body.errors)
        ? body.errors.map((e) => e.message).join('; ')
        : 'HTTP ' + res.status;
      throw new Error(msg);
    }
  }

  async function sendToNetlify(entry) {
    // Netlify Forms expects a normal form-encoded POST to the page
    // itself, with form-name matching the form's name="" attribute.
    const body = new URLSearchParams({
      'form-name': 'rsvp',
      name: entry.name,
      attendance: entry.attendance,
      guests: String(entry.guests),
      dietary: entry.dietary
    });
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  }

  async function sendToServer(entry) {
    // text/plain avoids a CORS preflight, which Apps Script cannot answer.
    const res = await fetch(RSVP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(entry)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.json().catch(() => ({ result: 'ok' }));
    if (body.result === 'error') throw new Error(body.message || 'Server rejected the entry');
    return body;
  }

  // One switch, so the submit handler and the retry queue agree on
  // where a reply is supposed to go.
  async function deliverEntry(entry) {
    if (RSVP_METHOD === 'formspree' && FORMSPREE_ENDPOINT) return sendToFormspree(entry);
    if (RSVP_METHOD === 'endpoint' && RSVP_ENDPOINT) return sendToServer(entry);
    if (RSVP_METHOD === 'netlify') return sendToNetlify(entry);
    throw new Error('no-remote-configured'); // RSVP_METHOD === 'local'
  }

  function showDone(entry, offline) {
    form.hidden = true;
    done.hidden = false;

    if (entry.attendance === 'Regretfully declines') {
      doneTitle.textContent = 'Thank you for letting us know';
      doneBody.textContent = 'We will miss you, but we are grateful you replied.';
    } else {
      const n = entry.guests;
      doneTitle.textContent = 'We can\u2019t wait to see you';
      doneBody.textContent = `Your reply is in for ${n} ${n === 1 ? 'guest' : 'guests'}. See you on June 6.`;
    }

    if (offline) {
      doneBody.textContent += ' Your reply is saved on this device and has not reached us yet.';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const entry = readForm();

    // A filled honeypot means a bot. Show success, save nothing.
    if (entry.website) { showDone(entry, false); return; }
    delete entry.website;

    if (!validate(entry)) {
      status.textContent = '';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending\u2026';
    status.classList.remove('is-error');
    status.textContent = '';

    if (RSVP_METHOD === 'local') {
      saveLocally(entry);
      showDone(entry, true);
      return;
    }

    try {
      await deliverEntry(entry);
      showDone(entry, false);
    } catch (err) {
      const stored = saveLocally(entry);
      status.classList.add('is-error');
      status.textContent = stored
        ? 'We couldn\u2019t reach the server. Your reply is saved here — please try again when you have signal.'
        : 'We couldn\u2019t send your reply. Please check your connection and try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Try again';
    }
  });

  againBtn.addEventListener('click', () => {
    form.reset();
    clearErrors();
    guestsGroup.hidden = false;
    status.textContent = '';
    status.classList.remove('is-error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send RSVP';
    done.hidden = true;
    form.hidden = false;
    document.getElementById('full-name').focus();
  });

  /* Retry anything stranded on this device by an earlier failure. */
  async function flushPending() {
    if (RSVP_METHOD === 'local') return;
    let list;
    try {
      list = JSON.parse(localStorage.getItem('rsvp-pending') || '[]');
    } catch (_) { return; }
    if (!list.length) return;

    const remaining = [];
    for (const entry of list) {
      try { await deliverEntry(entry); } catch (_) { remaining.push(entry); }
    }
    try { localStorage.setItem('rsvp-pending', JSON.stringify(remaining)); } catch (_) {}
  }

  flushPending();
  window.addEventListener('online', flushPending);
});