from pathlib import Path

p=Path('src/app-source.jsx')
s=p.read_text()

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s.replace(old,new,1)

# IPA in model output, cache, saved words and UI.
once(
'''const SHAPE='{"span":"...","lemma":"...","sense":"a 1-3 word label for which meaning this is","also":["0-2 short English phrases naming OTHER common, clearly different meanings; empty array if not ambiguous"],"alsoDe":["German for each phrase in also, same order and count"],"en":"one very simple English sentence, max 14 easy words, explaining what it means HERE","de":"the German translation as used here, 1-3 words","deDesc":"one simple German sentence, max 14 words, explaining it"}';''',
'''const SHAPE='{"span":"...","lemma":"...","sense":"a 1-3 word label for which meaning this is","ipa":"British English IPA for span, between /slashes/, one pronunciation only","also":["0-2 short English phrases naming OTHER common, clearly different meanings; empty array if not ambiguous"],"alsoDe":["German for each phrase in also, same order and count"],"en":"one very simple English sentence, max 14 easy words, explaining what it means HERE","de":"the German translation as used here, 1-3 words","deDesc":"one simple German sentence, max 14 words, explaining it"}';''',
'lookup shape')

once(
'''    `For each give: "word" (exactly as listed), "lemma", "sense" (1-3 word label), "also" (0-2 short English phrases naming other common, clearly different meanings; empty array if not ambiguous), "alsoDe" (German for each, same order and count), "en" (one very simple English sentence, max 14 easy words), "de" (German translation, 1-3 words), "deDesc" (one simple German sentence, max 14 words).`,''',
'''    `For each give: "word" (exactly as listed), "lemma", "sense" (1-3 word label), "ipa" (British English IPA for the word, between /slashes/, one pronunciation only), "also" (0-2 short English phrases naming other common, clearly different meanings; empty array if not ambiguous), "alsoDe" (German for each, same order and count), "en" (one very simple English sentence, max 14 easy words), "de" (German translation, 1-3 words), "deDesc" (one simple German sentence, max 14 words).`,''',
'batch fields')

once(
'''    `{"words":[{"word":"...","lemma":"...","sense":"...","also":[],"alsoDe":[],"en":"...","de":"...","deDesc":"..."}]}`''',
'''    `{"words":[{"word":"...","lemma":"...","sense":"...","ipa":"/.../","also":[],"alsoDe":[],"en":"...","de":"...","deDesc":"..."}]}`''',
'batch shape')

once(
'''              en:String(r.en||""),de:String(r.de||""),deDesc:String(r.deDesc||""),''',
'''              ipa:String(r.ipa||""),en:String(r.en||""),de:String(r.de||""),deDesc:String(r.deDesc||""),''',
'prefetch ipa')

once(
'''      const d={span:String(j.span||surface),lemma:String(j.lemma||surface),sense:String(j.sense||""),
        en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),''',
'''      const d={span:String(j.span||surface),lemma:String(j.lemma||surface),sense:String(j.sense||""),
        ipa:String(j.ipa||""),en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),''',
'live ipa')

once(
'''          const d={span:String(j.span||word),lemma:String(j.lemma||word),sense:String(j.sense||""),
            en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),''',
'''          const d={span:String(j.span||word),lemma:String(j.lemma||word),sense:String(j.sense||""),
            ipa:String(j.ipa||""),en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),''',
'nested ipa')

once(
'''        ctx:top.sentence,en:d.en,de:d.de,dd:d.deDesc,
        also:d.also,alsoDe:d.alsoDe,''',
'''        ctx:top.sentence,ipa:d.ipa,en:d.en,de:d.de,dd:d.deDesc,
        also:d.also,alsoDe:d.alsoDe,''',
'save ipa')

once(
'''.headword{font-size:31px;font-weight:800;flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.15;color:#20392D}''',
'''.headword{font-size:31px;font-weight:800;flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.15;color:#20392D}
.ipa{font-family:"Charis SIL","Doulos SIL","Times New Roman",serif;color:var(--ink2);font-size:17px;letter-spacing:.02em;margin:3px 0 8px}''',
'ipa css')

once(
'''        {top.level===0
          ? <Ctx sentence={top.sentence} span={d?d.span:top.word}/>
          : <div className="ctx">from the explanation</div>}''',
'''        {d&&d.ipa&&<div className="ipa">{d.ipa}</div>}
        {top.level===0
          ? <Ctx sentence={top.sentence} span={d?d.span:top.word}/>
          : <div className="ctx">from the explanation</div>}''',
'word sheet ipa')

