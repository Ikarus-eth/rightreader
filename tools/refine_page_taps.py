from pathlib import Path
p=Path('src/app-source.jsx')
s=p.read_text()

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: {n} matches')
    s=s.replace(old,new,1)

once('''.reader{height:100%;width:100%;padding:22px 4px 38px;font-size:var(--rsize);line-height:var(--rlead);
  letter-spacing:.003em;overflow:hidden;column-fill:auto;scroll-behavior:auto}''','''.reader{height:100%;width:auto;margin-inline:clamp(28px,7vw,60px);padding:22px 0 38px;font-size:var(--rsize);line-height:var(--rlead);
  letter-spacing:.003em;overflow:hidden;column-fill:auto;scroll-behavior:auto}''','reader gutters')

once('''    if(!bodyRef.current) return;
    if(!el||!bodyRef.current.contains(el)){
      dismissReaderTip();
      const box=bodyRef.current.getBoundingClientRect();
      const x=e.clientX-box.left;
      if(x<box.width*.30) turnPage(-1);
      else if(x>box.width*.70) turnPage(1);
      return;
    }
    dismissReaderTip();''','''    if(!bodyRef.current) return;
    if(!el||!bodyRef.current.contains(el)) return;
    dismissReaderTip();''','word tap only')

needle='''  function vocabKeyFor(cacheKey,d){'''
insert='''  function onPageTap(e){
    if(press.current.fired) return;
    if(e.target.closest&&e.target.closest(".w,.reader-tip,button")) return;
    const shell=e.currentTarget.getBoundingClientRect();
    const x=e.clientX-shell.left;
    /* Wide edge zones, but the text column itself is inset so ordinary page
       turns do not compete with word lookup taps. */
    if(x<shell.width*.28){ dismissReaderTip(); turnPage(-1); }
    else if(x>shell.width*.72){ dismissReaderTip(); turnPage(1); }
  }

  function vocabKeyFor(cacheKey,d){'''
once(needle,insert,'page tap handler')

once('''          <div className="reader-shell">''','''          <div className="reader-shell" onClick={onPageTap}>''','shell page click')

p.write_text(s)
print('page tap refinement applied')
