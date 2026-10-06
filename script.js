/* ============================================================
   Mary Grace & J-Rex Hero — Wedding Invitation Logic
   ============================================================ */
const RSVP_METHOD = 'endpoint';
const RSVP_ENDPOINT = 'https://sheetdb.io/api/v1/8esz1ymkg7mf2';

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
    console.warn('data.json could not be loaded — using placeholder data.', err);
    return null;
  }
}

function applyWeddingData(data) {
  if (!data) return;

  const set = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  if (data.couple && data.couple.displayDate) {
    document.querySelectorAll('.js-wedding-date')
      .forEach((el) => { el.textContent = data.couple.displayDate; });
  }

  if (data.parents && data.honorAttendants) {
    set('parents-honors', `
      <p class="role-title">Parents of the Groom</p>
      <p>${escapeHtml(data.parents.groom.join(' & '))}</p>
      <p class="role-title">Parents of the Bride</p>
      <p>${escapeHtml(data.parents.bride.join(' & '))}</p>
      <div class="divider-small"></div>
      <p class="role-title">Maid of Honor</p>
      <p>${escapeHtml(data.honorAttendants.maidOfHonor)}</p>
      <p class="role-title">Best Man</p>
      <p>${escapeHtml(data.honorAttendants.bestMan)}</p>
    `);
  }

  if (data.principalSponsors) {
    const men = (data.principalSponsors.men || []).map((n) => `<p>${escapeHtml(n)}</p>`).join('');
    const women = (data.principalSponsors.women || []).map((n) => `<p>${escapeHtml(n)}</p>`).join('');
    set('principal-sponsors-list', `<div class="column">${men}</div><div class="column">${women}</div>`);
  }

  if (Array.isArray(data.secondarySponsors)) {
    set('secondary-sponsors-list', data.secondarySponsors.map((s) => `
      <p class="role-title">${escapeHtml(s.role)} Sponsors</p>
      <p class="sub-detail">${escapeHtml(s.sponsor1)} &amp; ${escapeHtml(s.sponsor2)}</p>
    `).join(''));
  }

  if (Array.isArray(data.bridalParty)) {
    set('bridal-pairs-list', data.bridalParty.map((p) =>
      `<p class="sub-detail">${escapeHtml(p.bridesmaid)} &amp; ${escapeHtml(p.groomsman)}</p>`
    ).join(''));
  }

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

  if (Array.isArray(data.schedule)) {
    set('schedule-list', data.schedule.map((ev) =>
      `<div class="event"><span class="time">${escapeHtml(ev.time)}</span><span class="desc">${escapeHtml(ev.label)}</span></div>`
    ).join(''));
  }

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

    const mapPhoto = document.getElementById('venue-map-photo');
    const mapImg = document.getElementById('venue-map-img');
    if (mapPhoto && mapImg) {
      if (data.venue.mapImage) {
        mapImg.dataset.src = data.venue.mapImage;
        if (data.venue.mapImageAlt) mapImg.alt = data.venue.mapImageAlt;
        mapImg.addEventListener('error', () => { mapPhoto.hidden = true; }, { once: true });
        mapPhoto.hidden = false;
      } else {
        mapPhoto.hidden = true;
      }
    }
  }

  if (data.rsvpDeadline) {
    set('rsvp-deadline-text', `Kindly reply by ${escapeHtml(data.rsvpDeadline)}`);
  }

  if (data.couple && data.couple.partner1 && data.couple.partner2) {
    document.title = `${data.couple.partner1} & ${data.couple.partner2} — ${data.couple.displayDate || ''}`.trim();
  }
}

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
    console.warn('photos.json could not be loaded.', err);
    return null;
  }
}

const bgSources = {};
let thumbConfig = null;

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