once(
'''              {e.en&&<div className="en">{e.en}</div>}''',
'''              {e.ipa&&<div className="ipa">{e.ipa}</div>}
              {e.en&&<div className="en">{e.en}</div>}''',
'word list ipa')

# Hidden reader chrome that appears when the top of the reading screen is tapped.
once(
'''.reader-shell{position:relative;height:calc(100dvh - 73px);overflow:hidden;touch-action:manipulation}''',
'''.reader-shell{position:relative;height:100dvh;overflow:hidden;touch-action:manipulation}
.reader-topbar{position:absolute;left:0;right:0;top:0;z-index:12;background:rgba(255,248,227,.96);
  backdrop-filter:saturate(135%) blur(14px);border-bottom:1px solid rgba(211,185,126,.55);
  box-shadow:0 3px 14px rgba(81,68,35,.08);transition:opacity .16s ease,transform .16s ease}
.reader-topbar.hidden{opacity:0;transform:translateY(-18px);pointer-events:none}''',
'reader topbar css')

once(
'''  const [showReaderTip,setShowReaderTip]=useState(()=>!lsGet("readerTipSeen",false));
  const [pageInfo,setPageInfo]=useState({page:0,total:1});''',
'''  const [showReaderTip,setShowReaderTip]=useState(()=>!lsGet("readerTipSeen",false));
  const [readerMenuOpen,setReaderMenuOpen]=useState(false);
  const [pageInfo,setPageInfo]=useState({page:0,total:1});''',
'menu state')

once(
'''  useEffect(()=>{
    document.body.classList.toggle("reading-mode",view==="read");
    return ()=>document.body.classList.remove("reading-mode");
  },[view]);''',
'''  useEffect(()=>{
    document.body.classList.toggle("reading-mode",view==="read");
    return ()=>document.body.classList.remove("reading-mode");
  },[view]);
  useEffect(()=>{ if(view!=="read") setReaderMenuOpen(false); },[view,chapIdx,book?book.meta.id:null]);''',
'menu reset')

once(
'''  function onPageTap(e){
    if(press.current.fired) return;
    if(e.target.closest&&e.target.closest(".w,.reader-tip,button")) return;
    const shell=e.currentTarget.getBoundingClientRect();
    const x=e.clientX-shell.left;
    /* Wide edge zones, but the text column itself is inset so ordinary page
       turns do not compete with word lookup taps. */
    if(x<shell.width*.28){ dismissReaderTip(); turnPage(-1); }
    else if(x>shell.width*.72){ dismissReaderTip(); turnPage(1); }
  }''',
'''  function onPageTap(e){
    if(press.current.fired) return;
    if(e.target.closest&&e.target.closest(".w,.reader-tip,.reader-topbar,button")) return;
    const shell=e.currentTarget.getBoundingClientRect();
    const y=e.clientY-shell.top;
    const topZone=Math.min(100,Math.max(58,shell.height*.14));
    if(y<topZone){ dismissReaderTip(); setReaderMenuOpen(v=>!v); return; }
    if(readerMenuOpen) setReaderMenuOpen(false);
    const x=e.clientX-shell.left;
    /* Wide edge zones, but the text column itself is inset so ordinary page
       turns do not compete with word lookup taps. */
    if(x<shell.width*.28){ dismissReaderTip(); turnPage(-1); }
    else if(x>shell.width*.72){ dismissReaderTip(); turnPage(1); }
  }''',
'page tap menu')

once(
'''    if(!bodyRef.current) return;
    if(!el||!bodyRef.current.contains(el)) return;
    dismissReaderTip();
    const surface=el.textContent;''',
'''    if(!bodyRef.current) return;
    if(!el||!bodyRef.current.contains(el)) return;
    dismissReaderTip();
    if(readerMenuOpen) setReaderMenuOpen(false);
    const surface=el.textContent;''',
'close menu on word tap')

