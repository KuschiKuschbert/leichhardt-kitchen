# Device coverage: writes the per pull request list from <dir>/analysis.json.
# Usage: python3 write_prs.py <dir> docs/device-coverage/prs.md
import sys,json,datetime
sp,out=sys.argv[1],sys.argv[2]
a=[o for o in json.load(open(sp+'/analysis.json')) if o['kind']=='visible']
a.sort(key=lambda o:-o['n'])
def qld(d):
    return d  # filled below from merged.jsonl
rows={}
for l in open(sp+'/merged.jsonl'):
    r=json.loads(l); rows[r['n']]=r['m']
def qdate(n):
    m=rows.get(n)
    if not m: return ''
    t=datetime.datetime.strptime(m,'%Y-%m-%dT%H:%M:%SZ')+datetime.timedelta(hours=10)
    return t.strftime('%d %b')
L=[]
L.append('# Device coverage: every pull request that changed what people see\n')
L.append('The evidence list behind [device-coverage.md](../device-coverage.md). One row for each merged pull request that changed a file the book draws with (`index.html`, `css/`, or `js/` other than the recipe data `js/data.js`, `js/overlay.js` and `js/art.js`), newest first. Built on 26 November 2026 from the 861 merged pull requests up to #887 (857 matched to their commit on `main`, 4 not), with the commands in [How it was made](../device-coverage.md#how-it-was-made).\n')
L.append('**Named** means the pull request text names that width (for example "at 390 px" or "1280 x 900"). It is not proof it was measured, and leaving a width out is not proof it was missed. Breakpoints ("from 768 px"), heights and the pull request template\'s own notes are not counted. Phone is under 600 px, tablet 600 to 1099, laptop 1100 to 1599, section screen 1600 and over. **Words** marks text that talks about wide, kitchen or section screens or desktop without a section-screen width. Pages are read from the title and the files, so they are approximate.\n')
L.append('| PR | Merged | Pages | Phone | Tablet | Laptop | Section screen | Words | Widths named |')
L.append('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
y=lambda b:'yes' if b else ''
for o in a:
    t=o['t'].replace('|','/')
    if len(t)>90: t=t[:87].rstrip()+'...'
    L.append(f"| #{o['n']} {t} | {qdate(o['n'])} | {', '.join(o['areas'])} | {y(o['phone'])} | {y(o['tablet'])} | {y(o['laptop'])} | {y(o['section'])} | {y(o['words'] and not o['section'])} | {', '.join(map(str,o['ws']))} |")
open(out,'w').write('\n'.join(L)+'\n')
print(len(a),'rows')
