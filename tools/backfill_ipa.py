from pathlib import Path

p=Path('src/app-source.jsx')
s=p.read_text()

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s.replace(old,new,1)

once(
'''      const have=normalizeEntry(wcache[key]);
      if((have&&have.senses.length)||knownSet.has(key)) continue;''',
'''      const have=normalizeEntry(wcache[key]);
      const haveIpa=!!(have&&have.senses.length&&have.senses.every(x=>String(x.ipa||"").trim()));
      if(haveIpa||knownSet.has(key)) continue;''',
'prefetch old cache')

once(
'''        if(have&&have.senses.length) continue;''',
'''        if(haveIpa) continue;''',
'prefetch expression old cache')

once(
'''    const entry=normalizeEntry(wcache[cacheKey]);
    bump(cacheKey);

    if(!entry||!entry.senses.length){''',
'''    const entry=normalizeEntry(wcache[cacheKey]);
    const missingIpa=!!(entry&&entry.senses.some(x=>!String(x.ipa||"").trim()));
    bump(cacheKey);

    /* Cache entries created before IPA support are still useful for meaning,
       but they cannot satisfy the pronunciation UI. Refresh them once on tap;
       mergeSense updates the existing sense rather than duplicating it. */
    if(!entry||!entry.senses.length||missingIpa){''',
'live old cache')

p.write_text(s)

out=p.read_text()
for needle in ['const missingIpa=', 'const haveIpa=', '||missingIpa']:
    if needle not in out: raise SystemExit('missing '+needle)
print('IPA cache backfill applied')
