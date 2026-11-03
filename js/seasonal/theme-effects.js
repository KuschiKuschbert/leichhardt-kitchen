/* Native seasonal motion. Still/Off, reduced motion and tab pause take precedence. */
(function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ownedSelector = '.kb-motion-target,.complete-particle,.kb-hang-item,.kb-motion-addon path,.kb-ambient-motion,.kb-saber-blade,.kb-horse-leg,.kb-horse-tail,.kb-clover-leaf,.kb-ambient-detail,.kb-navbar-particle,.kb-nav-horizon';
  let current = { theme: null, mode: 'still', density: 'festive', surface: 'work' }, paused = false, resizeTimer = 0, replayRevision = 0, navbarObserver = null;
  const normalize = {
    kites: 'kite', 'diya-glow': 'glow', garland: 'sway', penjor: 'sway', lanterns: 'sway', eggs: 'rock', rosette: 'sway', racing: 'march',
    'memorial-glow': 'glow', 'vigil-halo': 'glow', 'candle-glow': 'glow', 'care-light': 'glow', 'civic-light': 'glow', 'horizon-breathe': 'glow',
    'manuscript-light': 'glow', 'metal-glint': 'glow', 'moon-halo': 'glow', 'offering-glow': 'glow', 'reflective-breathe': 'glow', 'shield-glow': 'glow',
    'cloth-sway': 'sway', 'leaf-sway': 'sway', 'lily-sway': 'sway', 'ribbon-sway': 'sway', 'tool-sway': 'sway', 'book-turn': 'rock', 'page-edge': 'rock',
    'water-ripple': 'wave', 'paper-glide': 'march', 'calm-sweep': 'march', 'document-reveal': 'march', 'path-progress': 'march', 'writing-trace': 'march', 'wheel-turn': 'orbit'
  };
  const particleEffects = new Set(['snow', 'petals', 'leaves', 'hearts', 'confetti', 'stars', 'kite', 'powder']);
  const branded = markup => window.KB_THEME_BRAND ? KB_THEME_BRAND.style(markup) : markup;
  function svg(body, w = 32, h = 40) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" fill="none" stroke="#1c1d1f" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>'; }
  const particles = {
    petals: svg('<path d="M16 5C34 1 31 26 16 34C1 26-2 1 16 5Z" fill="#dea247"/>'),
    leaves: svg('<path d="M16 3C40 14 24 33 16 37C8 33-8 14 16 3Z" fill="#7e986a"/><path d="M16 8v27"/>'),
    hearts: svg('<path d="M16 12C5-5-9 14 16 35C41 14 27-5 16 12Z" fill="#c96e71"/>'),
    confetti: svg('<path d="M4 5h7v14H4Z" fill="#e4b255"/><path d="M20 5l7 7-7 7-7-7Z" fill="#c86945"/><path d="M14 25l9 8" stroke="#75916b" stroke-width="3"/>'),
    stars: svg('<path d="M16 3l4 10 11 1-8 8 2 11-9-6-9 6 2-11-8-8 11-1Z" fill="#ebc879"/>'),
    kite: svg('<path d="M16 2L30 17 16 33 2 17Z" fill="#c7643e"/><path d="M16 2v31M2 17h28M16 33q-9 4 0 7" stroke="#e9c474"/>'),
    powder: svg('<circle cx="16" cy="18" r="13" fill="currentColor" opacity=".5" stroke="none"/><circle cx="4" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="29" cy="33" r="3" fill="currentColor" stroke="none"/>')
  };
  // Explicit ambient direction for every main family, regional style and calendar companion.
  // Religious figures and sacred objects remain in the selected artwork, never disposable confetti.
  const ambientDesigns = {
    'snow': { label: 'Snow drifting across the app', motifs: ['snow'], motion: 'fall', count: 40 },
    'eggs-petals': { label: 'Patterned Easter eggs and spring petals drifting through the book', motifs: ['egg', 'pink-petal', 'cream-petal'], motion: 'flutter', count: 15 },
    'new-year-streamers': { label: 'Warm paper streamers and slow chalk-star glints', motifs: ['streamer', 'star', 'confetti'], motion: 'fall', count: 18 },
    'hearts': { label: 'Outlined hearts rising through the app', motifs: ['heart'], motion: 'rise', count: 18 },
    'bouquet-petals': { label: 'Paper-tone bouquet petals with botanical sprigs', motifs: ['pink-petal', 'cream-petal', 'sprig'], motion: 'flutter', count: 17 },
    'steam-ribbons': { label: 'Coffee steam curls and appreciation ribbons at the margins', motifs: ['steam', 'ribbon'], motion: 'rise', count: 12 },
    'horses': { label: 'Galloping racehorses and outlined horseshoes along the lower book edge', motifs: ['horse', 'horseshoe'], motion: 'race', count: 6 },
    'ghosts-bats': { label: 'Friendly ghosts float up while small bats drift at the edges', motifs: ['ghost', 'bat'], motion: 'rise', count: 9 },
    'lightsabers': { label: 'Lightsabers ignite and sweep beside a slowly twinkling starfield', motifs: ['saber', 'star', 'star'], motion: 'space', count: 12 },
    'coffee-beans': { label: 'Coffee beans turn slowly between rising steam wisps', motifs: ['bean', 'steam', 'steam'], motion: 'rise', count: 15 },
    'kitchen-herbs': { label: 'Herb sprigs drift between cooking steam curls', motifs: ['herb', 'steam'], motion: 'rise', count: 14 },
    'four-leaf-clovers': { label: 'Four separate heart-shaped leaves on drifting lucky clovers', motifs: ['clover'], motion: 'flutter', count: 16 },
    'grain-leaves': { label: 'Grain sprigs and produce leaves moving at the book margins', motifs: ['grain', 'leaf'], motion: 'flutter', count: 14 },
    'diya-lights': { label: 'Stationary diyas breathe warmly while diya flames and light motes rise', motifs: ['flame', 'mote', 'flame'], motion: 'rise', count: 18, ornaments: ['diya', 'diya'] },
    'powder': { label: 'Holi powder drifting and dispersing in Kitchenbook chalk tones', motifs: ['powder'], motion: 'powder', count: 16 },
    'pongal-harvest': { label: 'Sugarcane leaves, rice grains and steam above an edge rice pot', motifs: ['rice', 'cane-leaf', 'steam'], motion: 'rise', count: 14, ornaments: ['rice-pot', 'cane'] },
    'pookkalam-petals': { label: 'Marigold petals drift beside circular pookkalam flower patterns', motifs: ['marigold-petal', 'cream-petal', 'marigold-petal'], motion: 'flutter', count: 20, ornaments: ['pookkalam', 'pookkalam'] },
    'modak-marigold': { label: 'Marigold petals and rising steam beside a modak offering plate', motifs: ['marigold-petal', 'steam'], motion: 'rise', count: 15, ornaments: ['modak'] },
    'dandiya-ribbons': { label: 'Paired dandiya sticks and coloured ribbons moving at the margins', motifs: ['ribbon', 'streamer'], motion: 'flutter', count: 12, ornaments: ['dandiya', 'dandiya'] },
    'puja-flowers': { label: 'White shiuli-like flowers with saffron centres drift beside a gently pulsing dhak', motifs: ['shiuli', 'cream-petal'], motion: 'flutter', count: 17, ornaments: ['dhak'] },
    'dussehra-leaves': { label: 'Shami-like compound leaves and warm chalk glints', motifs: ['compound-leaf', 'mote'], motion: 'flutter', count: 14 },
    'dashain-kites': { label: 'Diamond kites glide upward with trailing tails', motifs: ['kite'], motion: 'kite', count: 5 },
    'tihar-garlands': { label: 'Anchored marigold garlands sway above diyas while marigold heads and flames rise', motifs: ['marigold', 'flame'], motion: 'rise', count: 14, ornaments: ['marigold-string', 'diya', 'marigold-string'] },
    'baisakh-leaves': { label: 'Fresh Baisakh leaves and warm paper ribbons', motifs: ['leaf', 'streamer'], motion: 'flutter', count: 16 },
    'lotus-ripples': { label: 'Pale lotus petals drifting over quiet widening water ripples', motifs: ['lotus-petal', 'lotus-petal', 'mote'], motion: 'quiet', count: 10, ornaments: ['ripple', 'lotus'] },
    'quiet-night': { label: 'A slow moonlit horizon and gently brightening stars for Nyepi', motifs: ['night-star'], motion: 'twinkle', count: 9, horizon: true },
    'penjor-breeze': { label: 'Anchored penjor and coconut-leaf fringes sway in a quiet breeze', motifs: ['mote'], motion: 'rise', count: 9, ornaments: ['penjor', 'penjor'] },
    'kuningan-ornaments': { label: 'Outlined tamiang and woven palm-leaf ornaments sway with warm motes', motifs: ['mote'], motion: 'rise', count: 11, ornaments: ['tamiang', 'endongan', 'tamiang'] },
    'lanterns': { label: 'Hanging lanterns sway above drifting plum blossom and warm glints', motifs: ['blossom', 'mote'], motion: 'rise', count: 13, ornaments: ['lantern', 'lantern'] },
    'eid-fitr-lights': { label: 'Warm stars and small crescents drift around a gentle crescent light', motifs: ['star', 'small-crescent'], motion: 'rise', count: 14, ornaments: ['crescent'] },
    'eid-adha-light': { label: 'Prayer-arch light and slow warm motes', motifs: ['mote', 'star'], motion: 'quiet', count: 12, ornaments: ['arch', 'arch'] },
    'sinulog-flow': { label: 'Flowing water-step ribbons with quiet candle glints', motifs: ['water-ribbon', 'mote'], motion: 'step', count: 12 },
    'kiping': { label: 'Colourful leaf-shaped kiping strings sway at the book edges', motifs: ['mote'], motion: 'rise', count: 9, ornaments: ['kiping', 'kiping', 'kiping'] },
    'panagbenga-flowers': { label: 'Outlined flowers and warm paper-tone petals tumbling slowly', motifs: ['flower', 'pink-petal', 'marigold-petal'], motion: 'flutter', count: 20 },
    'kadayawan-harvest': { label: 'Harvest leaves moving beside durian and mangosteen ornaments', motifs: ['leaf', 'sprig'], motion: 'flutter', count: 14, ornaments: ['durian', 'mangosteen'] },
    'philippine-ribbons': { label: 'Eight-ray sun glints and flowing paper ribbons', motifs: ['sun', 'civic-ribbon'], motion: 'ribbon', count: 14 },
    'pasko-parol': { label: 'Hanging parol stars and tails with warm Christmas twinkles', motifs: ['star', 'mote'], motion: 'twinkle', count: 12, ornaments: ['parol', 'parol'] },
    'salubong-dawn': { label: 'Pale petals drift through a softly moving dawn light', motifs: ['cream-petal', 'lotus-petal', 'mote'], motion: 'quiet', count: 14, dawn: true },
    'easter-petals': { label: 'Pale Easter petals drifting with gentle warm light', motifs: ['cream-petal', 'pink-petal', 'mote'], motion: 'flutter', count: 14 }
  };
  const ambientById = {};
  function assignAmbient(preset, ids) { ids.forEach(id => { ambientById[id] = preset; }); }
  assignAmbient('snow', ['au-christmas-day', 'au-christmas-eve', 'au-boxing-day', 'in-christmas', 'np-christmas', 'bali-christmas']);
  assignAmbient('pasko-parol', ['ph-christmas-day']);
  assignAmbient('eggs-petals', ['au-easter-sunday']);
  assignAmbient('salubong-dawn', ['ph-salubong', 'ph-easter']);
  assignAmbient('easter-petals', ['in-easter', 'bali-easter']);
  assignAmbient('new-year-streamers', ['au-new-years-day', 'au-new-years-eve', 'ph-new-years-day', 'ph-new-years-eve', 'bali-new-year']);
  assignAmbient('hearts', ['fun-valentines-day']);
  assignAmbient('bouquet-petals', ['au-mothers-day']);
  assignAmbient('steam-ribbons', ['au-fathers-day']);
  assignAmbient('horses', ['au-melbourne-cup']);
  assignAmbient('ghosts-bats', ['fun-halloween']);
  assignAmbient('lightsabers', ['fun-star-wars-day']);
  assignAmbient('coffee-beans', ['fun-coffee-day']);
  assignAmbient('kitchen-herbs', ['fun-chefs-day']);
  assignAmbient('four-leaf-clovers', ['fun-st-patricks-day']);
  assignAmbient('grain-leaves', ['fun-world-food-day']);
  assignAmbient('diya-lights', ['in-diwali']);
  assignAmbient('powder', ['in-holi', 'np-holi']);
  assignAmbient('pongal-harvest', ['in-pongal']);
  assignAmbient('pookkalam-petals', ['in-onam']);
  assignAmbient('modak-marigold', ['in-ganesh-chaturthi']);
  assignAmbient('dandiya-ribbons', ['in-navaratri']);
  assignAmbient('puja-flowers', ['in-durga-puja']);
  assignAmbient('dussehra-leaves', ['in-dussehra']);
  assignAmbient('dashain-kites', ['np-dashain']);
  assignAmbient('tihar-garlands', ['np-tihar']);
  assignAmbient('baisakh-leaves', ['np-nepali-new-year']);
  assignAmbient('lotus-ripples', ['np-buddha-jayanti', 'in-buddha-purnima', 'bali-waisak']);
  assignAmbient('quiet-night', ['bali-nyepi']);
  assignAmbient('penjor-breeze', ['bali-galungan']);
  assignAmbient('kuningan-ornaments', ['bali-kuningan']);
  assignAmbient('lanterns', ['ph-lunar-new-year', 'bali-lunar-new-year']);
  assignAmbient('eid-fitr-lights', ['ph-eid-al-fitr', 'in-eid-al-fitr', 'np-eid-al-fitr', 'bali-eid-fitr']);
  assignAmbient('eid-adha-light', ['ph-eid-al-adha', 'in-eid-al-adha', 'np-eid-al-adha', 'bali-eid-adha']);
  assignAmbient('sinulog-flow', ['ph-sinulog']);
  assignAmbient('kiping', ['ph-pahiyas']);
  assignAmbient('panagbenga-flowers', ['ph-panagbenga']);
  assignAmbient('kadayawan-harvest', ['ph-kadayawan']);
  assignAmbient('philippine-ribbons', ['ph-independence-day']);
  window.KB_AMBIENT_PRESETS = Object.freeze({ ...ambientById });
  const C = { cream: '#fffefa', gold: '#d6ac55', orange: '#e2602a', rose: '#c9868d', green: '#758a68', blue: '#6a8597' };
  function motifSvg(body, w = 40, h = 48) { return svg(body, w, h); }
  const petal = colour => motifSvg('<path d="M20 7C40 2 39 31 20 40C1 31 0 2 20 7Z" fill="' + colour + '"/><path d="M20 13q-5 10 0 23" opacity=".35"/>');
  const ambientArt = {
    'snow': '',
    'pink-petal': petal(C.rose), 'cream-petal': petal(C.cream), 'marigold-petal': petal(C.gold), 'lotus-petal': petal('#f1dedc'),
    'heart': motifSvg('<path d="M20 15C4-7-12 17 20 41C52 17 36-7 20 15Z" fill="' + C.rose + '"/>'),
    'egg': motifSvg('<path d="M20 4C-2 24-1 44 20 44S42 24 20 4Z" fill="' + C.cream + '"/><path d="M6 24l7 4 7-5 7 5 7-4M6 34h28" stroke="' + C.orange + '"/><circle cx="18" cy="16" r="2" fill="' + C.gold + '"/>'),
    'star': particles.stars, 'confetti': particles.confetti, 'kite': particles.kite, 'powder': particles.powder,
    'mote': motifSvg('<circle cx="20" cy="24" r="3.5" fill="' + C.gold + '" stroke="none"/><path d="M20 12v4M20 32v4M8 24h4M28 24h4" stroke="' + C.gold + '"/>'),
    'flame': motifSvg('<path d="M20 6C11 18 13 30 20 34C27 30 29 18 20 6Z" fill="' + C.gold + '"/><path d="M20 18C17 24 18 29 20 30C22 29 23 24 20 18Z" fill="' + C.orange + '" stroke="none"/>'),
    'marigold': motifSvg([0, 45, 90, 135, 180, 225, 270, 315].map(a => '<circle cx="20" cy="15" r="5" transform="rotate(' + a + ' 20 24)" fill="' + C.orange + '"/>').join('') + '<circle cx="20" cy="24" r="6" fill="' + C.gold + '"/>'),
    'blossom': motifSvg([0, 72, 144, 216, 288].map(a => '<circle cx="20" cy="15.5" r="7" transform="rotate(' + a + ' 20 24)" fill="#f1dedc"/>').join('') + '<circle cx="20" cy="24" r="3.5" fill="' + C.gold + '"/>'),
    'small-crescent': motifSvg('<path d="M25 10A14 14 0 1 0 25 38A11 11 0 1 1 25 10Z" fill="' + C.gold + '"/>'),
    'night-star': motifSvg('<path d="M20 12v24M8 24h24" stroke="' + C.blue + '"/><circle cx="20" cy="24" r="2" fill="' + C.cream + '" stroke="none"/>'),
    'streamer': motifSvg('<path d="M10 3q25 9 8 19T28 45" stroke="' + C.gold + '" stroke-width="4"/><path d="M31 3q-15 10 0 17" stroke="' + C.orange + '" stroke-width="2"/>'),
    'ribbon': motifSvg('<circle cx="20" cy="17" r="10" fill="' + C.gold + '"/><path d="M13 25L9 43l11-6 10 6-3-18" fill="' + C.cream + '"/><path d="M20 10v14M14 17h12" stroke="' + C.orange + '"/>'),
    'steam': motifSvg('<g stroke="' + C.blue + '" stroke-width="2"><path d="M11 43q-9-10 0-20t0-20"/><path d="M24 46q-9-10 0-20t0-20"/><path d="M35 40q-7-8 0-16t0-16"/></g>'),
    'bean': motifSvg('<ellipse cx="20" cy="24" rx="12" ry="19" fill="#a4815d" transform="rotate(24 20 24)"/><path d="M27 8Q9 20 17 41" stroke="' + C.cream + '" stroke-width="2"/>'),
    'leaf': particles.leaves,
    'sprig': motifSvg('<path d="M11 44Q29 24 27 4" stroke="' + C.green + '"/><path d="M22 29Q3 22 10 15Q21 17 22 29ZM26 19Q38 9 36 24Q30 30 24 30Z" fill="' + C.green + '"/>'),
    'herb': motifSvg('<path d="M10 44L27 4M17 29L5 22M21 20L10 11M21 23L35 14M16 35L31 30M25 11L34 5" stroke="' + C.green + '" stroke-width="2.7"/>'),
    'grain': motifSvg('<path d="M20 44V5" stroke="' + C.gold + '"/><path d="M20 34Q2 34 8 23Q19 23 20 34ZM20 24Q2 23 8 13Q19 13 20 24ZM20 32Q38 31 32 21Q21 21 20 32ZM20 21Q38 20 32 10Q21 10 20 21ZM20 12Q11 1 20 1Q29 1 20 12Z" fill="' + C.gold + '"/>'),
    'clover': motifSvg('<g transform="translate(20 21)" fill="' + C.green + '">' + [0, 90, 180, 270].map(a => '<path class="kb-clover-leaf" transform="rotate(' + a + ')" d="M0-1C-5-6-15-7-14-15C-13-22-4-22 0-17C4-22 13-22 14-15C15-7 5-6 0-1Z"/>').join('') + '</g><path class="kb-clover-stem" d="M20 22Q26 37 16 47" stroke="' + C.green + '" stroke-width="2"/>', 40, 48),
    'horseshoe': motifSvg('<path d="M10 5Q-4 37 20 40Q44 37 30 5L23 8Q33 31 20 31Q7 31 17 8Z" fill="' + C.gold + '"/><path d="M9 15h4M7 24h4M28 15h4M29 24h4"/>'),
    'horse': motifSvg('<g class="kb-ambient-horse"><path class="kb-horse-tail" d="M19 22Q5 11 3 28Q9 21 17 29" fill="#725744"/><ellipse cx="35" cy="25" rx="21" ry="10" fill="#b58b60"/><path d="M48 24L51 13L59 5L71 8L75 16L65 20L59 31" fill="#b58b60"/><path d="M58 8L57 1L64 7M64 7l4-5 2 7" fill="#725744"/><path class="kb-horse-leg kb-horse-leg-back" d="M22 28L18 38L9 44M28 30L33 39L27 46" stroke="#725744" stroke-width="4"/><path class="kb-horse-leg kb-horse-leg-front" d="M46 29L55 36L67 35M51 28L58 39L57 46" stroke="#725744" stroke-width="4"/><path d="M28 17h17l-4 11H29Z" fill="' + C.gold + '"/><path d="M36 16L43 9L52 14M41 19L49 26" stroke="' + C.blue + '" stroke-width="4"/><circle cx="44" cy="6" r="4" fill="' + C.cream + '"/><path d="M40 3q5-5 9 3h-9" fill="' + C.orange + '"/><path d="M52 15L65 15M66 11h1" stroke-width="1"/></g>', 80, 48),
    'ghost': motifSvg('<path d="M6 42V18Q6 4 20 4Q34 4 34 18V42l-7-5-7 5-7-5Z" fill="' + C.cream + '"/><path d="M15 18v4M25 18v4M17 29q3 3 6 0"/>'),
    'bat': motifSvg('<path d="M20 21C10 6 2 9 2 15L2 30q7-6 12 1l6 9 6-9q5-7 12-1V15C38 9 30 6 20 21Z" fill="#85818b"/><path d="M16 20l-1-7 5 5 5-5-1 7" fill="#85818b"/>'),
    'saber': motifSvg('<g transform="rotate(25 20 26)"><g class="kb-saber-blade"><path d="M20 29V5" stroke="' + C.green + '" stroke-width="7" opacity=".45"/><path d="M20 29V5" stroke="#e5f3d6" stroke-width="3"/></g><g class="kb-saber-hilt"><path d="M16 28h8v15h-8Z" fill="#c8c7bf"/><path d="M16 32h8M16 37h8M20 43v3"/><circle cx="20" cy="31" r="1.4" fill="' + C.orange + '"/></g></g>'),
    'rice': motifSvg('<ellipse cx="20" cy="24" rx="3" ry="10" fill="' + C.cream + '" transform="rotate(25 20 24)"/>'),
    'cane-leaf': motifSvg('<path d="M7 44Q5 6 34 3Q22 32 7 44Z" fill="' + C.green + '"/><path d="M7 44L29 10"/>'),
    'cane': motifSvg('<path d="M18 46V8M26 46V14M15 18h7M15 28h7M15 38h7M23 24h6M23 36h6" stroke="' + C.gold + '" stroke-width="2"/><path d="M18 11Q-4 5 2 25Q11 12 18 14ZM19 9Q28-4 38 4Q27 6 19 13ZM26 18Q41 8 40 26Q34 19 26 22Z" fill="' + C.green + '"/>'),
    'rice-pot': motifSvg('<path d="M9 23H31L35 33Q36 45 20 45Q4 45 5 33Z" fill="#be7e56"/><path d="M8 24h24M13 22q-9-9 0-11M21 22q-9-9 0-13M28 22q-9-9 0-11" stroke="' + C.cream + '"/><path d="M11 33h18" stroke="' + C.gold + '"/>'),
    'modak': motifSvg('<ellipse cx="20" cy="42" rx="18" ry="4" fill="' + C.cream + '"/><path d="M20 14C17 25 5 29 9 38Q20 45 31 38C35 29 23 25 20 14Z" fill="#efd9b5"/><path d="M20 18v21M20 21Q11 33 15 40M20 21Q29 33 25 40"/><path class="kb-ambient-detail" d="M17 11q-5-4 0-8M25 11q-5-4 0-8" stroke="' + C.blue + '"/>'),
    'diya': motifSvg('<path d="M3 29Q20 22 37 29Q31 44 20 44Q9 44 3 29Z" fill="#bd7957"/><path d="M5 29Q20 35 35 29" stroke="' + C.gold + '"/><path class="kb-ambient-detail" d="M21 6C7 22 15 29 21 27C31 26 30 19 21 6Z" fill="' + C.gold + '"/>'),
    'dandiya': motifSvg('<path d="M6 7L34 42M34 7L6 42" stroke="' + C.orange + '" stroke-width="5"/><path d="M11 13l4-3M19 23l4-3M27 33l4-3M29 14l-4-3M21 24l-4-3M13 34l-4-3" stroke="' + C.gold + '" stroke-width="2.5"/>'),
    'shiuli': motifSvg('<g fill="' + C.cream + '"><ellipse cx="20" cy="16" rx="5" ry="10"/><ellipse cx="20" cy="16" rx="5" ry="10" transform="rotate(72 20 24)"/><ellipse cx="20" cy="16" rx="5" ry="10" transform="rotate(144 20 24)"/><ellipse cx="20" cy="16" rx="5" ry="10" transform="rotate(216 20 24)"/><ellipse cx="20" cy="16" rx="5" ry="10" transform="rotate(288 20 24)"/></g><circle cx="20" cy="24" r="4" fill="' + C.orange + '"/>'),
    'dhak': motifSvg('<path d="M10 9Q20 4 30 9L34 38Q20 46 6 38Z" fill="#bb7853"/><ellipse cx="20" cy="10" rx="11" ry="5" fill="' + C.cream + '"/><path d="M10 15l20 24M29 14L10 39M4 5L13 1M31 3l7 5" stroke="' + C.gold + '"/>'),
    'compound-leaf': motifSvg('<path d="M20 44V6" stroke="' + C.green + '"/>' + [13, 23, 33].map(y => '<ellipse cx="13" cy="' + y + '" rx="8" ry="4" fill="' + C.green + '" transform="rotate(24 13 ' + y + ')"/><ellipse cx="27" cy="' + y + '" rx="8" ry="4" fill="' + C.green + '" transform="rotate(-24 27 ' + y + ')"/>').join('')),
    'marigold-string': motifSvg('<path d="M20 1v46" stroke="' + C.gold + '"/>' + [9, 21, 33, 44].map(y => [0, 60, 120, 180, 240, 300].map(a => '<circle cx="20" cy="' + (y - 3.6) + '" r="3" transform="rotate(' + a + ' 20 ' + y + ')" fill="' + C.orange + '"/>').join('') + '<circle cx="20" cy="' + y + '" r="3.2" fill="' + C.gold + '"/>').join('')),
    'ripple': motifSvg('<g fill="none" stroke="' + C.blue + '"><ellipse class="kb-ambient-detail" cx="20" cy="29" rx="17" ry="8"/><ellipse cx="20" cy="29" rx="10" ry="4"/><path d="M2 41q18-6 36 0"/></g>'),
    'lotus': motifSvg('<path d="M20 35Q-2 31 3 18Q14 18 20 35ZM20 35Q42 31 37 18Q26 18 20 35ZM20 35Q3 17 20 5Q37 17 20 35Z" fill="#eddbd8"/><path d="M3 41q17-6 34 0" stroke="' + C.blue + '"/>'),
    'penjor': motifSvg('<path d="M6 48V10Q8-3 25 5Q36 12 34 24" stroke="' + C.gold + '" stroke-width="2"/><path d="M33 18v24M20 6l-3 12M27 9l-2 13M32 14l-2 14" stroke="' + C.green + '"/><path d="M28 37h10l-5 8Z" fill="' + C.gold + '"/>'),
    'tamiang': motifSvg('<path d="M20 1v9M20 38v10" stroke="' + C.gold + '"/><circle cx="20" cy="24" r="14" fill="#ddbd72"/><circle cx="20" cy="24" r="8"/>' + [0, 45, 90, 135].map(a => '<path d="M6 24h28" transform="rotate(' + a + ' 20 24)" stroke-width="1"/>').join('')),
    'endongan': motifSvg('<path d="M20 1v10M20 38v10" stroke="' + C.gold + '"/><path d="M6 16L20 9L34 16V35L20 41L6 35Z" fill="#d9bb76"/><path d="M6 16L34 35M6 35L34 16M12 13v25M20 10v31M28 13v25" stroke-width="1"/>'),
    'lantern': motifSvg('<path d="M20 1v6M20 37v10M15 42h10" stroke="' + C.gold + '"/><path d="M11 8h18v4H11ZM11 33h18v4H11Z" fill="' + C.gold + '"/><ellipse cx="20" cy="22" rx="15" ry="13" fill="#bd5e49"/><path d="M12 12q-5 10 0 20M20 10v25M28 12q5 10 0 20" stroke="' + C.gold + '"/>'),
    'crescent': motifSvg('<path d="M29 7C5 0 0 35 23 39Q32 40 37 32C16 39 9 17 29 7Z" fill="' + C.gold + '"/>'),
    'arch': motifSvg('<path d="M5 46V26Q5 15 20 4Q35 15 35 26V46M11 46V27Q11 20 20 12Q29 20 29 27V46" stroke="' + C.gold + '" stroke-width="2"/>'),
    'water-ribbon': motifSvg('<path d="M2 5Q40 8 20 23T36 44" stroke="' + C.blue + '" stroke-width="4"/><path d="M10 3Q36 12 14 28T29 45" stroke="' + C.gold + '" stroke-width="2"/>'),
    'kiping': motifSvg('<path d="M20 1v46" stroke="' + C.gold + '"/>' + [10, 23, 36].map((y, i) => '<path d="M20 ' + (y - 7) + 'Q2 ' + (y - 8) + ' 6 ' + (y + 7) + 'Q19 ' + (y + 10) + ' 20 ' + (y - 7) + 'Z" fill="' + [C.orange, C.rose, C.gold][i] + '"/><path d="M20 ' + (y - 7) + 'Q38 ' + (y - 8) + ' 34 ' + (y + 7) + 'Q21 ' + (y + 10) + ' 20 ' + (y - 7) + 'Z" fill="' + [C.green, C.gold, C.rose][i] + '"/>').join('')),
    'flower': motifSvg('<g fill="#d6a2a6">' + [0, 60, 120, 180, 240, 300].map(a => '<ellipse cx="20" cy="13" rx="6" ry="10" transform="rotate(' + a + ' 20 24)"/>').join('') + '</g><circle cx="20" cy="24" r="6" fill="' + C.gold + '"/>'),
    'pookkalam': motifSvg('<circle cx="20" cy="24" r="18" fill="' + C.gold + '"/><circle cx="20" cy="24" r="12" fill="' + C.cream + '"/>' + [0, 60, 120, 180, 240, 300].map(a => '<ellipse cx="20" cy="16" rx="4" ry="6" transform="rotate(' + a + ' 20 24)" fill="' + C.orange + '"/>').join('') + '<circle cx="20" cy="24" r="4" fill="' + C.gold + '"/>'),
    'durian': motifSvg('<path d="M20 7L25 10l6-1 1 6 5 5-3 6 1 6-6 2-4 7-6-2-6 2-3-7-6-3 2-6-2-6 6-4 3-6 6 1Z" fill="' + C.green + '"/><path d="M13 18l3 4M24 17l3 4M16 29l3 4M27 27l3 4M20 7l3-5"/>'),
    'mangosteen': motifSvg('<circle cx="20" cy="27" r="16" fill="#897180"/><path d="M20 12Q3 3 9 17Q13 22 20 17Q27 22 31 17Q37 3 20 12Z" fill="' + C.green + '"/><path d="M20 12V6"/>'),
    'sun': motifSvg('<circle cx="20" cy="24" r="7" fill="' + C.gold + '"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => '<path d="M18 13L20 5L22 13" transform="rotate(' + a + ' 20 24)" fill="' + C.gold + '" stroke-width="1"/>').join('')),
    'civic-ribbon': motifSvg('<path d="M2 5Q40 9 20 25T36 44" stroke="' + C.blue + '" stroke-width="4"/><path d="M10 3Q36 13 14 30T29 45" stroke="#b75a4d" stroke-width="2"/>'),
    'parol': motifSvg('<path d="M20 1v6M9 32l-2 15M31 32l2 15" stroke="' + C.gold + '"/><circle cx="20" cy="22" r="17" fill="' + C.cream + '"/><path d="M20 6L24 17L36 17L26 25L30 37L20 30L10 37L14 25L4 17L16 17Z" fill="' + C.gold + '"/><path d="M20 6V30M4 17L30 37M36 17L10 37" stroke="' + C.orange + '" stroke-width="1"/>')
  };
  function ambientFor(theme) {
    const preset = theme && ambientById[theme.id];
    return preset ? { preset, ...ambientDesigns[preset] } : null;
  }
  function ambientNode(motif, motion, index, visible, ornament = false) {
    const node = document.createElement('i'), centre = !ornament && index % 7 === 6;
    node.className = 'complete-particle kb-ambient-particle ' + (centre ? 'is-centre' : 'is-edge') + (ornament ? ' is-ornament' : '');
    node.dataset.ambientMotif = motif; node.dataset.ambientMotion = motion;
    const x = centre ? 30 + (index * 17) % 40 : index % 2 ? 2 + (index * 2.7) % 10 : 86 + (index * 1.7) % 10;
    const size = motif === 'snow' ? 2 + index % 4 : motif === 'horse' ? (visible ? 96 : 75) : ornament ? (visible ? 53 : 40) : motif === 'saber' ? (visible ? 66 : 48) : motif === 'steam' ? (visible ? 38 : 29) : motif === 'kite' ? (visible ? 42 : 32) : (visible ? 23 : 17) + index % 8;
    node.style.setProperty('--x', x + '%'); node.style.setProperty('--y', (10 + (index * 23) % 71) + '%');
    node.style.setProperty('--size', size + 'px');
    node.style.setProperty('--duration', (motion === 'race' ? 13 + index % 4 : motion === 'twinkle' || ornament ? 7 + index % 5 : motif === 'snow' ? 15 + index % 12 : 16 + index % 13) + 's');
    node.style.setProperty('--delay', (-index * 2.7 - 1.3) + 's');
    node.style.setProperty('--distance', 'calc(100dvh + 130px)'); node.style.setProperty('--drift', ((index % 2 ? -1 : 1) * (18 + index % 37)) + 'px'); node.style.setProperty('--turn', (index % 2 ? 45 : -40) + 'deg');
    node.innerHTML = branded(ambientArt[motif] || '');
    if (motif === 'saber') node.style.setProperty('--kb-saber-delay', (-1.8 - (index % 4) * .85) + 's');
    if (motif === 'powder') node.style.color = ['var(--kb-festive-accent)', 'var(--kb-festive-stone)', 'var(--kb-festive-steel-dark)', 'var(--kb-festive-beige)'][index % 4];
    return node;
  }
  function renderAmbient(layer, design, visible) {
    layer.dataset.ambientPreset = design.preset;
    if (design.horizon || design.dawn) {
      const horizon = document.createElement('div'); horizon.className = 'kb-ambient-horizon kb-ambient-motion' + (design.dawn ? ' is-dawn' : ''); horizon.setAttribute('aria-hidden', 'true'); layer.append(horizon);
    }
    const count = visible ? design.count : Math.max(4, Math.round(design.count * .55));
    for (let i = 0; i < count; i++) {
      const motif = design.motifs[i % design.motifs.length];
      let motion = design.motion;
      if (motion === 'space') motion = motif === 'saber' ? 'saber' : 'twinkle';
      if (motion === 'race' && motif !== 'horse') motion = 'flutter';
      const node = ambientNode(motif, motion, i, visible);
      if (motif === 'horse') node.style.setProperty('--lane', (6 + (i % 3) * 5) + '%');
      layer.append(node);
    }
    renderHang(design, visible);
  }
  // Anchored cultural objects belong to the page, not the viewport. They hang from under the top bar
  // (garlands, lanterns, parol) or stand on the date line (diyas, pots) on the right of the heading,
  // behind the board and dockets, so they scroll with Home and never sit on a word or a button.
  const hanging = new Set(['marigold-string', 'tamiang', 'endongan', 'lantern', 'kiping', 'parol', 'crescent']);
  function renderHang(design, visible) {
    const main = document.querySelector('#app .wall-main');
    if (!main || !design.ornaments?.length) return;
    const hang = document.createElement('div'); hang.className = 'kb-hang'; hang.setAttribute('aria-hidden', 'true'); hang.dataset.hangPreset = design.preset;
    const date = main.querySelector('.wall-date');
    hang.style.setProperty('--kb-stand-base', (date ? date.offsetTop + date.offsetHeight : 80) + 'px');
    design.ornaments.slice(0, visible ? 3 : 2).forEach((motif, i) => {
      const node = document.createElement('i');
      node.className = 'kb-hang-item ' + (hanging.has(motif) ? 'is-hanging' : 'is-standing');
      node.dataset.hangMotif = motif; node.style.setProperty('--kb-hang-i', i);
      node.style.setProperty('--kb-hang-delay', (-1.3 - i * 1.9) + 's');
      node.innerHTML = branded(ambientArt[motif] || '');
      if (motif === 'ripple' || motif === 'pookkalam') node.classList.add('is-breathing');
      hang.append(node);
    });
    main.prepend(hang);
  }
  // Work pages use the same occasion-specific vocabulary inside a shallow, clipped header.
  // Distances are measured from that header so no decorative paint reaches recipes or inputs.
  function navbarNode(motif, motion, index, visible, ornament = false) {
    const node = document.createElement('i');
    node.className = 'kb-navbar-particle' + (ornament ? ' is-ornament' : '');
    node.dataset.navMotif = motif; node.dataset.navMotion = motion;
    const size = motif === 'snow' ? (visible ? 4 : 3) + index % 3
      : motif === 'horse' ? (visible ? 55 : 43)
      : ornament ? (visible ? 36 : 29)
      : motif === 'saber' || motif === 'kite' ? (visible ? 32 : 25)
      : (visible ? 20 : 16) + index % 5;
    node.style.setProperty('--kb-nav-size', size + 'px');
    node.style.setProperty('--kb-nav-x', (5 + (index * 17) % 89) + '%');
    node.style.setProperty('--kb-nav-y', (12 + (index * 13) % 51) + '%');
    node.style.setProperty('--kb-nav-duration', (motion === 'race' ? 8 + index % 3 : motion === 'twinkle' || ornament ? 4.2 + index % 3 : 5.5 + index % 4) + 's');
    node.style.setProperty('--kb-nav-delay', (-1.1 - index * 1.25) + 's');
    node.style.setProperty('--kb-nav-drift', (index % 2 ? -7 : 7) + 'px');
    node.style.setProperty('--kb-nav-opacity', visible ? '.76' : '.5');
    node.innerHTML = branded(ambientArt[motif] || '');
    node.querySelectorAll('.kb-saber-blade').forEach(blade => blade.style.setProperty('--kb-saber-delay', (-1.8 - index * .6) + 's'));
    if (motif === 'powder') node.style.color = ['var(--kb-festive-accent)', 'var(--kb-festive-steel)', 'var(--kb-festive-paper)'][index % 3];
    return node;
  }
  function renderNavbar(design, visible) {
    const header = document.querySelector('#app .wtop');
    if (!header || !design) return;
    const layer = document.createElement('div'); layer.className = 'kb-nav-festive-effects';
    layer.dataset.navPreset = design.preset; layer.setAttribute('aria-hidden', 'true');
    layer.dataset.motionIntensity = visible ? 'festive' : 'light';
    const count = design.preset === 'snow' ? (visible ? 12 : 7) : design.motion === 'kite' ? (visible ? 4 : 3) : (visible ? 7 : 4);
    // Reserve one phone slot for the occasion's attached identifying object.
    // A positional CSS cut would discard penjor, parol, kiping, lamps and garlands.
    const phoneFloaters = design.preset === 'snow' ? 8 : design.ornaments?.length ? 3 : 4;
    if (design.horizon || design.dawn) {
      const horizon = document.createElement('div'); horizon.className = 'kb-nav-horizon' + (design.dawn ? ' is-dawn' : ''); layer.append(horizon);
    }
    for (let i = 0; i < count; i++) {
      const motif = design.motifs[i % design.motifs.length];
      let motion = design.motion;
      if (motion === 'space') motion = motif === 'saber' ? 'saber' : 'twinkle';
      if (motion === 'race' && motif !== 'horse') motion = 'flutter';
      if (['quiet', 'step', 'ribbon', 'powder', 'kite'].includes(motion)) motion = 'flutter';
      const node = navbarNode(motif, motion, i, visible);
      if (i >= phoneFloaters) node.classList.add('is-phone-extra');
      if (motion === 'race') node.style.setProperty('--kb-nav-lane', (7 + (i % 3) * 4) + 'px');
      layer.append(node);
    }
    // Anchored cultural objects remain attached and sway; they are never discarded as confetti.
    (design.ornaments || []).slice(0, visible ? 2 : 1).forEach((motif, i) => {
      const node = navbarNode(motif, motif === 'ripple' || motif === 'pookkalam' ? 'breathe' : 'sway', i + 1, visible, true);
      if (i > 0) node.classList.add('is-phone-extra');
      node.style.setProperty('--kb-nav-x', (i ? 79 : 18) + '%');
      layer.append(node);
    });
    header.prepend(layer);
    const measure = () => {
      if (!layer.isConnected || current.surface !== 'work') return;
      const bounds = header.getBoundingClientRect();
      layer.style.setProperty('--kb-nav-height', bounds.height + 'px');
      layer.style.setProperty('--kb-nav-width', bounds.width + 'px');
    };
    measure();
    if (window.ResizeObserver) { navbarObserver = new ResizeObserver(measure); navbarObserver.observe(header); }
  }
  function effectFor(theme) {
    const requested = theme && (theme.previewEffect || theme.effect);
    const effect = normalize[requested] || requested;
    return particleEffects.has(effect) || ['glow', 'sway', 'rock', 'steam', 'wave', 'orbit', 'march'].includes(effect) ? effect : 'glow';
  }
  function homeSurface() {
    // The hash guard prevents stale Home DOM from keeping viewport motion alive during navigation.
    return /^(?:#\/?)?$/.test(location.hash.split('?')[0]) && Boolean(document.querySelector('#app .wall-main .dockets'));
  }
  function surfaceFor(options) { return options?.surface === 'work' || !homeSurface() ? 'work' : 'home'; }
  function targets() {
    const selector = current.surface === 'work' ? '#app .wtop .kb-occasion-title-art>svg' : '#app .kb-season-note-art>svg,#app .kb-season-work svg';
    return [...document.querySelectorAll(selector)];
  }
  function clean() {
    navbarObserver?.disconnect(); navbarObserver = null;
    document.querySelectorAll('.kb-nav-festive-effects,.kb-hang').forEach(node => node.remove());
    document.querySelectorAll('.kb-motion-addon,.complete-steam').forEach(node => node.remove());
    document.querySelectorAll('.kb-motion-target').forEach(node => { node.classList.remove('kb-motion-target'); delete node.dataset.kbMotion; });
  }
  function announce() { requestAnimationFrame(() => document.dispatchEvent(new CustomEvent('kb-motion-state'))); }
  function addSteam(art) {
    const view = art.viewBox.baseVal, w = view.width || 64, h = view.height || 64, ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g'); group.classList.add('kb-motion-addon', 'complete-steam'); group.setAttribute('fill', 'none'); group.setAttribute('stroke', 'currentColor'); group.setAttribute('stroke-width', w > 100 ? '1.7' : '1'); group.setAttribute('stroke-linecap', 'round');
    for (let j = 0; j < 3; j++) { const x = w * (.42 + j * .11), line = document.createElementNS(ns, 'path'); line.setAttribute('d', 'M' + x + ' ' + h * .28 + 'q' + (-w * .025) + ' ' + (-h * .055) + ' 0 ' + (-h * .1) + 't0 ' + (-h * .1)); line.style.animationDelay = (-j * .7) + 's'; group.append(line); }
    art.append(group);
  }
  function render(theme, mode, density, options) {
    const app = document.querySelector('#app'), layer = document.querySelector('#kb-festive-effects');
    if (!app || !layer) return;
    current = { theme: theme && theme.id !== 'off' ? theme : null, mode: mode === 'gentle' ? 'gentle' : 'still', density: density === 'light' ? 'light' : 'festive', surface: surfaceFor(options) };
    const effect = effectFor(current.theme), stopped = !current.theme || current.mode === 'still' || reduced.matches;
    const ambient = ambientFor(current.theme);
    clean(); layer.replaceChildren(); delete layer.dataset.ambientPreset; app.dataset.motion = effect; app.dataset.motionIntensity = current.density; app.dataset.kbCelebrationSurface = current.surface; layer.dataset.motionIntensity = current.density; layer.dataset.surface = current.surface;
    app.classList.toggle('motion-still', stopped); app.classList.toggle('motion-gentle', !stopped); layer.className = 'effect-' + effect;
    if (!stopped) {
      targets().forEach(art => { art.classList.add('kb-motion-target'); art.dataset.kbMotion = particleEffects.has(effect) ? (effect === 'stars' ? 'glow' : 'accent') : effect; if (effect === 'steam') addSteam(art); });
      if (current.surface === 'work') {
        renderNavbar(ambient, current.density === 'festive');
      } else if (current.surface === 'home' && ambient) {
        renderAmbient(layer, ambient, current.density === 'festive');
      } else if (current.surface === 'home' && particleEffects.has(effect)) {
        const visible = current.density === 'festive', amount = effect === 'snow' ? (visible ? 40 : 24) : effect === 'kite' ? (visible ? 3 : 2) : (visible ? 12 : 6);
        for (let i = 0; i < amount; i++) {
          const el = document.createElement('i'), centre = effect === 'snow' && i % 6 === 0;
          el.className = 'complete-particle ' + (centre ? 'is-centre' : 'is-edge');
          el.style.setProperty('--x', (centre ? 28 + (i * 13) % 43 : i % 2 ? 3 + (i * 3.3) % 13 : 85 + (i * 3.3) % 12) + '%');
          el.style.setProperty('--size', (effect === 'snow' ? 2 + i % 4 : effect === 'kite' ? 27 : (visible ? 16 : 12) + i % 10) + 'px');
          el.style.setProperty('--duration', (effect === 'confetti' ? 9 + i % 3 : effect === 'snow' ? 15 + i % 12 : 20 + i % 13) + 's');
          el.style.setProperty('--delay', (-i * 2.1) + 's'); el.style.setProperty('--distance', 'calc(100dvh + 130px)'); el.style.setProperty('--drift', ((i % 2 ? -1 : 1) * (18 + i % 37)) + 'px'); el.style.setProperty('--turn', (i % 2 ? 60 : -55) + 'deg');
          if (effect !== 'snow') el.innerHTML = branded(particles[effect]);
          if (effect === 'powder') el.style.color = ['var(--kb-festive-accent)', 'var(--kb-festive-stone)', 'var(--kb-festive-steel-dark)', 'var(--kb-festive-beige)'][i % 4];
          layer.append(el);
        }
      }
    }
    pause(document.hidden); announce();
  }
  function pause(on) {
    paused = !!on;
    document.querySelector('#app')?.classList.toggle('motion-paused', paused);
    document.querySelector('#kb-festive-effects')?.classList.toggle('motion-paused', paused);
    announce();
  }
  function ownedAnimations() { return document.getAnimations().filter(a => { const node = a.effect && a.effect.target; return node instanceof Element && node.matches(ownedSelector); }); }
  function status() {
    const effect = effectFor(current.theme), ambient = current.surface === 'home' ? ambientFor(current.theme) : null;
    const label = !current.theme ? 'Themes are off' : current.surface === 'work' ? (ambientFor(current.theme) ? 'Visible celebration motifs moving inside the top navbar' : 'Animated celebration mark in the top navbar') : ambient ? ambient.label : (current.theme.previewMotionLabel || current.theme.motionLabel || 'Gentle illustration movement');
    const animations = ownedAnimations();
    const running = animations.filter(a => a.playState === 'running').length;
    const state = !current.theme ? 'off' : current.mode === 'still' ? 'still' : reduced.matches ? 'reduced-motion' : paused || document.hidden ? 'paused' : running ? 'running' : 'still';
    const layer = document.querySelector('#kb-festive-effects');
    const ambientAnimations = animations.filter(a => layer && layer.contains(a.effect.target));
    const navbar = document.querySelector('#app .wtop .kb-nav-festive-effects');
    const navbarAnimations = animations.filter(a => navbar && navbar.contains(a.effect.target));
    return { state, effect, label, animationCount: state === 'running' ? running : animations.length, intensity: current.density, replayRevision, surface: current.surface, scope: current.surface === 'home' ? 'page' : 'navbar', ambientPreset: ambient ? ambient.preset : null, ambientLabel: ambient ? ambient.label : null, ambientCount: layer ? layer.querySelectorAll('.kb-ambient-particle,.kb-ambient-horizon').length : 0, hangCount: document.querySelectorAll('#app .kb-hang-item').length, ambientAnimationCount: state === 'running' ? ambientAnimations.filter(a => a.playState === 'running').length : ambientAnimations.length, navbarPreset: navbar?.dataset.navPreset || null, navbarCount: navbar ? navbar.querySelectorAll('.kb-navbar-particle,.kb-nav-horizon').length : 0, navbarAnimationCount: state === 'running' ? navbarAnimations.filter(a => a.playState === 'running').length : navbarAnimations.length };
  }
  document.addEventListener('visibilitychange', () => pause(document.hidden));
  window.addEventListener('hashchange', () => {
    if (!homeSurface()) render(current.theme, current.mode, current.density, { surface: 'work' });
  });
  reduced.addEventListener('change', () => render(current.theme, current.mode, current.density, { surface: current.surface }));
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => announce(), 100); });
  window.KB_EFFECTS = { render, pause, reduced, status, coverage() { return Object.entries(ambientById).map(([id, preset]) => ({ id, preset, label: ambientDesigns[preset].label })); }, replay() { render(current.theme, current.mode, current.density, { surface: current.surface }); requestAnimationFrame(() => { if (current.theme && current.mode === 'gentle' && !reduced.matches && !paused && !document.hidden) { ownedAnimations().forEach(animation => { animation.currentTime = 0; animation.play(); }); replayRevision += 1; } announce(); }); } };
})();
