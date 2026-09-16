/* ============================================================
   Mary & J-Rex — invitation logic
   ============================================================

   SET THIS ONE VALUE to start collecting real RSVPs.
   Paste the Google Apps Script web app URL from SETUP.md below.
   While it is empty, replies are saved in the guest's own browser
   only, and the page says so honestly instead of pretending.
   ============================================================ */
const RSVP_ENDPOINT = '';

const TOTAL_PAGES = 9;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadWeddingData() {
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
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
    if (data.couple.partner1 && data.couple.partner2) {
      set('couple-names',
        `${escapeHtml(data.couple.partner1)} <span class="amp">&amp;</span> ${escapeHtml(data.couple.partner2)}`);
    }
    if (data.couple.displayDate) {
      document.querySelectorAll('.js-wedding-date')
        .forEach((el) => { el.textContent = data.couple.displayDate; });
    }
  }

  // Parents & principal honors
  if (data.parents && data.honorAttendants) {
    set('parents-honors', `
      <p class="role-title">Parents of the groom</p>
      <p>${escapeHtml(data.parents.groom.join(' &amp; '))}</p>
      <p class="role-title">Parents of the bride</p>
      <p>${escapeHtml(data.parents.bride.join(' &amp; '))}</p>
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

  // Little attendants, paired
  if (Array.isArray(data.littleAttendants)) {
    set('little-attendants-list', data.littleAttendants.map((a) => {
      const bearer = [a.bearerRole, a.bearerName].filter(Boolean).join(' ');
      return `<p>${escapeHtml(a.flowerGirl)} \u00b7 ${escapeHtml(bearer)}</p>`;
    }).join(''));
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

document.addEventListener('DOMContentLoaded', async () => {
  /* ---------------------------------------------------------
     Names, entourage & venue — loaded from data.json so the
     couple can edit one file instead of touching any markup.
     If it can't be loaded (e.g. opened as a local file:// page
     without a server), the placeholder text already in the HTML
     is left exactly as it is.
     --------------------------------------------------------- */
  const weddingData = await loadWeddingData();
  applyWeddingData(weddingData);

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
      markActivePage(e.data);
      updateControls(e.data);
    });

    if (startIndex > 0) {
      pageFlip.turnToPage(startIndex);
    }

    requestAnimationFrame(() => {
      markActivePage(startIndex);
      updateControls(startIndex);
    });
  }

  buildFlipbook(0);

  prevBtn.addEventListener('click', () => pageFlip && pageFlip.flipPrev());
  nextBtn.addEventListener('click', () => pageFlip && pageFlip.flipNext());

  document.addEventListener('keydown', (e) => {
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
  music.addEventListener('canplay', () => { musicBtn.hidden = false; }, { once: true });
  music.addEventListener('error', () => { musicBtn.hidden = true; });
  music.load();

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
  // tapping a field can start a page turn instead of focusing it.
  ['mousedown', 'touchstart', 'pointerdown'].forEach((evt) => {
    shell.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
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

    if (!RSVP_ENDPOINT) {
      saveLocally(entry);
      showDone(entry, true);
      return;
    }

    try {
      await sendToServer(entry);
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
    if (!RSVP_ENDPOINT) return;
    let list;
    try {
      list = JSON.parse(localStorage.getItem('rsvp-pending') || '[]');
    } catch (_) { return; }
    if (!list.length) return;

    const remaining = [];
    for (const entry of list) {
      try { await sendToServer(entry); } catch (_) { remaining.push(entry); }
    }
    try { localStorage.setItem('rsvp-pending', JSON.stringify(remaining)); } catch (_) {}
  }

  flushPending();
  window.addEventListener('online', flushPending);
});
