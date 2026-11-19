# Tutorial videos (18 November 2026)

The head chef asked for tutorial videos of the whole book: one per page, the admin and chef panels included, and one video with all of them cut together. They asked for:
- chalk circles where a function is explained
- a human-sounding voice over from a free voice
- captions on screen
- the mascot on the intro and outro
- ripples where a finger taps
- quiet music
- a Desktop cut and a Phone cut of each video

The finished videos go on Google Drive.

A script films the book. The videos also play inside the book, under Guides (see In the book, 19 November 2026).

## Where things are

| Path | What it does |
| --- | --- |
| `scripts/tutorials/make.mjs` | The one command: voice, film, compose. |
| `scripts/tutorials/storyboards/<page>.mjs` | One per video. Each step has a title, the sentences said, and what happens while each sentence is said. |
| `scripts/tutorials/film.mjs` | Opens the page and plays the storyboard. Logs when each sentence started (`timeline.json`). |
| `scripts/tutorials/kit.mjs` | Shared helpers: the click tests' harness on a fixed day, the two cuts, one browser per cut, the frame capture. |
| `scripts/tutorials/overlay.js` | The chalk layer. Added to the page only while filming. |
| `scripts/tutorials/fixtures.mjs` | The demo kitchen: made-up people and lines. |
| `scripts/tutorials/stage/` | The chalkboard, captions, phone and screen frames, and the mascot cards. Drawn by Chrome. |
| `scripts/tutorials/compose.mjs` | Puts it together with ffmpeg. Writes an MP4 and an `.srt` captions file. |
| `scripts/tutorials/voice.py` | Makes the voice, one WAV per sentence, and mixes them into one track. |
| `scripts/tutorials/out/` | The output. Git-ignored. Videos never go in this public repo. |
| `scripts/tutorials/order.mjs` | The viewing order, and which videos only the chefs see. |
| `scripts/tutorials/catalogue.mjs` | Makes `js/tutorials.js` from the storyboards: each video as a guide with its steps written out. |
| `js/tutorials.js` | The videos as guides, for the book's Guides page. Made by `catalogue.mjs`, never by hand. Lazy: loaded when Guides opens. |
| `scripts/tutorials/previews.mjs` | Makes the moving previews in `guides/videos/` from the app recordings in `out/`. |
| `guides/videos/` | The moving previews: `<id>-card` (the list card) and `<id>-wide` (the video's page), each an MP4 loop and a JPG still. About 3.9 MB for all 21; a loop loads only under a mouse, a touch screen loads only the stills. |

Finished videos go to Drive: 02 Leichhardt Hotel / Step by Step Guides / Kitchen Book Tutorial Videos.
- Names follow the filing rule: "04 VIDEO - Prep list - Desktop - v0.1.mp4", "04 CAPTIONS - ... .srt" and "00 VOICE SAMPLE - ...".
- The Drive connector takes about 3 MB per upload. Voice samples and captions go up that way. The videos (9 to 11 MB each) are sent in the chat, and the head chef drops them into the folder.

## How a video is made

1. **Voice.** `voice.py say` reads every sentence of the storyboard and writes one WAV each, plus their lengths.
   - Words the voices say wrong are respelt for the voice only (`SAY_AS`, for example Leichhardt as "Like-hart"). The captions keep the real words.
2. **Film.** Each cut gets its own Chrome, drawing finer with `--force-device-scale-factor`. Headless Chrome's screencast ignores the page's own scale.
   - The page opens through `L.open()` from `tests/lib.js`, on the Firebase stand-in, at 14:00 on Tuesday 16 June 2026 (`DAY` in `kit.mjs`).
   - The book's real fonts come from `docs/order-list-options/assets/`.
   - Any request that would leave the computer is refused and listed in `timeline.json` (`blocked`).
   - A sentence starts only when the one before it has finished and its taps are done, so the voice never runs ahead of the picture.
   - Every painted frame is kept with its time.
3. **Compose.**
   - Frames become a 30 fps video, sized to the slot.
   - Chrome draws a board picture each time the step or the caption changes.
   - The bezel goes in front.
   - The mascot's intro (`welcome`) and outro (`ready-to-cook`) are filmed while they play.
   - The voice is placed where the film said it.
   - The music runs under it, dips while the voice speaks, and the whole mix is set to -16 LUFS.

Sizes:
- **Desktop** is 1920 × 1080. The book is filmed at 1280 × 720 and shown 1472 × 828. H.264 needs even sizes.
- **Phone** is 1080 × 1920. The book is filmed at 390 × 844 and shown 666 × 1440 inside a phone.

## Making them again

Once per machine:

```
cd tests && npm install && cd ..
apt-get install -y libespeak-ng1 espeak-ng-data            # Kokoro's eSpeak (the pip copy stops the program)
uv venv -p python3.12 ~/tts/kokoro && VIRTUAL_ENV=~/tts/kokoro uv pip install -r scripts/tutorials/requirements.txt
```

`requirements.txt` lists Kokoro, CPU-only torch and spaCy's small English model.

Chatterbox needs its own Python 3.11 venv:

```
uv venv -p python3.11 ~/tts/cb && VIRTUAL_ENV=~/tts/cb uv pip install chatterbox-tts "setuptools<81" --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match
```

Then, for example:

```
CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
  VIRTUAL_ENV=~/tts/kokoro node scripts/tutorials/make.mjs prep --py ~/tts/kokoro/bin/python
```

Other options:
- `--cut phone` or `--cut desktop` makes one cut only.
- `--steps compose` puts the videos together again without filming.
- `--engine chatterbox --voice clip.wav` or `--engine azure --voice en-AU-NatashaNeural` changes the voice.
- `all` makes every storyboard, then the whole book in one video per cut, with chapter marks.

Filming is real time: a 90 second video takes about 90 seconds per cut, plus about a minute to compose.

### Checking the voice by ear, without listening

`voice.py check --script <voice folder>/lines.json --out <voice folder>` reads every line back with a speech-to-text model (faster-whisper `base.en`, in the Kokoro venv). It lists any line that does not say its words, which is how a cloned voice usually goes wrong: a dropped word or a mumble.
- Small numbers written as digits do not count as mistakes, and neither does write and right.
- `voice.py retake --ids s04_1,s06_0 ...` (with the same engine and voice as the first take) makes those lines again with a new seed.
- Run `make.mjs` with `--steps film,compose` after a retake.

### The head chef's own voice

The head chef's recording is on Drive in the Leichhardt folder. It is never in the repo.
1. Cut it to a clean 15 to 20 seconds: `ffmpeg -ss 1.7 -to 21.9 -i recording.m4a -ac 1 -ar 24000 -af "highpass=f=70,silenceremove=stop_periods=-1:stop_duration=0.45:stop_threshold=-40dB,loudnorm=I=-18:TP=-2" ref.wav`
2. Make the video with `--engine chatterbox --voice ref.wav --py <Chatterbox venv python>`.

What copies well (18 November 2026): the head chef's first recording was 37 seconds of relaxed, natural talking, and it made the better copy of their voice. A second recording, 17 seconds of a passage read aloud, read back slightly cleaner in the listening check but sounded wrong to the head chef. So record natural talk, not a reading, and let the head chef's ear decide, not the check alone.

On a 4-core cloud machine Chatterbox takes about 20 seconds for each second of speech, so a 90 second video's voice is about 25 minutes. Run it in the background. Kokoro takes about a second for each second of speech.

After any change to a page, run its storyboard again. The steps use the same selectors as the click tests. If a button moved, the film stops and names it ("nothing visible matches ...").

## Writing a storyboard

Copy `storyboards/prep.mjs`.
- **Who films it.** `who` is the person (`ann` and `bo` are cooks, `sam` is the sous chef), or `open: { admin: true }` for the head chef's admin panel.
- **Sentences.** Short, in Australian English, with no em dashes. Name only what is on screen.
- **Actions.** Each action names its sentence (`s`), its delay in seconds (`d`), and one of these:
  - `circle`, `underline`, `arrow`, `note`
  - `tap`, `type`, `key`
  - `top`, `scroll`, `clear`
  - `run` (a function)
- **Cuts.** A value can differ per cut (`{ phone, desktop }`). `only: 'phone'` keeps an action to one cut.
- **Selectors.** CSS, or Playwright's `text=` and `>> nth=`. Only the first visible match is used.

## Voices (the research, 18 November 2026)

All of these are free. Each was checked from a cloud session: it installs, and its model downloads.

| Voice | Good | Catch |
| --- | --- | --- |
| Kokoro-82M (Apache 2.0) | The most-cited free open voice. Natural, quick on a CPU (a 15 s line took about 13 s here, loading the model included), no account. | British or American accent only (`bf_`, `bm_`, `af_`, `am_` voices). |
| Chatterbox (Resemble AI, MIT) | Preferred over ElevenLabs by 63.75% in Resemble's own blind test. Copies a voice from a 10 to 20 second clip. | Much slower on a CPU than Kokoro. Adds an inaudible watermark. Clone only a voice whose owner said yes. |
| Microsoft Azure Speech, free tier | Real Australian voices (`en-AU-*`). 500,000 characters a month; the whole series is about 20,000. | Needs a free Azure account. The key goes in through the session's secure credential form for `<region>.tts.speech.microsoft.com` (header `Ocp-Apim-Subscription-Key`), never in chat or the repo. |
| Piper | Fast and free. | Sounds more robotic. Not used. |
| ElevenLabs free | The most human. | 10,000 characters a month, with attribution. Not used. |

The trial was made with Kokoro `bf_emma`. The sample pack had Emma, George, Heart, Michael and the Chatterbox default voice, plus two copies of the head chef's own voice.

**Chosen (head chef, 18 November 2026): Kokoro `af_heart`, the American female voice.** It is the default in `make.mjs` and `voice.py`. The head chef heard the Prep video in their own cloned voice and preferred not to use it, so the series uses Heart.

## Music

FreePD (public domain) closed in 2026. The music is "Easy Lemon" by Kevin MacLeod (incompetech.com), under Creative Commons: By Attribution 4.0.
- That licence needs the credit, so every outro carries it. Any description on YouTube or Drive should carry it too.
- `compose.mjs` downloads the track into `out/` (`MUSIC`). It is never committed.

## Privacy (this repo is public)

- Filmed only on the stand-in, with the click tests' made-up people: Sam, Ann, Bo and the synthetic Head chef.
- No real staff names, PINs, prices or the owner's email. Never film the admin identity card or Backup and PIN.
- Every outside request is refused while filming. A run lists any it refused, and should list none.
- Before uploading, look at a still of each step: `ffmpeg -ss <s> -i video.mp4 -frames:v 1 still.jpg`.

## In the book (head chef, 19 November 2026)

The head chef asked for the videos in Guides: the ones staff use for everyone, clearly labelled, and the head chef, sous chef and admin ones only for them. Their choices: YouTube, unlisted; the split below; the phone cut on phones and the desktop cut on computers; a quick check in place of the full service council.

**What the team sees**
- Guides has a **Videos** group, last, under the kitchen's own guides, with a Videos chip. One line says what they are: "How each page of the book works, in a minute or two. Tap one, then Play. Each has its steps written out too."
- Each video is a guide: its title, one line on what it shows, "Video, 1 min 32", and every step written out (the step's title and what the voice says). The search finds a video by its words.
- The guide page says Video tutorial and has one Play button above the steps. Play opens the player over the page, like a guide page opened big. Back, Close or Escape shut it; a redraw never restarts it.
- Under 700 px wide the phone (tall) cut plays, from 700 px the desktop (wide) cut. If only one is saved, that one plays.
- No link saved yet: "Video to come: the head chef adds it here. The steps below show the same."

**Who sees which**
- Everyone: Signing in, Home, Recipes, Prep list, Orders, Wastage, Transfers, Delivery received, Guides, Pings minutes and mail, Drinks run, Cleaning, Functions, Settings (14).
- The head chef, the sous chefs and the admin: also Today's team, the chef panel, Supplier order, Recipes and drawings and the three admin videos (21 in all). The list is `CHEFS` in `scripts/tutorials/order.mjs`.
- The chefs' videos are marked For chefs. Staff who open one by its address are told it is for chefs.

**Adding the links (the head chef)**
1. Upload each MP4 to YouTube as **Unlisted** (not Private: a private video does not play for the team). Unlisted videos do not show in YouTube search; anyone with the link can watch.
2. Admin, Kitchen, Guides, **Video tutorials**: one row per video, Computer (wide) and Phone (tall). Paste the link from YouTube's Share button. youtu.be, watch, shorts and embed links all work.
3. Save video links. A box that is not a YouTube link is marked, and Save names it.

**How it is kept**
- `kitchens/<PIN>/tutorials/staff` and `tutorials/chefs`, each `{ links: { <video>: { w, t } }, at, by }`: w the wide video's id, t the tall one's. Only the 11-character YouTube id is kept, never the link as typed, and the book plays only an id.
- `staff` is read by every kitchen login; `chefs` only by the head chef's Google account or a chef's PIN session (`chefId(reader())` in `firestore.rules`). So a cook's phone never has the chefs' links, even though the titles and steps of every video ship in `js/tutorials.js` (they hold nothing private).
- Only the head chef's Google account writes them: the two records, these three fields, at most 30 videos each.
- The admin box starts only from a server read of both records, so a phone without signal cannot save an empty list over the links.
- Reads: the list reads nothing. Opening a video guide reads `staff` once a day (1 read), and `chefs` too for a chef (1 more). The admin box reads both from the server when it opens (2 reads).
- The player is `https://www.youtube-nocookie.com/embed/<id>`, the one video site in the security header's `frame-src` (`index.html`). It loads only after Play.

**Moving previews (head chef, 19 November 2026, chose Both from a mock-up)**
- Each video card in the list shows a short, silent, sped-up loop of its page in action (the top of the phone recording, about 6 s, about 40 kB), with a small Play mark. The video's page shows a bigger loop (the computer recording, 16:9, about 120 kB) behind a round Play with "Play the video" on a dark fade. Before a link is saved, the page shows the loop with "Video to come" and no Play.
- A loop plays only while a mouse is over its card or the page's Play, and stops and shows its still again when the mouse leaves (head chef, 19 November 2026: "only when we hover, never on a touch screen"). `gvLoops()` in `js/prep.js` adds the hover to each after a draw. The player stops them.
- A phone or tablet (no hover: `(hover: hover) and (pointer: fine)` does not match), or a screen set to reduce motion or to save data, only ever shows the still picture and never loads a loop.
- Made by `node scripts/tutorials/previews.mjs --out <make.mjs output>` from `out/<id>/{phone,desktop}/compose/app.mp4`, then `catalogue.mjs` marks each video that has all four files (`pv`). Remade previews: raise `GV_PV` in `js/prep.js`.
- The addresses carry `?v=` so the saved copy (`sw.js`) passes them straight to the site and never keeps a video: an iPhone plays a video only when it can fetch it in parts.
- The files are public on the site, like `js/tutorials.js`. They show only the stand-in's made-up kitchen.

**After a storyboard changes**: run `node scripts/tutorials/catalogue.mjs --out <make.mjs output>` and commit `js/tutorials.js`. A new video in `ORDER` gets a guide and a row in the admin box by itself. If its `?v=` must change for phones to see it, bump it in `gVids()` in `js/prep.js`.

**Checks**: `tests/guide-videos.test.js` (who sees which, the moving previews (every file there, still until a mouse is over it, playing under the mouse and still again after, stopped under the player, never loaded on a touch screen or with reduce motion, shown before a link), Play on a phone and a computer, the player fits, Video to come, a bad saved link never played, the admin box and its save, no Save without the server); the `tutorials` rows in `tests/rules/rules.test.mjs`, `client-shapes.test.mjs` and `access.test.mjs`.

## The series, 18 and 19 November 2026

The head chef approved the look on the Prep list trial and said "go ahead and film the other pages". All 21 pages are filmed in both cuts, in the American female voice (Kokoro `af_heart`). Version 1.0: each page about 1 to 2 minutes, the whole book about 33 minutes per cut. The videos were sent in the session; the captions (one zip, `00 CAPTIONS - All videos - v1.0.zip`) are in the Drive folder. The order is `ORDER` in `make.mjs`, and `node scripts/tutorials/make.mjs join` joins them into one video per cut with chapter marks.

1. **Start:** Signing in (`sign-in`).
2. **Pages:** Home, Recipes, Prep list, Orders, Wastage, Transfers, Delivery received, Guides, Pings minutes and mail (`team-talk`), Drinks run, Today's team, Cleaning, Functions, Settings.
3. **Chef:** The chef panel, Supplier order, Recipes and drawings (`recipes-manage`).
4. **Admin:** Admin Today, Admin Reports, Admin Team and Kitchen. The last one ends the series with "That's the whole Kitchen Book".

Each page:
- has its own made-up data in its storyboard's `extra`
- passed the voice check on every line
- filmed with no page errors and no outside requests
- was checked one still per step, at the step's last sentence

### Known gaps, on purpose

- **Recipes.** The amount multiplier is not shown: staff's recipe card has none. It is only in the chef's recipe editor.
- **Keep screen on.** It is shown in the Phone cut only. The book offers it only on touch screens (`koCan()`), so the Desktop cut leaves it out. The Phone cut stands in a screen lock the way `tests/keep-screen-on.test.js` does.
- **Signing in, the kitchen PIN.** The PIN is not typed on screen. The stand-in's 6-digit test PIN does not fit the 4-digit box, so the video starts with it already on the device.
- **Signing in, the daily lock.** The 04:00 lock is said and its words are on screen, but only the shared screen's 10-minute lock is filmed (the clock jumps 11 minutes).
- **Settings.** The version line shows the files' real date (October), which is later than the filmed day in June.

### What went wrong while filming, and the fixes (for the next run)

- **The picture fell behind the voice.** It ran up to 10 s behind by the end of the admin videos while five pages filmed at once. There were two causes:
  - The screencast hands some frames over out of order on a busy machine. `compose.mjs` now lists frames in the order they were painted, and lines the cues up with the first painted frame.
  - The filmed intro ran longer than planned. The intro and outro are now held or cut to exactly their planned length.

  To check a video: the voice of a step and its picture should agree at the step's last sentence. Filming one page at a time also helps (`nice -n -10 node ...` gives the browser priority).
- **US dates.** Date and time boxes showed 06/16/2026 and 06:00 PM. The page's locale alone did not fix them: Chrome's own boxes follow the browser's start-up language. `kit.mjs` now starts it with `--lang=en-AU` and `LANG=en_AU.UTF-8`, so they read 16/06/2026 and 18:00. All pages were filmed again one at a time on 19 November.
- **Dialogs cover the chalk.** The device question and the chef hat menu sit above every other layer, chalk included. `sign-in.mjs` and `home.mjs` lift the chalk into a see-through popover on top. A future change to `overlay.js` could do this for every video.
- **Usage limits.** Five helper sessions filming in parallel used the 5-hour usage limit in about an hour, twice. Next time, run two at a time.

## Trial, 18 November 2026 (kept for the record)

The Prep list:
- Desktop: 95.5 s, 8.9 MB.
- Phone: 95.4 s, 11 MB.
- Eight steps: Today's list, Start here, Your section, Add a line, Quick add, Tick it off, On it, Change a line.

Each step was checked on stills:
- the circle is on the right control
- the captions are readable
- no outside requests and no page errors
- -16 LUFS

The rest of the series waits for the head chef's OK on the look and the voice.