once(
'''  function Reader(){
    const item=book.parsed.spine[chapIdx];
    const label=(item&&book.parsed.toc[item.href])||("Chapter "+(chapIdx+1));
    return (
      <>
        <div className="topbar"><div className="wrap topbar-in">
          <button className="icon-btn" aria-label="Books" onClick={closeBook}>{"‹"}</button>
          <div className="tb-title">{label}</div>
          <button className="icon-btn" aria-label="Contents" onClick={()=>setSheet("toc")}>{"☰"}</button>
          <button className="icon-btn" aria-label="Text settings" style={{fontWeight:800,fontSize:17}}
            onClick={()=>setSheet("type")}>Aa</button>
        </div></div>

        <div className="wrap">
          <div className="reader-shell" onClick={onPageTap}>
            {showReaderTip&&(
              <div className="reader-tip">
                <div><b>Tap a word</b> to explain it.<br/><b>Tap the sides</b> to turn the page.<br/><b>Hold a sentence</b> to hear it.</div>
                <button className="btn btn-ghost" onClick={dismissReaderTip}>Got it</button>
              </div>
            )}
            {!chap&&<div className="spin"/>}
            <div className={"reader"+(prefs.serif?" serif":" sans")} ref={bodyRef}
              onClick={onTap}
              onPointerDown={onPressStart} onPointerUp={onPressEnd}
              onPointerCancel={onPressEnd} onPointerMove={onPressMove}
              onContextMenu={e=>e.preventDefault()}/>
            {chap&&<div className="page-indicator">{pageInfo.page+1} / {pageInfo.total}</div>}
          </div>
        </div>
      </>
    );
  }''',
'''  function Reader(){
    const item=book.parsed.spine[chapIdx];
    const label=(item&&book.parsed.toc[item.href])||("Chapter "+(chapIdx+1));
    return (
      <>
        <div className="wrap">
          <div className="reader-shell" onClick={onPageTap}>
            <div className={"reader-topbar"+(readerMenuOpen?"":" hidden")}>
              <div className="wrap topbar-in">
                <button className="icon-btn" aria-label="Books" onClick={closeBook}>{"‹"}</button>
                <div className="tb-title">{label}</div>
                <button className="icon-btn" aria-label="Contents" onClick={()=>setSheet("toc")}>{"☰"}</button>
                <button className="icon-btn" aria-label="Text settings" style={{fontWeight:800,fontSize:17}}
                  onClick={()=>setSheet("type")}>Aa</button>
              </div>
            </div>
            {showReaderTip&&(
              <div className="reader-tip">
                <div><b>Tap a word</b> to explain it.<br/><b>Tap the sides</b> to turn the page.<br/><b>Tap the top</b> to show the menu.<br/><b>Hold a sentence</b> to hear it.</div>
                <button className="btn btn-ghost" onClick={dismissReaderTip}>Got it</button>
              </div>
            )}
            {!chap&&<div className="spin"/>}
            <div className={"reader"+(prefs.serif?" serif":" sans")} ref={bodyRef}
              onClick={onTap}
              onPointerDown={onPressStart} onPointerUp={onPressEnd}
              onPointerCancel={onPressEnd} onPointerMove={onPressMove}
              onContextMenu={e=>e.preventDefault()}/>
            {chap&&<div className="page-indicator">{pageInfo.page+1} / {pageInfo.total}</div>}
          </div>
        </div>
      </>
    );
  }''',
'reader menu')

p.write_text(s)

# service worker bump
sw=Path('sw.js')
w=sw.read_text()
if 'const VERSION = "rr-v6";' not in w:
    raise SystemExit('unexpected service worker version')
sw.write_text(w.replace('const VERSION = "rr-v6";','const VERSION = "rr-v7";',1))

# docs
r=Path('README.md')
t=r.read_text()
t=t.replace('Current service-worker cache for this release: `rr-v6`.', 'Current service-worker cache for this release: `rr-v7`.')
t=t.replace('Tap a word and get a very short, contextual explanation in easy English.', 'Tap a word and get its British-English IPA plus a very short, contextual explanation in easy English.')
t=t.replace('First reading session shows one small hint: **Tap a word to explain it. Tap the sides to turn the page. Hold a sentence to hear it.**', 'First reading session shows one small hint: **Tap a word to explain it. Tap the sides to turn the page. Tap the top to show the menu. Hold a sentence to hear it.**')
if 'The top reading menu is hidden by default' not in t:
    t=t.replace('## Child experience\n', '## Child experience\n\nThe top reading menu is hidden by default and appears when the top of the screen is tapped.\n')
r.write_text(t)

# assertions
out=p.read_text()
for needle in ['readerMenuOpen','reader-topbar','Tap the top','ipa:String(j.ipa','className="ipa"']:
    if needle not in out: raise SystemExit('missing '+needle)
if 'rr-v7' not in sw.read_text(): raise SystemExit('service worker not bumped')
print('menu + ipa patch applied')
