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

The book itself does not change. A script films it and nothing is added to the app.

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

## Not done here

Showing the videos inside the book (a link or player in Guides) would change the app:
- a new guide field
- the rules
- the security header, which has no `media-src` and no YouTube or Drive `frame-src`

That goes through the service council and the head chef's OK first.

## Trial, 18 November 2026

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
