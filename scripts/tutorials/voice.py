"""The voice over for the tutorial videos (docs/tutorial-videos.md).

  python voice.py say  --engine kokoro --voice af_heart --script lines.json --out DIR
      lines.json is [{"id": "s01", "text": "..."}]. Writes DIR/<id>.wav (24 kHz mono) for each line and
      DIR/durations.json ({"id": seconds}). A line already made with the same words, engine and voice is kept.
  python voice.py mix  --cues cues.json --out narration.wav
      cues.json is {"length": seconds, "cues": [{"wav": path, "at": seconds}]}: every line placed where the film says.

Engines, all free (the research is in docs/tutorial-videos.md):
  kokoro      Kokoro-82M, open (Apache 2.0), runs here on the CPU. Voices bf_* and bm_* are British, af_* and am_* American.
  chatterbox  Resemble AI's Chatterbox (MIT). --ref clip.wav copies the voice of a 10 to 20 second clip, used only with
              the permission of the person speaking. Needs its own Python 3.11 venv (see the docs).
  azure       Microsoft Azure Speech free tier, for real Australian voices (en-AU-*). The key is never in the repo: the
              session's network proxy adds it, or AZURE_SPEECH_KEY holds it. AZURE_SPEECH_REGION says where (australiaeast).
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.request
from xml.sax.saxutils import escape

RATE = 24000

# Words the voices say wrong, spelt the way they should sound. Only the voice reads these; captions keep the real words.
SAY_AS = {
    'Leichhardt': 'Like-hart',
    'PIN': 'pin',
    'PINs': 'pins',
    '04:00': '4 am',
    'Qld': 'Queensland',
}


def spoken(text):
    for k, v in SAY_AS.items():
        text = text.replace(k, v)
    return text


def write_wav(path, audio):
    import numpy as np
    import soundfile as sf
    sf.write(path, np.asarray(audio, dtype='float32'), RATE, subtype='PCM_16')


class Kokoro:
    def __init__(self, voice, speed):
        # Kokoro reads unusual words with eSpeak. The copy pip installs (espeakng-loader) looks for its data where it was
        # built and stops the program, so the system's eSpeak is used when there is one (apt-get install libespeak-ng1).
        import misaki.espeak  # noqa: F401  (sets the pip copy first; the lines below replace it)
        from phonemizer.backend.espeak.wrapper import EspeakWrapper
        for lib in ('/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1', '/usr/lib/aarch64-linux-gnu/libespeak-ng.so.1', '/opt/homebrew/lib/libespeak-ng.dylib'):
            if os.path.exists(lib):
                EspeakWrapper.set_library(lib)
                EspeakWrapper.set_data_path(None)
                break
        from kokoro import KPipeline
        self.voice, self.speed = voice, speed
        self.pipe = KPipeline(lang_code='b' if voice.startswith('b') else 'a', repo_id='hexgrad/Kokoro-82M')

    def make(self, text, path):
        import numpy as np
        parts = [a.numpy() if hasattr(a, 'numpy') else a for _, _, a in self.pipe(text, voice=self.voice, speed=self.speed)]
        write_wav(path, np.concatenate(parts) if parts else np.zeros(RATE // 4))


class Chatterbox:
    def __init__(self, voice, speed):
        from chatterbox.tts import ChatterboxTTS
        self.ref = voice if voice and os.path.exists(voice) else None
        self.model = ChatterboxTTS.from_pretrained(device='cpu')

    def make(self, text, path):
        import numpy as np
        from scipy.signal import resample_poly
        wav = self.model.generate(text, audio_prompt_path=self.ref, exaggeration=0.45, cfg_weight=0.5)
        a = wav.squeeze().cpu().numpy()
        if self.model.sr != RATE:
            a = resample_poly(a, RATE, self.model.sr)
        write_wav(path, a)


class Azure:
    def __init__(self, voice, speed):
        self.voice, self.speed = voice, speed
        self.region = os.environ.get('AZURE_SPEECH_REGION', 'australiaeast')
        # with the network proxy holding the real key, any value here is replaced on the way out
        self.key = os.environ.get('AZURE_SPEECH_KEY', 'proxy-adds-the-key')

    def make(self, text, path):
        lang = '-'.join(self.voice.split('-')[:2])
        rate = '{:+d}%'.format(round((self.speed - 1) * 100))
        ssml = ('<speak version="1.0" xml:lang="%s"><voice name="%s"><prosody rate="%s">%s</prosody></voice></speak>'
                % (lang, self.voice, rate, escape(text)))
        req = urllib.request.Request(
            'https://%s.tts.speech.microsoft.com/cognitiveservices/v1' % self.region, data=ssml.encode('utf-8'), method='POST',
            headers={'Ocp-Apim-Subscription-Key': self.key, 'Content-Type': 'application/ssml+xml',
                     'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm', 'User-Agent': 'kitchen-book-tutorials'})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, 'wb') as f:
            f.write(r.read())


ENGINES = {'kokoro': Kokoro, 'chatterbox': Chatterbox, 'azure': Azure}


def say(a):
    import soundfile as sf
    lines = json.load(open(a.script))
    os.makedirs(a.out, exist_ok=True)
    meta_path = os.path.join(a.out, 'durations.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    old = meta.get('_made', {})
    engine, made = None, {}
    for ln in lines:
        words = spoken(ln['text'])
        key = hashlib.sha256('|'.join([a.engine, a.voice, str(a.speed), words]).encode()).hexdigest()[:16]
        wav = os.path.join(a.out, ln['id'] + '.wav')
        if old.get(ln['id']) != key or not os.path.exists(wav):
            if engine is None:
                engine = ENGINES[a.engine](a.voice, a.speed)
            print('voice:', ln['id'], words, file=sys.stderr)
            engine.make(words, wav)
        made[ln['id']] = key
        meta[ln['id']] = round(sf.info(wav).duration, 3)
    meta['_made'] = made
    json.dump(meta, open(meta_path, 'w'), indent=1)


def mix(a):
    import numpy as np
    import soundfile as sf
    spec = json.load(open(a.cues))
    out = np.zeros(int(spec['length'] * RATE) + RATE, dtype='float32')
    for c in spec['cues']:
        clip, sr = sf.read(c['wav'], dtype='float32')
        if clip.ndim > 1:
            clip = clip.mean(axis=1)
        assert sr == RATE, c['wav'] + ' is not 24 kHz'
        i = int(round(c['at'] * RATE))
        end = min(len(out), i + len(clip))
        out[i:end] += clip[:end - i]
    peak = float(np.max(np.abs(out))) or 1.0
    if peak > 0.98:
        out *= 0.98 / peak
    sf.write(a.out, out[:int(spec['length'] * RATE)], RATE, subtype='PCM_16')


def check(a):
    """Listens back to every line with a speech-to-text model (faster-whisper) and lists the ones that do not say their words.
    A cloned voice can drop or mumble words; nobody has to listen to every line to find them. Exits 1 when a line is off."""
    import difflib
    import re
    from faster_whisper import WhisperModel
    nums = dict(zip('0 1 2 3 4 5 6 7 8 9 10'.split(), 'zero one two three four five six seven eight nine ten'.split()))
    # the model writes small numbers as digits and cannot hear write from right: neither is a fault in the voice
    same = dict(nums, right='write', its="it's")
    words = lambda s: [same.get(w, w) for w in re.sub(r"[^a-z0-9' ]+", ' ', s.lower().replace('-', ' ')).split()]
    model = WhisperModel(a.model, device='cpu', compute_type='int8')
    bad = 0
    import numpy as np
    import soundfile as sf
    for ln in json.load(open(a.script)):
        # read here, at 16 kHz mono, so the model needs no audio decoder of its own (PyAV versions differ)
        x, sr = sf.read(os.path.join(a.out, ln['id'] + '.wav'), dtype='float32')
        if x.ndim > 1:
            x = x.mean(axis=1)
        if sr != 16000:
            x = np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype('float32')
        segs, _ = model.transcribe(x, language='en', beam_size=5)
        heard = ' '.join(s.text for s in segs).strip()
        want, got = words(spoken(ln['text'])), words(heard)
        # by word, or by letter with the spaces taken out (the model writes "prep list" as "preplist" now and then)
        score = max(difflib.SequenceMatcher(None, want, got).ratio(), difflib.SequenceMatcher(None, ''.join(want), ''.join(got)).ratio() - 0.05)
        ok = score >= a.min
        bad += not ok
        print('%s %-6s %.2f  %s%s' % ('ok ' if ok else 'BAD', ln['id'], score, heard, '' if ok else '   (wanted: ' + ln['text'] + ')'))
    print('%d of %d lines need another take' % (bad, len(json.load(open(a.script)))))
    sys.exit(1 if bad else 0)


def retake(a):
    """Makes the named lines again with another seed, for a line check() flagged."""
    import random
    meta_path = os.path.join(a.out, 'durations.json')
    meta = json.load(open(meta_path))
    for i in a.ids.split(','):
        meta.get('_made', {}).pop(i, None)
        wav = os.path.join(a.out, i + '.wav')
        if os.path.exists(wav):
            os.remove(wav)
    json.dump(meta, open(meta_path, 'w'), indent=1)
    try:
        import torch
        torch.manual_seed(a.seed or random.randrange(1 << 30))
    except ImportError:
        pass
    say(a)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest='cmd', required=True)
    for name in ('say', 'retake'):
        s = sub.add_parser(name)
        s.add_argument('--engine', default='kokoro', choices=sorted(ENGINES))
        s.add_argument('--voice', default='af_heart')
        s.add_argument('--speed', type=float, default=1.0)
        s.add_argument('--script', required=True)
        s.add_argument('--out', required=True)
        if name == 'retake':
            s.add_argument('--ids', required=True, help='line ids, comma separated')
            s.add_argument('--seed', type=int, default=0)
    m = sub.add_parser('mix')
    m.add_argument('--cues', required=True)
    m.add_argument('--out', required=True)
    c = sub.add_parser('check')
    c.add_argument('--script', required=True)
    c.add_argument('--out', required=True)
    c.add_argument('--model', default='base.en')
    c.add_argument('--min', type=float, default=0.8)
    a = p.parse_args()
    {'say': say, 'mix': mix, 'check': check, 'retake': retake}[a.cmd](a)
