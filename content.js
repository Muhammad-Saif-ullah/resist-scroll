(() => {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  let shortIndex    = 0;    // shorts navigated so far (0 = first short)
  let pressesNeeded = 10;   // presses required for current short
  let pressesLeft   = 10;   // presses remaining
  let blocked       = false; // true while barrier is active

  // Track which direction to navigate when counter hits 0
  let pendingDirection = null; // 'up' | 'down'

  function pressesForIndex(idx) {
    return (idx + 1) * 10;
  }

  // ─── Overlay UI ───────────────────────────────────────────────────────────
  let overlay = null;
  let countEl = null;
  let labelEl = null;
  let barEl   = null;

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'srt-overlay';
    overlay.innerHTML = `
      <div id="srt-panel">
        <div id="srt-icon">🧠</div>
        <div id="srt-count">10</div>
        <div id="srt-label">presses left</div>
        <div id="srt-bar-wrap"><div id="srt-bar"></div></div>
        <div id="srt-sub">Resist the scroll</div>
      </div>
    `;
    document.body.appendChild(overlay);
    countEl = document.getElementById('srt-count');
    labelEl = document.getElementById('srt-label');
    barEl   = document.getElementById('srt-bar');
  }

  function showOverlay() {
    if (!overlay) createOverlay();
    overlay.classList.remove('srt-hidden');
    overlay.classList.add('srt-visible');
    updateOverlay();
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.classList.remove('srt-visible');
    overlay.classList.add('srt-hidden');
  }

  function updateOverlay() {
    if (!countEl) return;
    countEl.textContent = pressesLeft;
    labelEl.textContent = pressesLeft === 1 ? 'press left' : 'presses left';
    const pct = ((pressesNeeded - pressesLeft) / pressesNeeded) * 100;
    barEl.style.width = pct + '%';
    const hue = Math.round(120 - (pct / 100) * 120);
    barEl.style.background = `hsl(${hue}, 90%, 55%)`;
  }

  function flashCount() {
    if (!countEl) return;
    countEl.classList.remove('srt-pulse');
    void countEl.offsetWidth;
    countEl.classList.add('srt-pulse');
  }

  // ─── Fire the actual YouTube navigation ───────────────────────────────────
  function fireNavigation(direction) {
    const key     = direction === 'down' ? 'ArrowDown' : 'ArrowUp';
    const keyCode = direction === 'down' ? 40 : 38;
    const evt = new KeyboardEvent('keydown', {
      key, code: key, keyCode, which: keyCode,
      bubbles: true, cancelable: true
    });
    evt._srtPassthrough = true;
    document.dispatchEvent(evt);
  }

  function fireButtonClick(direction) {
    const sel = direction === 'down'
      ? '#navigation-button-down button'
      : '#navigation-button-up button';
    const btn = document.querySelector(sel);
    if (!btn) return;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    evt._srtPassthrough = true;
    btn.dispatchEvent(evt);
  }

  // ─── Core navigation attempt handler ──────────────────────────────────────
  function handleNavAttempt(direction) {
    if (!blocked) {
      // First press on this short — set up the barrier
      blocked          = true;
      pressesNeeded    = pressesForIndex(shortIndex);
      pressesLeft      = pressesNeeded;
      pendingDirection = direction;
      showOverlay();
    } else {
      // Update direction in case user switched (e.g. up → down)
      pendingDirection = direction;
    }

    pressesLeft--;
    flashCount();
    updateOverlay();

    if (pressesLeft <= 0) {
      // Barrier cleared — allow navigation
      blocked = false;
      shortIndex++;
      hideOverlay();

      const dir = pendingDirection;
      pendingDirection = null;

      setTimeout(() => {
        fireNavigation(dir);
        // Belt-and-suspenders: also click the button in case key event doesn't work
        setTimeout(() => fireButtonClick(dir), 50);
      }, 80);
    }
  }

  // ─── Keyboard interception ────────────────────────────────────────────────
  // Block keydown entirely (prevents hold-repeat from reaching YouTube).
  document.addEventListener('keydown', (e) => {
    if (e._srtPassthrough) return; // our own passthrough — let it reach YouTube
    if (!location.pathname.startsWith('/shorts/')) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    e.stopImmediatePropagation();
    e.preventDefault();
    // Count happens on keyup, not here
  }, true);

  // Count only on keyup — fires exactly once per physical key press, never on hold.
  document.addEventListener('keyup', (e) => {
    if (e._srtPassthrough) return;
    if (!location.pathname.startsWith('/shorts/')) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    e.stopImmediatePropagation();
    e.preventDefault();

    handleNavAttempt(e.key === 'ArrowDown' ? 'down' : 'up');
  }, true);

  // ─── Button click interception ────────────────────────────────────────────
  function interceptButtons() {
    const targets = [
      { sel: '#navigation-button-up button',   dir: 'up'   },
      { sel: '#navigation-button-down button', dir: 'down' },
    ];

    targets.forEach(({ sel, dir }) => {
      const btn = document.querySelector(sel);
      if (!btn || btn._srtHooked) return;
      btn._srtHooked = true;

      btn.addEventListener('click', (e) => {
        if (e._srtPassthrough) return; // our own fired click — pass through
        e.stopImmediatePropagation();
        e.preventDefault();
        handleNavAttempt(dir);
      }, true);
    });
  }

  // ─── SPA URL change detection ─────────────────────────────────────────────
  let lastPath = location.pathname;

  function onPathChange() {
    const newPath = location.pathname;
    if (newPath === lastPath) return;
    lastPath = newPath;

    if (!newPath.startsWith('/shorts/')) {
      hideOverlay();
      return;
    }

    // New short loaded — reset barrier state (shortIndex already incremented)
    blocked = false;
    hideOverlay();
    setTimeout(interceptButtons, 600);
  }

  const origPush    = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  history.pushState    = (...a) => { origPush(...a);    onPathChange(); };
  history.replaceState = (...a) => { origReplace(...a); onPathChange(); };
  window.addEventListener('popstate', onPathChange);

  const observer = new MutationObserver(() => {
    interceptButtons();
    onPathChange();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(interceptButtons, 1000);
})();