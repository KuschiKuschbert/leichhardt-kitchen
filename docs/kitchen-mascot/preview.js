/* Local artwork preview only. No app state, saved data or operational reads. */
(() => {
  'use strict';

  const studyGrid = document.querySelector('.km-studies');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assetRoot = new URL('assets/', document.baseURI);
  const players = new Map();
  let previewSize = 'compact';

  function localAsset(path, fallback) {
    const url = new URL(typeof path === 'string' ? path : fallback, assetRoot);
    if (url.origin !== assetRoot.origin || !url.pathname.startsWith(assetRoot.pathname)) {
      throw new Error('Preview assets must stay in the local assets folder.');
    }
    return url.href;
  }

  function duration(value, fallback) {
    return Number.isFinite(value) && value >= 40 && value <= 10000 ? value : fallback;
  }

  function makePlayer(article, settings) {
    const id = article.dataset.clip;
    const canvas = article.querySelector('canvas');
    const context = canvas.getContext('2d');
    const stage = article.querySelector('.km-stage');
    const toggle = article.querySelector('[data-action="toggle"]');
    const replay = article.querySelector('[data-action="replay"]');
    const status = article.querySelector('.km-status');
    const error = article.querySelector('.km-image-error');
    const title = article.querySelector('h2').textContent;
    const image = new Image();
    const player = {
      id, ready: false, failed: false, visible: true,
      desiredPlaying: !motionPreference.matches,
      index: 0, frames: [], timer: null, image, frameWidth: 0, frameHeight: 0
    };

    function fitCanvas() {
      if (!player.ready) return;
      const wanted = previewSize === 'large' ? Math.max(player.frameWidth, 384) : 192;
      const availableWidth = Math.max(1, Math.floor(stage.clientWidth - 24));
      const availableHeight = Math.max(1, Math.floor(stage.clientHeight - 24));
      const limit = Math.min(wanted / player.frameWidth,
        availableWidth / player.frameWidth, availableHeight / player.frameHeight);
      // Enlarge by whole pixels; a large source is shown at a reciprocal whole scale.
      const scale = limit >= 1 ? Math.max(1, Math.floor(limit)) : 1 / Math.ceil(1 / limit);
      canvas.style.width = `${Math.round(player.frameWidth * scale)}px`;
      canvas.style.height = `${Math.round(player.frameHeight * scale)}px`;
    }

    function drawFrame() {
      if (!player.ready) return;
      const frame = player.frames[player.index];
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(player.image, frame.x, frame.y, frame.width, frame.height,
        0, 0, canvas.width, canvas.height);
      canvas.dataset.frame = String(player.index);
    }

    function clearTimer() {
      if (player.timer !== null) clearTimeout(player.timer);
      player.timer = null;
    }

    function paintControls() {
      const label = player.desiredPlaying ? 'Pause' : 'Play';
      if (toggle.textContent !== label) toggle.textContent = label;
      if (toggle.getAttribute('aria-label') !== `${label} ${title}`) toggle.setAttribute('aria-label', `${label} ${title}`);
      if (!player.ready || player.failed) return;
      const message = player.desiredPlaying ? 'Playing' : 'Paused';
      // Frame advances do not repeat the same live-region announcement.
      if (status.textContent !== message) status.textContent = message;
    }

    function schedule() {
      clearTimer();
      paintControls();
      if (!player.ready || player.failed || !player.desiredPlaying || !player.visible || document.hidden) return;
      player.timer = setTimeout(() => {
        player.index = (player.index + 1) % player.frames.length;
        drawFrame();
        schedule();
      }, player.frames[player.index].duration);
    }

    function play() {
      player.desiredPlaying = true;
      schedule();
    }

    function pause() {
      player.desiredPlaying = false;
      schedule();
    }

    toggle.addEventListener('click', () => player.desiredPlaying ? pause() : play());
    replay.addEventListener('click', () => {
      player.index = 0;
      drawFrame();
      play();
    });

    function unavailable() {
      player.failed = true;
      player.desiredPlaying = false;
      clearTimer();
      toggle.disabled = true;
      replay.disabled = true;
      const still = new Image();
      still.onload = () => {
        player.image = still;
        player.frameWidth = still.width;
        player.frameHeight = still.height;
        player.frames = [{ x: 0, y: 0, width: still.width, height: still.height, duration: 1000 }];
        player.index = 0;
        player.ready = true;
        canvas.width = still.width;
        canvas.height = still.height;
        fitCanvas();
        drawFrame();
        status.textContent = 'Still image';
      };
      still.onerror = () => {
        canvas.hidden = true;
        error.hidden = false;
        status.textContent = 'Image unavailable';
      };
      try { still.src = localAsset(settings.poster, `${id}-still.png`); }
      catch (_) { still.onerror(); }
    }

    image.onload = () => {
      try {
        const columns = Number.isInteger(settings.columns) && settings.columns > 0 ? settings.columns : 4;
        const rows = Number.isInteger(settings.rows) && settings.rows > 0 ? settings.rows : 2;
        const gridWidth = image.naturalWidth / columns;
        const gridHeight = image.naturalHeight / rows;
        let frames;
        if (Array.isArray(settings.frames) && settings.frames.length && typeof settings.frames[0] === 'object') {
          frames = settings.frames.map(frame => ({
            x: frame.x, y: frame.y, width: frame.width ?? frame.w, height: frame.height ?? frame.h,
            duration: duration(frame.duration ?? frame.durationMs, 180)
          }));
        } else {
          const count = Number.isInteger(settings.frameCount) ? settings.frameCount : columns * rows;
          const sequence = Array.isArray(settings.sequence) ? settings.sequence : Array.from({ length: count }, (_, i) => i);
          frames = sequence.map((frameIndex, i) => ({
            x: (frameIndex % columns) * gridWidth,
            y: Math.floor(frameIndex / columns) * gridHeight,
            width: gridWidth, height: gridHeight,
            duration: duration(settings.durations?.[i] ?? settings.durationMs?.[i], i === 0 ? 1100 : 180)
          }));
        }
        if (!frames.length || frames.some(frame => ![frame.x, frame.y, frame.width, frame.height].every(Number.isInteger)
          || frame.x < 0 || frame.y < 0 || frame.width < 1 || frame.height < 1
          || frame.x + frame.width > image.naturalWidth || frame.y + frame.height > image.naturalHeight
          || frame.width !== frames[0].width || frame.height !== frames[0].height)) {
          throw new Error('Invalid sprite frame grid.');
        }
        player.frames = frames;
        player.frameWidth = frames[0].width;
        player.frameHeight = frames[0].height;
        player.index = Number.isInteger(settings.posterFrame) && settings.posterFrame >= 0 && settings.posterFrame < frames.length ? settings.posterFrame : 0;
        canvas.width = player.frameWidth;
        canvas.height = player.frameHeight;
        player.ready = true;
        toggle.disabled = false;
        replay.disabled = false;
        fitCanvas();
        drawFrame();
        schedule();
      } catch (_) { unavailable(); }
    };
    image.onerror = unavailable;
    try { image.src = localAsset(settings.sheet ?? settings.src, `${id}-sheet.png`); }
    catch (_) { unavailable(); }

    if ('ResizeObserver' in window) new ResizeObserver(fitCanvas).observe(stage);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        player.visible = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0 }).observe(stage);
    }
    Object.assign(player, { play, pause, schedule, fitCanvas, drawFrame });
    return player;
  }

  function updateMotionNote() {
    document.getElementById('km-motion-note').textContent = motionPreference.matches
      ? 'Reduced motion is on. The artwork stays still until you choose Play.'
      : previewSize === 'large'
        ? 'Close-up shows the full-size artwork where there is room. On smaller screens it stays fitted to the page.'
        : 'Short movements, then a moment to settle. Pause either animation whenever you like.';
  }

  document.querySelectorAll('[data-surface]').forEach(button => {
    if (button.tagName !== 'BUTTON') return;
    button.addEventListener('click', () => {
      studyGrid.dataset.surface = button.dataset.surface;
      document.querySelectorAll('button[data-surface]').forEach(other => {
        other.setAttribute('aria-pressed', String(other === button));
      });
    });
  });

  document.querySelectorAll('button[data-size]').forEach(button => {
    button.addEventListener('click', () => {
      previewSize = button.dataset.size;
      studyGrid.dataset.size = previewSize;
      document.querySelectorAll('button[data-size]').forEach(other => {
        other.setAttribute('aria-pressed', String(other === button));
      });
      players.forEach(player => player.fitCanvas());
      updateMotionNote();
    });
  });

  document.addEventListener('visibilitychange', () => players.forEach(player => player.schedule()));
  motionPreference.addEventListener('change', () => {
    updateMotionNote();
    // A preference change never starts motion that the user paused.
    if (motionPreference.matches) players.forEach(player => player.pause());
  });
  updateMotionNote();

  fetch(new URL('manifest.json', assetRoot)).then(response => response.ok ? response.json() : {})
    .catch(() => ({})).then(manifest => {
      document.querySelectorAll('[data-clip]').forEach(article => {
        const id = article.dataset.clip;
        players.set(id, makePlayer(article, manifest.clips?.[id] ?? manifest[id] ?? {}));
      });
    });

  // Read-only state and explicit controls for browser verification and capture.
  window.mascotPreview = {
    state: () => Array.from(players.values(), player => ({
      id: player.id, ready: player.ready, failed: player.failed, frame: player.index,
      frames: player.frames.length, playing: player.desiredPlaying, visible: player.visible,
      scheduled: player.timer !== null
    })),
    play: id => players.get(id)?.play(),
    pause: id => players.get(id)?.pause(),
    showFrame: (id, frame) => {
      const player = players.get(id);
      if (!player || !Number.isInteger(frame) || frame < 0 || frame >= player.frames.length) return false;
      player.pause();
      player.index = frame;
      player.drawFrame();
      return true;
    }
  };
})();
