# Device coverage (docs/device-coverage.md): which widths each merged pull request's text names.
# Usage: python3 analyse.py <dir>. <dir> holds merged.jsonl (one {n,t,m,b} per pull request, from the
# gh search in "How it was made") and map.json (pull request number -> {files, parents, h, s}, from git log).
# Writes <dir>/analysis.json. Run from the repo root.
import sys,json,re,collections
sp=sys.argv[1]
rows={}
for l in open(sp+'/merged.jsonl'):
    r=json.loads(l); rows[r['n']]=r
m=json.load(open(sp+'/map.json'))
W={320,360,375,390,393,412,414,430,568,600,640,720,744,768,800,810,820,834,900,1000,1024,1100,1180,1194,1280,1366,1440,1536,1600,1680,1920,2560}
def strip(b):
    b=re.sub(r'<!--.*?-->','',b or '',flags=re.S)
    return b
SKIP=re.compile(r'(from|below|under|above|over|min-width:?|max-width:?|up to|wider than|narrower than|less than|more than|breakpoint|until)\s*$',re.I)
def widths(b):
    b=strip(b)
    found=set(); ctxs=[]
    heights=set()
    for mm in re.finditer(r'(?<![\d.])(\d{3,4})\s*(?:x|×|by)\s*(\d{3,4})(?![\d.])',b):
        heights.add(mm.start(2))
    for mm in re.finditer(r'(?<![\d.])(\d{3,4})(?![\d.])',b):
        n=int(mm.group(1))
        if n not in W or mm.start() in heights: continue
        pre=b[max(0,mm.start()-22):mm.start()]
        if SKIP.search(pre): continue
        ctx=b[max(0,mm.start()-40):mm.end()+40].lower()
        if re.search(r'px|\bx\s*\d|\d\s*x\b|×|wide|width|phone|tablet|laptop|desktop|screen|viewport',ctx):
            found.add(n); ctxs.append((n,b[max(0,mm.start()-50):mm.end()+30].replace('\n',' ')))
    return found,ctxs
def bucket(ws):
    return {'phone':any(w<600 for w in ws),'tablet':any(600<=w<1100 for w in ws),'laptop':any(1100<=w<1600 for w in ws),'section':any(w>=1600 for w in ws)}
FILEAREA=[('js/cleaning','Cleaning'),('js/suppliers','Suppliers and cut-offs'),('js/supplier-','Suppliers and cut-offs'),('js/deliveries','Deliveries'),('js/fnedit','Functions'),('js/functions','Functions'),('js/manage','Recipe editor and drawings'),('js/draw','Recipe editor and drawings'),('js/library','Recipe editor and drawings'),('js/lib/','Recipe editor and drawings'),('js/admin-','Admin and chef panel'),('js/proofreader','Admin and chef panel'),('js/analysis','Admin and chef panel'),('js/mascot','Mascot'),('js/fools','April Fools'),('js/seasonal','Seasonal'),('js/cooling','Cooling clock'),('js/recipe-print','Recipes'),('js/tutorials','Guides'),('js/roster-import',"Today's team")]
KW=[(r'\bprep\b','Prep'),(r'\borders\b|order list|\bOrders\b|order requests?|\brequests?\b','Orders'),(r'wastage','Wastage'),(r'transfer','Transfers'),(r"today's team|\bteam\b|\bbreak|roster|\bshift",  "Today's team"),(r'\bhome\b|welcome','Home'),(r'cleaning|pack down','Cleaning'),(r'recipe|allergen|print cards','Recipes'),(r'function|platter|booking','Functions'),(r'admin|dashboard|inbox|\breports?\b|people page|people room|\bpeople\b roster|chef panel|chef hat|kitchen room','Admin and chef panel'),(r'guide','Guides'),(r'settings','Settings'),(r'sign in|signing in|sign-in|\bpin\b|\block(s|ed)?\b|lock screen|unlock','Sign in and lock'),(r'supplier|cut-off|cutoff','Suppliers and cut-offs'),(r'deliver','Deliveries'),(r'minutes','Minutes'),(r'\bmail\b','Mail'),(r'drinks','Drinks'),(r'to-do|todo','Chef to-do'),(r'mascot','Mascot'),(r'\bpings?\b','Pings'),(r'sheet|swipe|modal|picker|\bsave bar|search','Shared controls and sheets'),(r'top bar|\btabs?\b','Top bar and tabs'),(r'cooling|operandio','Cooling clock'),(r'records','Admin and chef panel'),(r'celebrat|christmas|new year|festive','Seasonal')]
out=[]
for ns,c in m.items():
    n=int(ns); r=rows.get(n)
    if not r: continue
    files=c['files']
    vis=[f for f in files if f=='index.html' or (f.startswith('css/')) or (f.startswith('js/') and f not in ('js/data.js','js/overlay.js','js/art.js'))]
    recipe=[f for f in files if f in ('js/data.js','js/art.js')]
    if not vis:
        kind='recipe' if recipe else 'none'
    else: kind='visible'
    areas=set()
    for pre,a in FILEAREA:
        if any(f.startswith(pre) for f in vis): areas.add(a)
    t=r['t']
    for pat,a in KW:
        if re.search(pat,t,re.I): areas.add(a)
    if kind=='visible' and not areas: areas.add('Other')
    ws,ctx=widths(r['b']); b=bucket(ws)
    words=bool(re.search(r'wide screen|wide-screen|kitchen screen|section screen|big screen|large screen|\b1440\b|desktop',strip(r['b']),re.I))
    out.append({'n':n,'t':t,'d':(r['m'] or '')[:10],'kind':kind,'areas':sorted(areas),'ws':sorted(ws),'words':words,'ctx':ctx[:6],**b})
json.dump(out,open(sp+'/analysis.json','w'))
vis=[o for o in out if o['kind']=='visible']
print('merged',len(out),'visible',len(vis),'recipe-only',sum(o['kind']=='recipe' for o in out),'no app file',sum(o['kind']=='none' for o in out))
for k in ['phone','tablet','laptop','section']:
    print(k, sum(o[k] for o in vis))
print('words only (no width) about big screens', sum(o['words'] and not o['section'] for o in vis))
print('none named', sum(not(o['phone'] or o['tablet'] or o['laptop'] or o['section']) for o in vis))
c=collections.Counter(a for o in vis for a in o['areas'])
print('\n'.join(f'{a}: {k}' for a,k in c.most_common()))
print([ (o['n'],o['ws']) for o in vis if o['section']][:40])
d=[o['d'] for o in vis]; print(min(d),max(d))
