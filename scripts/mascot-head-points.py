#!/usr/bin/env python3
"""Where the mascot's head is in each of his 99 pictures, for the festive hats on Home (head chef, 17 Nov 2026;
docs/kitchen-mascot.md, Festive hats on Home; docs/mascot-festive-options/brief.md).

Run it only when the art in art/mascot/ changes. It needs Python 3 and Pillow (pip install Pillow).

    python3 scripts/mascot-head-points.py           prints the table and the art's sum
    python3 scripts/mascot-head-points.py --write   puts them into js/mascot.js, between its HEAD markers

For each of the 11 sprite sheets (4 x 2 frames of 192 x 256 px) and the 11 stills it measures:
  x, y  the top point of his yellow star (the topmost yellow row, the middle of its pixels in the top 4 rows)
  t     the star's lean in degrees, from the star's middle to that point, less 1.5 (his drawn star leans 1.5 degrees)
  s     his size against the Welcome still, once per action: the drop from the star's point to the top of his eyes,
        the middle value of its 9 pictures, 1 within 6 per cent of it, else to the nearest 0.05 (so a hat never
        changes size by a pixel between the frames of one play)
tests/mascot-hats.test.js checks the art against SUM, so a redrawn picture fails the click tests until this runs again.
"""
import hashlib, math, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'art', 'mascot')
JS = os.path.join(ROOT, 'js', 'mascot.js')
ACTIONS = ['idle', 'welcome', 'look-around', 'recipe-reading', 'ready-to-cook', 'smash', 'flip', 'build', 'burger', 'walk', 'smoker']


def yellow(p):
    return p[3] > 200 and p[0] > 190 and p[1] > 140 and p[2] < 110 and p[0] - p[2] > 110


def cyan(p):
    return p[3] > 200 and p[1] > 200 and p[2] > 200 and p[0] < 120


def measure(im):
    px = im.load(); w, h = im.size
    star = [(x, y) for y in range(h) for x in range(w) if yellow(px[x, y])]
    eyes = [y for y in range(h) for x in range(w) if cyan(px[x, y])]
    top = min(y for _, y in star)
    tip = [x for x, y in star if y <= top + 3]
    tx = sum(tip) / len(tip)
    cx = sum(x for x, _ in star) / len(star); cy = sum(y for _, y in star) / len(star)
    lean = math.degrees(math.atan2(tx - cx, cy - top)) - 1.5
    return tx, top, lean, min(eyes) - top


def frames(action):
    sheet = Image.open(os.path.join(ART, action + '-sheet-compact.webp')).convert('RGBA')
    return [sheet.crop(((f % 4) * 192, (f // 4) * 256, (f % 4) * 192 + 192, (f // 4) * 256 + 256)) for f in range(8)]


def files():
    return sorted(f for f in os.listdir(ART) if f.endswith('-sheet-compact.webp') or f.endswith('-still.png'))


def art_sum():
    h = hashlib.sha256()
    for f in files():
        h.update(f.encode() + b':' + hashlib.sha256(open(os.path.join(ART, f), 'rb').read()).hexdigest().encode() + b'\n')
    return h.hexdigest()


def main():
    ref = measure(Image.open(os.path.join(ART, 'welcome-still.png')).convert('RGBA'))[3]
    rows = []
    for a in ACTIONS:
        pts = [measure(fr) for fr in frames(a)] + [measure(Image.open(os.path.join(ART, a + '-still.png')).convert('RGBA'))]
        mid = sorted(d / ref for *_, d in pts)[4]
        size = 1 if abs(mid - 1) <= 0.06 else round(mid * 20) / 20
        cells = ','.join('[%g,%d,%g]' % (round(x, 1), y, round(t, 1)) for x, y, t, _ in pts)
        rows.append("    '%s': [%g,%s]" % (a, size, cells))
    block = ("  // HEAD points start: made by scripts/mascot-head-points.py from the art, never by hand. Per action, frames 0 to 7\n"
             "  // of its sheet, then its still: his size against the Welcome still, then [x, y of his star's top point, lean].\n"
             "  var HEAD_SUM = '%s', HEAD = {\n%s\n  };\n  // HEAD points end" % (art_sum(), ',\n'.join(rows)))
    if '--write' not in sys.argv:
        print(block); return
    src = open(JS).read()
    out, n = re.subn(r'  // HEAD points start.*?// HEAD points end', lambda m: block, src, flags=re.S)
    if n != 1: sys.exit('js/mascot.js has no HEAD markers')
    open(JS, 'w').write(out)
    print('js/mascot.js: %d pictures, sum %s' % (len(ACTIONS) * 9, art_sum()))


if __name__ == '__main__':
    main()
