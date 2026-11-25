# Device coverage: counts the click test files that name each page and each width.
# Usage, from the repo root: python3 docs/device-coverage/tests_matrix.py
# Approximate: a file counts for a page when it names the route, and for a width when it names that width
# anywhere (width: N, or [N, H, touch]). Wide and touch means a width of 1100 or more with touch: true.
import re,glob,collections
routes=['#/','#/recipes','#/r/','#/prep','#/orders','#/waste','#/transfers','#/deliveries','#/guides','#/minutes','#/mail','#/drinks','#/todo','#/team','#/chef','#/admin','#/settings','#/manage','#/fn','#/fn/now','#/functions','#/suppliers','#/cleaning']
res=collections.defaultdict(collections.Counter)
for f in sorted(glob.glob('tests/*.test.js')):
    s=open(f).read(); rs=set()
    for r in routes:
        if r=='#/':
            if re.search(r"[\'\"`]#/[\'\"`]",s): rs.add(r)
        elif r=='#/fn':
            if re.search(r"[\'\"`]#/fn([\'\"`]|/)",s): rs.add(r)
        elif r=='#/r/':
            if re.search(r"[\'\"`]#/r/",s): rs.add(r)
        elif re.search(re.escape(r)+r"([\'\"`/]|\b)",s): rs.add(r)
    ws=set(int(x) for x in re.findall(r'width:\s*(\d{3,4})',s))|set(int(x) for x in re.findall(r'\[\s*(\d{3,4})\s*,\s*\d{3,4}\s*,\s*(?:true|false)',s))
    wt=bool(re.search(r'width:\s*(1[1-9]\d\d|2\d\d\d)[^}\n]{0,120}touch:\s*true',s) or re.search(r'\[\s*(1[1-9]\d\d|2\d\d\d)\s*,\s*\d{3,4}\s*,\s*true',s))
    for r in rs:
        c=res[r]; c['files']+=1
        c['tablet']+=any(600<=w<1100 for w in ws); c['laptop']+=any(1100<=w<1600 for w in ws)
        c['1920']+=any(w>=1600 for w in ws); c['wide+touch']+=wt
print('route files tablet laptop 1920 wide+touch')
for r in routes:
    c=res[r]; print(r,c['files'],c['tablet'],c['laptop'],c['1920'],c['wide+touch'])