function loadImagesIn(root) {
  if (!root) return;
  root.querySelectorAll('img[data-src]').forEach((img) => {
    const src = img.dataset.src;
    const fallback = img.dataset.fallback;
    delete img.dataset.src;

    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    if (fallback) {
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
  if (!url) { content.dataset.bgState = 'none'; return; }

  const opacity = BG_OVERLAY_OPACITY[key] ?? 0.9;
  const wash = `linear-gradient(rgba(255, 255, 255, ${opacity}), rgba(255, 255, 255, ${opacity}))`;

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

function renderDressCode(dressCode) {
  const grid = document.getElementById('dress-code-grid');
  if (!grid || !dressCode || !Array.isArray(dressCode.cards) || !dressCode.cards.length) return;

  grid.innerHTML = dressCode.cards.map((c) => `
    <div class="vector-card">
      <div class="vector-art-wrapper">
        <img data-src="${escapeHtml(c.src)}" alt="${escapeHtml(c.alt || c.label || '')}"
             decoding="async" loading="lazy" />
      </div>
      <div class="vector-card-label">${escapeHtml(c.label)}</div>
      <p class="card-desc">${escapeHtml(c.description)}</p>
    </div>
  `).join('');
}

function applyPhotosData(photos) {
  if (!photos) return;
  thumbConfig = photos.thumbnails || null;
  setBackgroundSources(photos.pageBackgrounds);
  applyGalleryData(photos.gallery);
  renderDressCode(photos.dressCode);
}

document.addEventListener('DOMContentLoaded', async () => {
  const fetchFlipSound = async () => {
    for (const name of ['page-flip.mp3']) {
      try {
        const res = await fetch(name);
        if (res.ok) return await res.arrayBuffer();
      } catch (_) {}
    }
    return null;
  };
  const flipSoundArrayBufferPromise = fetchFlipSound();

  const [weddingData, photosData] = await Promise.all([
    loadWeddingData(),
    loadPhotosData()
  ]);
  applyWeddingData(weddingData);
  applyPhotosData(photosData);

  const flipEl = document.getElementById('flipbook');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const pageNum = document.getElementById('page-num');

  let pageFlip = null;
  const pagesBackup = Array.from(document.querySelectorAll('.page'));

  const isMobile = () => window.innerWidth < 768;

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
      flipAudioBuffer = null;
    }
    return flipAudioBuffer;
  }

  function playRecordedFlipSound(ctx, buffer) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.7;
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

    const riffleDuration = 0.16;
    const riffleSize = Math.floor(ctx.sampleRate * riffleDuration);
    const riffleBuffer = ctx.createBuffer(1, riffleSize, ctx.sampleRate);
    const riffleData = riffleBuffer.getChannelData(0);

    for (let i = 0; i < riffleSize; i++) {
      const t = i / riffleSize;
      const decay = Math.pow(1 - t, 1.6);
      const flutter = 0.55 + 0.3 * Math.sin(2 * Math.PI * 42 * t) + 0.15 * Math.sin(2 * Math.PI * 97 * t + 1.3);
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
  }

  let suppressNextFlipSound = false;

  function calcDimensions() {
    const controls = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--control-height'),
      10
    ) || 56;

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
      mobileScrollSupport: false,
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

  let resizeTimer;
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;

  window.addEventListener('resize', () => {
    const focusInField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (focusInField && window.innerWidth === lastW) return;

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!pageFlip) return;
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 80) return;

      lastW = window.innerWidth;
      lastH = window.innerHeight;

      const current = pageFlip.getCurrentPageIndex();
      try { pageFlip.destroy(); } catch (_) {}
      flipEl.innerHTML = '';
      pagesBackup.forEach((node) => flipEl.appendChild(node));
      buildFlipbook(Math.min(current, TOTAL_PAGES - 1));
    }, 250);
  });

  /* ---------- Music ---------- */
  const music = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-btn');
  const musicLabel = musicBtn.querySelector('.music-label');

  const showMusicBtn = () => { musicBtn.hidden = false; };
  music.addEventListener('loadedmetadata', showMusicBtn, { once: true });
  music.addEventListener('canplay', showMusicBtn, { once: true });
  music.addEventListener('error', () => { musicBtn.hidden = true; });
  setTimeout(() => music.load(), 800);

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

  /* ---------- Lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  let lightboxPhotos = [];
  let lightboxIndex = 0;

  function showLightboxPhoto(index) {
    if (!lightboxPhotos.length) return;
    lightboxIndex = (index + lightboxPhotos.length) % lightboxPhotos.length;
    const item = lightboxPhotos[lightboxIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    preloadNeighbours(lightboxIndex);
  }

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

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  /* ---------- RSVP ---------- */
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

  ['mousedown', 'touchstart', 'pointerdown'].forEach((evt) => {
    shell.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
  });
  document.querySelectorAll('.gallery-grid').forEach((grid) => {
    ['mousedown', 'touchstart', 'pointerdown'].forEach((evt) => {
      grid.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
    });
  });

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
      website: (fd.get('website') || '').toString(),
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

  async function deliverEntry(entry) {
    if (RSVP_METHOD === 'endpoint' && RSVP_ENDPOINT) {
        const res = await fetch(RSVP_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: {
                    timestamp: new Date().toISOString(),
                    name: entry.name,
                    attendance: entry.attendance,
                    guests: entry.guests,
                    dietary: entry.dietary
                }
            })
        });

        if (!res.ok) {
            throw new Error('RSVP submission failed');
        }

        return await res.json();
    }

    throw new Error('No RSVP endpoint configured');
}

  function showDone(entry, offline) {
    form.hidden = true;
    done.hidden = false;

    if (entry.attendance === 'Regretfully declines') {
      doneTitle.textContent = 'Thank you for letting us know';
      doneBody.textContent = 'We will miss you, but we are grateful you replied.';
    } else {
      const n = entry.guests;
      doneTitle.textContent = 'We can’t wait to see you!';
      doneBody.textContent = `Your reply is recorded for ${n} ${n === 1 ? 'guest' : 'guests'}. See you on December 18, 2026.`;
    }

    if (offline) {
      doneBody.textContent += ' Saved locally on your device.';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entry = readForm();

    if (entry.website) { showDone(entry, false); return; }
    delete entry.website;

    if (!validate(entry)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    status.classList.remove('is-error');

    if (RSVP_METHOD === 'local') {
      saveLocally(entry);
      showDone(entry, true);
      return;
    }

    try {
      await deliverEntry(entry);
      showDone(entry, false);
    } catch (err) {
      saveLocally(entry);
      showDone(entry, true);
    }
  });

  againBtn.addEventListener('click', () => {
    form.reset();
    clearErrors();
    guestsGroup.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send RSVP';
    done.hidden = true;
    form.hidden = false;
  });
});