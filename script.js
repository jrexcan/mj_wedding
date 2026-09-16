document.addEventListener('DOMContentLoaded', () => {
  let pageFlip = null;

  function calculateDimensions() {
    const isMobile = window.innerWidth < 768;
    const availWidth = window.innerWidth;
    const availHeight = window.innerHeight - 60;

    let width, height;

    if (isMobile) {
      width = Math.min(availWidth - 16, 420);
      height = Math.min(availHeight - 10, 680);
    } else {
      width = Math.min((availWidth - 40) / 2, 450);
      height = Math.min(availHeight - 20, 650);
    }

    return { width, height, isMobile };
  }

  function triggerPageAnimations(pageIndex) {
    const pages = document.querySelectorAll('.page');
    const isMobile = window.innerWidth < 768;

    pages.forEach((p, idx) => {
      // In single-page mode (mobile or cover view), target current page only.
      // In two-page spread mode, target both left and right active pages.
      if (idx === pageIndex || (!isMobile && idx === pageIndex + 1)) {
        p.classList.add('page-active');
      } else {
        p.classList.remove('page-active');
      }
    });
  }

  function initFlipbook() {
    const dims = calculateDimensions();

    pageFlip = new St.PageFlip(
      document.getElementById('flipbook'),
      {
        width: dims.width,
        height: dims.height,
        size: 'fixed',
        minWidth: 260,
        maxWidth: 500,
        minHeight: 380,
        maxHeight: 750,
        maxShadowOpacity: 0.4,
        showCover: true,
        showPageCorners: true,
        usePortrait: dims.isMobile,
        mobileScrollSupport: true,
        clickEventForward: true
      }
    );

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    setTimeout(() => {
      triggerPageAnimations(0);
    }, 300);

    pageFlip.on('flip', (e) => {
      const currentPage = e.data + 1;
      const totalPages = pageFlip.getPageCount();
      document.getElementById('page-num').innerText = `Page ${currentPage} / ${totalPages}`;
      triggerPageAnimations(e.data);
    });
  }

  initFlipbook();

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (pageFlip) pageFlip.flipPrev();
  });
  document.getElementById('next-btn').addEventListener('click', () => {
    if (pageFlip) pageFlip.flipNext();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (pageFlip) {
        const dims = calculateDimensions();
        pageFlip.update({
          width: dims.width,
          height: dims.height,
          usePortrait: dims.isMobile
        });
        triggerPageAnimations(pageFlip.getCurrentPageIndex());
      }
    }, 200);
  });

  // Background Music Toggle
  const musicBtn = document.getElementById('music-btn');
  const bgMusic = document.getElementById('bg-music');
  let isPlaying = false;

  musicBtn.addEventListener('click', () => {
    if (isPlaying) {
      bgMusic.pause();
      musicBtn.innerText = '🎵 Play Song';
    } else {
      bgMusic.play().then(() => {
        musicBtn.innerText = '⏸️ Pause Song';
      }).catch(err => {
        console.log("Audio playback blocked:", err);
      });
    }
    isPlaying = !isPlaying;
  });

  // RSVP Submission
  const rsvpForm = document.getElementById('rsvp-form');
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Thank you! Your RSVP response has been submitted.');
      rsvpForm.reset();
    });
  }
});