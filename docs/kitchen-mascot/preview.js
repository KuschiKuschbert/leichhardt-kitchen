/* Local artwork preview only. No app state, saved data or operational reads. */
(() => {
  'use strict';

  const studyGrid = document.querySelector('.km-studies');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assetRoot = new URL('assets/', document.baseURI);
  const players = new Map();
  const choices = {
    idle: { title: 'Idle', group: 'EVERYDAY', number: '01', description: 'A blink, a little weight shift and a moment between jobs.' },
    welcome: { title: 'Welcome', group: 'EVERYDAY', number: '02', description: 'A friendly wave from your bandana-wearing kitchen cook.' },
    'look-around': { title: 'Look around', group: 'EVERYDAY', number: '03', description: 'A curious glance around the kitchen, then back to you.' },
    'recipe-reading': { title: 'Recipe reading', group: 'EVERYDAY', number: '04', description: 'A quiet moment with the kitchen notebook.' },
    'ready-to-cook': { title: 'Ready to cook', group: 'AT THE GRILL', number: '05', description: 'Spatula ready, feet planted and a confident little smile.' },
    smash: { title: 'Smash', group: 'AT THE GRILL', number: '06', description: 'A firm press on the flat-top for the house smash burger.' },
    flip: { title: 'Flip', group: 'AT THE GRILL', number: '07', description: 'A neat flick of the spatula and a controlled catch.' },
    build: { title: 'Build', group: 'AT THE GRILL', number: '08', description: 'Putting the burger together, one generous layer at a time.' },
    burger: { title: "Serve (Burger's up)", group: 'FROM THE PASS', number: '09', description: 'A generous feed, a proud little nod and a warm welcome.' },
    walk: { title: 'Walk', group: 'EVERYDAY', number: '10', description: 'A few careful steps with the tray, then a steady stop.' },
    smoker: { title: 'At the smoker', group: 'HOUSE SMOKED · EXTRA', number: '+', description: 'A steady hand, a gentle puff and a bit of kitchen pride.' }
  };
  const tabs = Array.from(document.querySelectorAll('[data-select]'));
  let selectedId = 'burger';
  let manifest = {};
  let manifestReady = false;
  let motionWanted = !motionPreference.matches;
  let previewSize = 'compact';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function createArticle(id) {
    const details = choices[id];
    const article = element('article', 'km-study');
    article.dataset.clip = id;
    article.setAttribute('aria-labelledby', 'km-clip-title');
    const heading = element('div', 'km-study-heading');
    heading.append(element('span', 'km-number', details.number), element('span', '', details.group));
    const stage = element('div', 'km-stage');
    const canvas = element('canvas', 'km-canvas');
    canvas.width = 192;
    canvas.height = 256;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `The bandana-wearing star cook: ${details.title}. ${details.description}`);
    const error = element('p', 'km-image-error', `${details.title} image unavailable.`);
    error.hidden = true;
    stage.append(canvas, error);
    const body = element('div', 'km-study-body');
    const title = element('h2', '', details.title);
    title.id = 'km-clip-title';
    const controls = element('div', 'km-playback');
    const play = element('button', 'km-play', 'Play');
    play.type = 'button';
    play.dataset.action = 'toggle';
    play.disabled = true;
    play.setAttribute('aria-label', `Play ${details.title}`);
    const replay = element('button', 'km-replay', 'Replay');
    replay.type = 'button';
    replay.dataset.action = 'replay';
    replay.disabled = true;
    replay.setAttribute('aria-label', `Replay ${details.title}`);
    const status = element('span', 'km-status', 'Preparing animation');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    controls.append(play, replay, status);
    const downloads = element('div', 'km-downloads');
    for (const [extension, name] of [['webp', 'Download WebP'], ['gif', 'Download GIF']]) {
      const link = element('a', '', name);
      link.href = localAsset(`${id}.${extension}`);
      link.download = `${id}.${extension}`;
      downloads.append(link);
    }
    body.append(title, element('p', '', details.description), controls, downloads);
    article.append(heading, stage, body);
    return article;
  }

  function selectClip(id) {
    if (!Object.hasOwn(choices, id)) return false;
    selectedId = id;
    tabs.forEach(tab => {
      const selected = tab.dataset.select === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    studyGrid.setAttribute('aria-labelledby', `tab-${id}`);
    if (!manifestReady) return true;
    players.forEach(player => player.destroy());
    players.clear();
    const article = createArticle(id);
    studyGrid.replaceChildren(article);
    players.set(id, makePlayer(article, manifest.clips?.[id] ?? manifest[id] ?? {}));
    return true;
  }

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
    let disposed = false;
    let still = null;
    let resizeObserver = null;
    let intersectionObserver = null;
    const player = {
      id, ready: false, failed: false, visible: true,
      desiredPlaying: motionWanted,
      index: 0, frames: [], timer: null, image, frameWidth: 0, frameHeight: 0,
      loop: settings.loop !== false, settled: false
    };

    function fitCanvas() {
      if (disposed || !player.ready) return;
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
      if (disposed || !player.ready) return;
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
      const message = player.settled ? 'Settled' : player.desiredPlaying ? 'Playing' : 'Paused';
      // Frame advances do not repeat the same live-region announcement.
      if (status.textContent !== message) status.textContent = message;
    }

    function schedule() {
      clearTimer();
      if (disposed) return;
      paintControls();
      if (!player.ready || player.failed || !player.desiredPlaying || !player.visible || document.hidden) return;
      player.timer = setTimeout(() => {
        if (!player.loop && player.index === player.frames.length - 1) {
          player.settled = true;
          player.desiredPlaying = false;
          schedule();
          return;
        }
        player.index = (player.index + 1) % player.frames.length;
        drawFrame();
        schedule();
      }, player.frames[player.index].duration);
    }

    function play() {
      if (player.settled) {
        player.index = 0;
        player.settled = false;
        drawFrame();
      }
      motionWanted = true;
      player.desiredPlaying = true;
      schedule();
    }

    function pause() {
      motionWanted = false;
      player.desiredPlaying = false;
      schedule();
    }

    toggle.addEventListener('click', () => player.desiredPlaying ? pause() : play());
    replay.addEventListener('click', () => {
      player.index = 0;
      player.settled = false;
      drawFrame();
      play();
    });

    function unavailable() {
      if (disposed) return;
      player.failed = true;
      player.desiredPlaying = false;
      clearTimer();
      toggle.disabled = true;
      replay.disabled = true;
      still = new Image();
      still.onload = () => {
        if (disposed) return;
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
        if (disposed) return;
        canvas.hidden = true;
        error.hidden = false;
        status.textContent = 'Image unavailable';
      };
      try { still.src = localAsset(settings.poster, `${id}-still.png`); }
      catch (_) { still.onerror(); }
    }

    image.onload = () => {
      if (disposed) return;
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

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(fitCanvas);
      resizeObserver.observe(stage);
    }
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(entries => {
        if (disposed) return;
        player.visible = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0 });
      intersectionObserver.observe(stage);
    }
    function destroy() {
      disposed = true;
      clearTimer();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      image.onload = null;
      image.onerror = null;
      image.src = '';
      if (still) {
        still.onload = null;
        still.onerror = null;
        still.src = '';
      }
    }
    Object.assign(player, { play, pause, schedule, fitCanvas, drawFrame, destroy });
    return player;
  }

  function updateMotionNote() {
    document.getElementById('km-motion-note').textContent = motionPreference.matches
      ? 'Reduced motion is on. The artwork stays still until you choose Play.'
      : previewSize === 'large'
        ? 'Close-up shows the full-size artwork where there is room. On smaller screens it stays fitted to the page.'
        : 'Short movements, then a moment to settle. Choose a moment, then play it at your own pace.';
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
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectClip(tab.dataset.select));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs.forEach((other, i) => { other.tabIndex = i === next ? 0 : -1; });
      tabs[next].focus();
      // Manual activation: arrow keys browse names without loading artwork.
    });
  });
  motionPreference.addEventListener('change', () => {
    updateMotionNote();
    // A preference change never starts motion that the user paused.
    if (motionPreference.matches) {
      motionWanted = false;
      players.forEach(player => player.pause());
    }
  });
  updateMotionNote();

  fetch(new URL('manifest.json', assetRoot)).then(response => response.ok ? response.json() : {})
    .catch(() => ({})).then(data => {
      manifest = data && typeof data === 'object' ? data : {};
      manifestReady = true;
      selectClip(selectedId);
    });

  // Read-only state and explicit controls for browser verification and capture.
  window.mascotPreview = {
    selected: () => selectedId,
    choices: () => Object.keys(choices),
    select: selectClip,
    state: () => Array.from(players.values(), player => ({
      id: player.id, ready: player.ready, failed: player.failed, frame: player.index,
      frames: player.frames.length, playing: player.desiredPlaying, visible: player.visible,
      scheduled: player.timer !== null, loop: player.loop, settled: player.settled
    })),
    play: id => players.get(id)?.play(),
    pause: id => players.get(id)?.pause(),
    showFrame: (id, frame) => {
      const player = players.get(id);
      if (!player || !Number.isInteger(frame) || frame < 0 || frame >= player.frames.length) return false;
      player.settled = false;
      player.pause();
      player.index = frame;
      player.drawFrame();
      return true;
    }
  };
})();
