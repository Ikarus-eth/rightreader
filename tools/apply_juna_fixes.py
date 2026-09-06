from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "app-source.jsx"

s = APP.read_text()


def once(old, new, label=None):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label or old[:60]!r}: expected exactly 1 match, found {count}")
    s = s.replace(old, new, 1)


def all_(old, new):
    global s
    if old not in s:
        raise SystemExit(f"missing replacement target: {old!r}")
    s = s.replace(old, new)


def sub_once(pattern, repl, label):
    global s
    s2, n = re.subn(pattern, repl, s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 regex match, found {n}")
    s = s2


# Browser-direct architecture comment: OpenAI is the actual default now.
once(
'''   NO SERVER. Calls go straight from the browser to api.anthropic.com
   using the anthropic-dangerous-direct-browser-access header. The key
   lives in localStorage on this one iPad, entered once via the parent
   screen. It is never in the repo. The blast radius is financial, not
   technical: use a dedicated key with a small prepaid balance and
   auto-reload OFF, and the worst case is that balance.''',
'''   NO SERVER. Calls go straight from the browser to api.openai.com.
   The key lives in localStorage on this one iPad, entered once via the
   parent screen. It is never in the repo. A browser-stored API key can
   be read by anyone with access to the device, so use a dedicated key,
   a small prepaid balance, and auto-recharge OFF.''',
"architecture comment")

once(
'''/* ============================================================
   Anthropic API — straight from the browser, no proxy

   api.anthropic.com only answers cross-origin requests that carry
   anthropic-dangerous-direct-browser-access. The name is the warning:
   the key travels in a request anyone with dev tools can read. That is
   acceptable here and only here, because the key belongs to the person
   holding the device. Guard rails below are financial and behavioural:
   a per-day request ceiling, a hard max_tokens, and running token
   accounting surfaced on the parent screen the same day it happens.
   ============================================================ */''',
'''/* ============================================================
   Model API — straight from the browser, no proxy

   The API key travels in a browser request and is therefore readable by
   anyone with access to this device. This app deliberately accepts that
   tradeoff for a single-family prototype. Guard rails below are financial
   and behavioural: a per-day request ceiling, a hard output-token cap,
   and same-day token accounting on the parent screen.
   ============================================================ */''',
"API section comment")

all_("a\n     Haiku call returning a single digit", "a\n     fast-model call returning a single digit")

# Local calendar days, not UTC days. In Bali the old version rolled over at 08:00.
once(
'function today(){ return new Date().toISOString().slice(0,10); }',
'''function localDateKey(d=new Date()){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function today(){ return localDateKey(); }''',
"today/local date")

once(
'''function lastNDays(n){
  const out=[];
  for(let i=n-1;i>=0;i--){
    const d=new Date(Date.now()-i*DAY);
    out.push(d.toISOString().slice(0,10));
  }
  return out;
}''',
'''function lastNDays(n){
  const out=[];
  const base=new Date();
  /* Noon avoids DST edge cases when a local midnight is skipped/repeated. */
  base.setHours(12,0,0,0);
  for(let i=n-1;i>=0;i--){
    const d=new Date(base);
    d.setDate(base.getDate()-i);
    out.push(localDateKey(d));
  }
  return out;
}''',
"lastNDays local date")

# The child-facing lookup sheet: keep the useful core and hide model machinery.
sub_once(
r'''function WordSheet\(\{stack,onClose,onNested,onSave,onRetry,knownSet,onPopupTime\}\)\{.*?\n\}\n\n/\* ============================================================\n   Reading clock''',
'''function WordSheet({stack,onClose,onNested,onSave,onRetry,knownSet,onPopupTime}){
  const top=stack[stack.length-1];
  const openedAt=useRef(Date.now());
  useEffect(()=>{
    openedAt.current=Date.now();
    return ()=>{ onPopupTime(Date.now()-openedAt.current); };
  },[]);
  if(!top) return null;
  const d=top.data;
  const head=(d&&d.span)||top.word;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-head">
          {stack.length>1&&<button className="icon-btn" aria-label="Back" onClick={onNested.back}>‹</button>}
          <div className="headword serif">{head}</div>
          <button className="icon-btn" aria-label="Say it" onClick={()=>speak(head)}>🔊</button>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        {top.level===0
          ? <Ctx sentence={top.sentence} span={d?d.span:top.word}/>
          : <div className="ctx">from the explanation</div>}

        {top.loading&&<div className="spin"/>}

        {top.error&&(
          <>
            <div className="err">{top.error}</div>
            {top.canRetry&&<button className="btn btn-plain" style={{width:"100%",marginTop:12}}
              onClick={onRetry}>Try again</button>}
          </>
        )}

        {d&&!top.loading&&(
          <>
            {d.span&&normTok(d.span)!==normTok(top.word)&&(
              <div className="chip">These {d.span.split(/\\s+/).length} words go together</div>
            )}
            <div className="expl">
              <TapExplain text={d.en} knownSet={knownSet}
                onWord={top.level===0?onNested.open:()=>{}}/>
            </div>

            {!top.showDe
              ? <button className="btn btn-ghost" style={{width:"100%",marginTop:16}}
                  onClick={onNested.german}>German</button>
              : <div className="de-box">
                  <div style={{fontWeight:800,fontSize:20}}>{d.de||"—"}</div>
                  {d.deDesc&&<div style={{fontSize:15,marginTop:5,color:"var(--ink2)",lineHeight:1.5}}>{d.deDesc}</div>}
                </div>}

            {top.level===0&&(
              top.saved
                ? <div className="chip" style={{background:"#D8EBDC",color:"var(--good)"}}>✓ Saved</div>
                : <button className="btn btn-primary" style={{width:"100%",marginTop:14}}
                    onClick={onSave}>Save word</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Reading clock''',
"WordSheet replacement")

# Remove the live reading HUD state, and add the one-time discoverability tip.
once('  const [hud,setHud]=useState({credited:0,elapsed:0,active:false});\n', '', "hud state")
once(
'  const [sheet,setSheet]=useState(null);   // "toc" | "type" | null\n',
'''  const [sheet,setSheet]=useState(null);   // "toc" | "type" | null
  const [showReaderTip,setShowReaderTip]=useState(()=>!lsGet("readerTipSeen",false));
''',
"reader tip state")

once(
'  const clock=useRef({elapsed:0,popup:0,words:0,base:0,flushed:0,flushedRaw:0,last:Date.now(),bookId:null});',
'  const clock=useRef({elapsed:0,popup:0,words:0,base:0,flushed:0,flushedRaw:0,flushedWords:0,last:Date.now(),bookId:null});',
"clock initial ref")
all_(
'clock.current={elapsed:0,popup:0,words:0,base:0,flushed:0,flushedRaw:0,last:Date.now(),bookId:id};',
'clock.current={elapsed:0,popup:0,words:0,base:0,flushed:0,flushedRaw:0,flushedWords:0,last:Date.now(),bookId:id};')

# Small style additions for onboarding and German-on-demand in My Words.
once(
'.empty{text-align:center;color:var(--ink2);padding:44px 20px;line-height:1.6}\n`;',
'''.empty{text-align:center;color:var(--ink2);padding:44px 20px;line-height:1.6}
.reader-tip{display:flex;align-items:center;gap:14px;background:var(--accent-soft);color:var(--ink);
  border-radius:14px;padding:12px 14px;margin:14px 0 8px;font-size:14px;line-height:1.45}
.reader-tip>div{flex:1}.reader-tip .btn{padding:8px 11px;font-size:13px;white-space:nowrap}
.translation{margin-top:9px}.translation summary{cursor:pointer;color:var(--accent);font-weight:700;font-size:13px}
.translation .de{margin-top:6px}
`;''',
"CSS additions")

# Child-facing and general errors/messages to English.
replacements = {
'"Zu viele Anfragen — kurz warten."':'"Too many requests — wait a moment."',
'"Speicher voll — bitte im Eltern-Bereich exportieren."':'"Storage is full — please export a backup in Parent settings."',
'"Bibliothek konnte nicht geladen werden."':'"Could not load the library."',
'"hat zu lange gedauert"':'"took too long"',
'"Öffne „"+file.name+"“ …"':'"Opening “"+file.name+"” …"',
'"das ist keine .epub-Datei"':'"that is not an .epub file"',
'"„"+file.name+"“: "+(e&&e.message||"konnte nicht gelesen werden")':'"“"+file.name+"”: "+(e&&e.message||"could not be read")',
'"Der Link muss mit https:// anfangen."':'"The link must start with https://."',
'"Lade Buch …"':'"Downloading book …"',
'"Link ließ sich nicht laden: "+(e&&e.message||"")+\n        ". Der Server muss die Datei direkt und mit CORS ausliefern (raw.githubusercontent.com tut das)."':'"Could not load that link: "+(e&&e.message||"")+\n        ". The server must provide the file directly and allow CORS (raw.githubusercontent.com does)."',
'"Öffne Buch …"':'"Opening book …"',
'"nicht gefunden"':'"not found"',
'"Buch konnte nicht geöffnet werden: "+(e&&e.message||"")':'"Could not open the book: "+(e&&e.message||"")',
'"<p>Dieses Kapitel konnte nicht angezeigt werden.</p>"':'"<p>This chapter could not be displayed.</p>"',
'"Es ist noch kein API-Schlüssel eingetragen (Eltern-Bereich)."':'"No API key is set yet (Parent settings)."',
'"Heute schon sehr viele Nachschläge — morgen wieder."':'"That is enough lookups for today — try again tomorrow."',
'"Das hat leider nicht geklappt."':'"That did not work."',
'error:"Das hat leider nicht geklappt."':'error:"That did not work."',
}
for old,new in replacements.items():
    all_(old,new)

# Dismiss the one-time reading hint once she successfully taps a word.
once(
'  function touch(){ clock.current.last=Date.now(); primeSpeech(); }',
'''  function touch(){ clock.current.last=Date.now(); primeSpeech(); }
  function dismissReaderTip(){
    if(!showReaderTip) return;
    lsSet("readerTipSeen",true);
    setShowReaderTip(false);
  }''',
"dismissReaderTip")
once(
'''    const surface=el.textContent;
    const cand=el.getAttribute("data-mwe");''',
'''    dismissReaderTip();
    const surface=el.textContent;
    const cand=el.getAttribute("data-mwe");''',
"dismiss tip on word tap")

# Correctly accumulate words across multiple sittings in the same local day.
once(
'''    const delta=credited-c.flushed;
    const rawDelta=c.elapsed-(c.flushedRaw||0);
    if(delta<1000&&rawDelta<1000&&!final) return credited;
    c.flushed=credited; c.flushedRaw=c.elapsed;
    if(delta>0||rawDelta>0){''',
'''    const delta=credited-c.flushed;
    const rawDelta=c.elapsed-(c.flushedRaw||0);
    const wordsDelta=Math.max(0,c.words-(c.flushedWords||0));
    if(delta<1000&&rawDelta<1000&&!final) return credited;
    c.flushed=credited; c.flushedRaw=c.elapsed; c.flushedWords=c.words;
    if(delta>0||rawDelta>0||wordsDelta>0){''',
"clock deltas")
once(
'raw:row.raw+Math.max(0,rawDelta),words:Math.max(row.words,c.words)}};',
'raw:row.raw+Math.max(0,rawDelta),words:row.words+wordsDelta}};',
"clock words accumulation")
once('      setHud({credited,elapsed:c.elapsed,active});\n', '', "remove hud update")

# Replace Library and Reader with a child-first version: no minute counter while choosing/reading,
# a large first import action, and one-time gesture help.
sub_once(
r'''  function Library\(\)\{.*?\n  \}\n\n  function Reader\(\)\{.*?\n  \}\n\n  function Parent\(\)\{''',
'''  function Library(){
    const todayMs=(sessions[today()]||{}).ms||0;
    const hit=todayMs>=TARGET_MIN*60000;
    return (
      <>
        <div className="topbar"><div className="wrap topbar-in">
          <div className="tb-title serif" style={{fontSize:19}}>Right Reader</div>
          {hit&&<span className="pill on">✓ Reading done</span>}
          <button className="icon-btn" aria-label="My words" onClick={()=>setView("words")}>
            {"📓"}<span style={{fontSize:11,fontWeight:800,verticalAlign:"super"}}>{Object.keys(vocab).length||""}</span>
          </button>
          <button className="icon-btn" aria-label="Parent settings" onClick={()=>setView("parent")}>{"⚙︎"}</button>
        </div></div>
        <div className="wrap">
          {busy&&<div className="hint" style={{paddingTop:14}}>{busy}</div>}
          {fatal&&<div className="err" style={{marginTop:14}}>{fatal}
            <button className="btn btn-plain" style={{marginTop:10,width:"100%"}} onClick={()=>setFatal("")}>OK</button></div>}

          {books.length>0?(
            <div className="shelf">
              {books.map(b=>{
                const p=positions[b.id];
                const frac=p&&b.nChapters?Math.min(1,(p.chapter+(p.pct||0))/b.nChapters):0;
                return (
                  <div className="bookcard" key={b.id} onClick={()=>openBook(b.id)}>
                    {b.cover
                      ? <img className="bookcover" src={b.cover} alt=""/>
                      : <div className="bookcover serif">{b.title}</div>}
                    <div className="bookmeta">{b.title}</div>
                    {b.author&&<div className="bookauth">{b.author}</div>}
                    {frac>0.005&&<div className="progbar"><i style={{width:Math.round(frac*100)+"%"}}/></div>}
                  </div>
                );
              })}
              <div className="addcard" onClick={()=>fileRef.current&&fileRef.current.click()}>
                <div style={{fontSize:30}}>+</div><div>Add a book</div>
              </div>
            </div>
          ):(
            <div className="empty" style={{paddingTop:70}}>
              <div className="serif" style={{fontSize:25,fontWeight:800,color:"var(--ink)",marginBottom:12}}>
                Choose a book to start
              </div>
              <button className="btn btn-primary" style={{width:"100%",maxWidth:360,fontSize:18,padding:"16px 20px"}}
                onClick={()=>fileRef.current&&fileRef.current.click()}>＋ Add a book</button>
              <div className="hint" style={{marginTop:14}}>
                Choose <b>iCloud Drive → Juna Books</b>.
              </div>
            </div>
          )}
          {/* No accept filter on purpose. iOS matches accept against its own
              type identifiers and greys out anything it cannot map, and epub
              is one it maps unreliably - the file sits there in the picker
              looking present but refusing to be tapped. Everything is
              selectable now and the check happens after picking, where a
              wrong file can actually explain itself. */}
          <input ref={fileRef} type="file" multiple
            style={{display:"none"}} onChange={e=>importFiles(e.target.files)}/>
        </div>
      </>
    );
  }

  function Reader(){
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
          {showReaderTip&&(
            <div className="reader-tip">
              <div><b>Tap a word</b> to explain it.<br/><b>Hold a sentence</b> to hear it.</div>
              <button className="btn btn-ghost" onClick={dismissReaderTip}>Got it</button>
            </div>
          )}
          {!chap&&<div className="spin"/>}
          <div className={"reader"+(prefs.serif?" serif":" sans")} ref={bodyRef}
            onClick={onTap}
            onPointerDown={onPressStart} onPointerUp={onPressEnd}
            onPointerCancel={onPressEnd} onPointerMove={onPressMove}
            onContextMenu={e=>e.preventDefault()}/>
          {chap&&(
            <div className="chapnav">
              <button className="btn btn-plain" disabled={chapIdx<=0}
                onClick={()=>{ flushClock(true); setChapIdx(chapIdx-1); window.scrollTo(0,0); }}>{"← Back"}</button>
              <button className="btn btn-primary" disabled={chapIdx>=book.parsed.spine.length-1}
                onClick={()=>{ flushClock(true); setChapIdx(chapIdx+1); window.scrollTo(0,0); }}>{"Next →"}</button>
            </div>
          )}
        </div>
      </>
    );
  }

  function Parent(){''',
"Library and Reader replacement")

# Parent/settings UI to English, preserving all logic.
parent_replacements = {
'"Wiederhergestellt."':'"Restored."',
'"Datei konnte nicht gelesen werden."':'"Could not read that file."',
'>Eltern-Bereich<':'>Parent<',
'>Lesezeit<':'>Reading<',
'>Wörter<':'>Words<',
'>Einstellungen<':'>Settings<',
'<h3>Heute</h3>':'<h3>Today</h3>',
'{streak} von {TARGET_DAYS} Tagen diese Woche geschafft.':'{streak} of {TARGET_DAYS} reading days completed in the last 7 days.',
'<h3>Letzte 14 Tage</h3>':'<h3>Last 14 days</h3>',
'<h3>Wie gezählt wird</h3>':'<h3>How reading time is counted</h3>',
'''                Die Uhr läuft nur, wenn die App vorne ist und in den letzten 90 Sekunden
                gescrollt oder getippt wurde. Zusätzlich kann eine Seite höchstens so viel Zeit
                verdienen, wie {floorWpm} Wörter pro Minute erlauben — plus die Zeit in
                Wort-Erklärungen (max. 45 s pro Wort). Auf einer Seite sitzen bringt also nichts.
                Der Wert {floorWpm} ist {Object.keys(sessions).length<3?"noch ein Startwert":"aus ihrem eigenen bisherigen Tempo berechnet"}.''':'''                Time counts only while the app is visible and there was a tap or scroll in the last 90 seconds.
                It is also capped by how much text actually moved past: {floorWpm} words per minute,
                plus time spent in word explanations (max. 45 seconds per lookup). Sitting on one page
                therefore earns nothing. {floorWpm} is {Object.keys(sessions).length<3?"still the starting value":"calculated from her own reading pace"}.''',
'<h3>Gespeichert ({learning.length})</h3>':'<h3>Saved ({learning.length})</h3>',
'Noch keine. Sie tippt beim Lesen auf {"＋ Neues Wort"}.':'None yet. She can tap <b>Save word</b> while reading.',
'<h3>Mehrfach nachgeschaut, nicht gespeichert</h3>':'<h3>Looked up more than once, not saved</h3>',
'''                Die Wörter, bei denen sie gezweifelt hat, aber nicht auf {"＋"} getippt hat.
                Meist genau die, die sich lohnen.''':'''                Words she has needed more than once but chose not to save.
                These are useful candidates for you to review.''',
'>Noch nichts.<':'>None yet.<',
'<h3>API-Schlüssel ({PROVIDER})</h3>':'<h3>API key ({PROVIDER})</h3>',
'"Kein Schlüssel eingegeben."':'"Enter an API key first."',
'"Verbinde …"':'"Connecting …"',
'"Verbunden. "+ms.length+" Modelle gefunden."':'"Connected. "+ms.length+" models found."',
'"Schlüssel gespeichert, aber die Verbindung schlug fehl: "+(e&&e.message||"")':'"Connection failed. The new key was not saved: "+(e&&e.message||"")',
'testing?"Verbinde …":"Speichern & testen"':'testing?"Connecting …":"Save & test"',
'''                Bleibt nur auf diesem iPad, nie im Repository. Nimm einen eigenen Schlüssel
                nur für diese App, lade ein kleines Guthaben und schalte Auto-Reload aus —
                dann ist dieses Guthaben die Obergrenze für alles, was schiefgehen kann.''':'''                Stored only on this iPad, never in the repository. Use a dedicated key for this app,
                keep the prepaid balance small, and leave auto-recharge off.''',
'<h3>Modelle</h3>':'<h3>Models</h3>',
'''                „Schnell“ erklärt im Hintergrund ganze Kapitel voraus und macht die meisten
                Anfragen. „Gut“ läuft nur, wenn sie wartet: neue Wörter und die Entscheidung,
                welche Bedeutung im Satz gemeint ist.''':'''                “Fast” pre-explains likely difficult words in the background and makes most requests.
                “Good” is used for live lookups and choosing the meaning that fits the sentence.''',
'[["fast","Schnell (Vorablesen)"],["good","Gut (Antippen)"]]':'[["fast","Fast (prefetch)"],["good","Good (live lookup)"]]',
'>Modelle speichern<':'>Save models<',
'"Modelle gespeichert."':'"Models saved."',
'''                Tippe oben auf „Speichern & testen“, dann steht hier die echte Modell-Liste
                deines Kontos statt eines Namens, den jemand geraten hat.''':'''                Tap “Save & test” above to load the model list available to this API key.''',
'<h3>Kosten (30 Tage)</h3>':'<h3>Cost (30 days)</h3>',
'''              <div className="hint">Geschätzt aus den zurückgemeldeten Tokens
                ({models().fast} / {models().good}).
                Heute {callsToday()} von max. {DAILY_CALL_CAP} Anfragen.</div>''':'''              <div className="hint">Estimated from API token usage
                ({models().fast} / {models().good}).
                Today: {callsToday()} of max. {DAILY_CALL_CAP} requests.</div>''',
'<h3>Sicherung</h3>':'<h3>Backup</h3>',
'>Alles exportieren<':'>Export everything<',
'''                Wiederherstellen''':'''                Restore''',
'''                Safari räumt Browser-Speicher gelegentlich auf. Bücher lassen sich neu laden,
                Wortliste und Lesezeit nicht — also ab und zu exportieren.''':'''                Browser storage can occasionally be cleared. Books can be imported again, but
                word history and reading time cannot, so export a backup occasionally.''',
'<h3>Buch über einen Link laden</h3>':'<h3>Import a book from a link</h3>',
'placeholder="https://…/buch.epub"':'placeholder="https://…/book.epub"',
'>Laden<':'>Import<',
'''                Für eine gemeinsame Bibliothek auf mehreren Geräten. Der Server muss die
                Datei direkt ausliefern und CORS erlauben — raw.githubusercontent.com tut
                das, iCloud- und Dropbox-Freigabelinks nicht.''':'''                Useful for a shared library across devices. The server must provide the file directly
                and allow CORS. raw.githubusercontent.com does; iCloud and Dropbox share links do not.''',
'<h3>Bücher ({books.length})</h3>':'<h3>Books ({books.length})</h3>',
}
for old,new in parent_replacements.items():
    all_(old,new)

# Save the API key only after a successful validation call.
once(
'''                  lsSet("apikey",k);
                  setTesting(true); setMsg("Connecting …");
                  try{
                    const ms=await listModels(k);
                    setModelList(ms);
                    setMsg("Connected. "+ms.length+" models found.");
                  }catch(e){
                    setMsg("Connection failed. The new key was not saved: "+(e&&e.message||""));
                  }''',
'''                  setTesting(true); setMsg("Connecting …");
                  try{
                    const ms=await listModels(k);
                    lsSet("apikey",k);
                    setModelList(ms);
                    setMsg("Connected. Key saved. "+ms.length+" models found.");
                  }catch(e){
                    setMsg("Connection failed. The new key was not saved: "+(e&&e.message||""));
                  }''',
"save key after test")

# Contents and display sheets.
more_replacements = {
'>Inhalt<':'>Contents<',
'("Abschnitt "+(i+1))':'("Section "+(i+1))',
'>Darstellung<':'>Text<',
'>Schriftgröße<':'>Text size<',
'>Zeilenabstand<':'>Line spacing<',
'[["eng",1.45],["normal",1.68],["weit",2.0]]':'[["tight",1.45],["normal",1.68],["wide",2.0]]',
'>Schrift<':'>Font<',
'>Serife<':'>Serif<',
'>Ohne Serife<':'>Sans<',
'>Hintergrund<':'>Background<',
'[["Papier","paper"],["Hell","light"],["Nacht","night"]]':'[["Paper","paper"],["Light","light"],["Night","night"]]',
'''            Lange auf einen Absatz drücken, um ihn vorlesen zu lassen.''':'''            Hold a sentence to hear it read aloud.''',
}
for old,new in more_replacements.items():
    all_(old,new)

# My Words: English first; German stays available but is not the default answer.
sub_once(
r'''  /\* Her own list\..*?  function WordList\(\)\{.*?\n  \}\n\n  /\* ---- root ---- \*/''',
'''  /* Her own list. English stays primary; German is available on demand. */
  function WordList(){
    const rows=Object.entries(vocab).sort((a,b)=>(b[1].added||0)-(a[1].added||0));
    return (
      <>
        <div className="topbar"><div className="wrap topbar-in">
          <button className="icon-btn" aria-label="Back" onClick={()=>setView(book?"read":"library")}>{"‹"}</button>
          <div className="tb-title serif" style={{fontSize:19}}>My words</div>
          <span className="pill">{rows.length}</span>
        </div></div>
        <div className="wrap" style={{paddingTop:16,paddingBottom:60}}>
          {!rows.length&&(
            <div className="empty">
              No saved words yet.<br/>
              Tap a word while reading, then tap <b>Save word</b>.
            </div>
          )}
          {rows.map(([k,e])=>(
            <div className="wcard" key={k}>
              <div className="h">
                <div className="hw serif">{e.span||e.w}</div>
                <button className="icon-btn" aria-label="Say it" onClick={()=>speak(e.span||e.w)}>{"🔊"}</button>
              </div>
              {e.en&&<div className="en">{e.en}</div>}
              {e.de&&(
                <details className="translation">
                  <summary>German</summary>
                  <div className="de">{e.de}</div>
                  {e.dd&&<div className="hint">{e.dd}</div>}
                </details>
              )}
              {e.ctx&&<div className="src">“{e.ctx}”{e.src&&e.src.book?" — "+e.src.book:""}</div>}
            </div>
          ))}
        </div>
      </>
    );
  }

  /* ---- root ---- */''',
"WordList replacement")

APP.write_text(s)

# Keep config factual and small. OpenAI prices verified against the model docs on 2026-09-06.
(ROOT / "config.js").write_text('''/* Right Reader — configuration. The API key never belongs in this file. */
window.APP_CONFIG = {
  PROVIDER: "openai",

  // High-volume background vocabulary prefetch.
  MODEL_FAST: "gpt-5.6-luna",

  // Live contextual lookup / sense decisions.
  MODEL_GOOD: "gpt-5.6-terra",

  REASONING_EFFORT: "low",

  // USD per million text tokens. Used only for the parent-screen estimate.
  PRICES: {
    "gpt-5.6-luna":  { in: 0.20, out: 1.20 },
    "gpt-5.6-terra": { in: 2.00, out: 12.00 },
    "gpt-5.6-sol":   { in: 4.00, out: 20.00 }
  },

  // Device-side runaway-loop guard.
  DAILY_CALL_CAP: 1200
};
''')

# Force the installed Home Screen app to pick up this release.
sw = (ROOT / "sw.js").read_text()
if 'const VERSION = "rr-v4";' not in sw:
    raise SystemExit("unexpected service-worker version")
(ROOT / "sw.js").write_text(sw.replace('const VERSION = "rr-v4";', 'const VERSION = "rr-v5";', 1))

# Rewrite the README so it describes the actual OpenAI/iCloud flow and current UI.
(ROOT / "README.md").write_text(r'''# Right Reader

Right Reader is a deliberately simple EPUB reader for a 10-year-old German native speaker reading English at about A2/B1. The product idea is not “study vocabulary”; it is “English books cannot trap you.”

Tap a word and get a very short, contextual explanation in easy English. Tap a harder word inside that explanation and get one more level of explanation. German is available only on request. A word can be saved explicitly for later spaced-repetition work.

## Architecture

- Static GitHub Pages site. No backend or proxy.
- Calls the OpenAI API directly from the browser.
- The API key is entered once in Parent settings and stored only in that iPad's localStorage.
- EPUBs are parsed with JSZip and rendered into native DOM, not an iframe, so word taps are exact.
- Raw EPUB bytes live in IndexedDB. Other state lives under `rr_` keys in localStorage.
- A local list proposes phrasal verbs/idioms; the model decides whether the phrase is actually idiomatic in that sentence.
- Reading time is capped by text actually scrolled past plus time spent in word explanations. Sitting on one page does not earn reading time.

The browser-held API key is a conscious security tradeoff for a single-family prototype. Use a dedicated OpenAI project/key, a small prepaid balance, and no automatic recharge. Do not distribute this architecture to other families as a production service.

## First setup on the iPad

1. Open the GitHub Pages site in Safari and add it to the Home Screen.
2. Open **Parent → Settings**.
3. Paste the dedicated OpenAI API key and tap **Save & test**.
4. The key is saved only if the API test succeeds.
5. Keep the default models unless there is a reason to change them:
   - `gpt-5.6-luna` for high-volume background prefetch.
   - `gpt-5.6-terra` for live contextual lookups.

## Mac → iPad book workflow

The clean setup is a shared iCloud Drive folder named **Juna Books**.

### One time

1. On the Mac, create **iCloud Drive/Juna Books**.
2. If Juna's iPad uses a different Apple Account, share that folder with her account.
3. On the iPad, accept the shared folder once and make sure iCloud Drive is enabled.

### For every new book

On the Mac, drag a DRM-free `.epub` into **Juna Books**.

On the iPad, Juna opens Right Reader and taps:

**Add a book → iCloud Drive → Juna Books → book**

Do not open the `.epub` from Files or AirDrop it as the normal workflow. iOS will typically hand it to Apple Books. Right Reader needs the file to be chosen from inside its own document picker. After import, Right Reader keeps its own copy in IndexedDB.

The file input intentionally has no `accept=.epub` filter. iOS has historically mapped EPUB type identifiers inconsistently and can otherwise show the file while greying it out. Right Reader validates the extension after selection instead.

## Child experience

The reading UI is intentionally quiet:

- No live `running / paused` status.
- No exact minute counter while reading.
- The library only shows **Reading done** once the daily target is reached.
- First reading session shows one small hint: **Tap a word to explain it. Hold a sentence to hear it.**
- Normal lookup sheet shows the word, its easy-English explanation, optional German, and **Save word**.
- Model checking/correction machinery and repeated-lookup nudges are hidden from the child.
- **My words** shows the English explanation first. German is collapsed behind a disclosure.

## Word lookup and sense handling

The cache stores multiple senses per word plus a memo of which sense fits which sentence.

| cache state | behavior |
|---|---|
| no sense | full contextual lookup |
| one unambiguous sense | serve immediately, no API call |
| one ambiguous sense | serve immediately, verify in background |
| multiple senses | use a short model call to choose the fitting sense |

The model prompt is explicitly for a 10-year-old German A2/B1 learner and asks for the meaning in the current sentence, using a maximum 14-word easy-English explanation.

## Prefetch

When a chapter opens, likely-difficult words are explained in background batches with `gpt-5.6-luna`. The app skips common words, known words, most proper nouns, contractions, headings, and front matter. Taps usually therefore feel instant.

## Saving words

Saving is explicit. A lookup does not automatically become homework. Saved entries already contain FSRS-4.5 scheduling fields so spaced repetition can be added later without a migration.

Repeated lookups are still counted quietly and remain visible in Parent settings, but the child is no longer nudged while reading.

## Reading-time accounting

The clock only advances while the app is visible and there has been interaction within 90 seconds.

```
earned   = words scrolled past / floor_wpm + time in word popups
credited = min(elapsed, earned)
```

A lookup can contribute at most 45 seconds. The starting floor is 50 WPM. Once there are enough real sessions, the floor adapts to 40% of her observed median reading speed.

Calendar keys use the iPad's **local date**, not UTC. Word counts are accumulated across multiple reading sittings in the same day.

Target: 20 minutes on 5 days per week. Exact time history stays in Parent settings rather than in the reading view.

## Parent settings

Parent settings contains:

- reading history and target progress;
- saved words;
- repeatedly looked-up but unsaved words;
- API key validation;
- model selection;
- estimated API spend;
- backup/restore;
- direct-URL EPUB import for hosts that serve the file with CORS;
- book deletion.

## Offline behavior and storage

The service worker caches the app shell. Imported books can therefore be read offline; word lookups still require network access.

Safari/iPadOS may clear site storage in some circumstances. Parent settings includes JSON export/import for vocabulary and reading history. EPUBs can simply be imported again.

## Build and deploy

App behavior lives in `src/app-source.jsx`. Build it into the root `app.js` with:

```sh
cd src
npm install
npm run build
```

`config.js` does not require rebuilding.

Whenever `index.html` or `app.js` changes, bump `VERSION` in `sw.js`; otherwise the Home Screen install can continue serving the previous cached bundle.

Current service-worker cache for this release: `rr-v5`.

## OpenAI models and cost table

`config.js` currently uses these text-token prices per 1M tokens (checked 2026-09-06):

- GPT-5.6 Luna: $0.20 input / $1.20 output
- GPT-5.6 Terra: $2 input / $12 output
- GPT-5.6 Sol: $4 input / $20 output

The values are only for the on-device spend estimate; actual billing remains whatever OpenAI charges the project.
''')

# Guard against the specific child-facing German we intended to remove.
for token in [
    "Buch hinzufügen", "Meine Wörter", "Kapitel ", "Zurück", "Weiter →",
    "Auf Deutsch", "Neues Wort", "Darstellung", "Schriftgröße", "Zeilenabstand",
    "Eltern-Bereich", "Speichern & testen", "Lesezeit", "Noch keine Bücher",
    "läuft", "pausiert", "lang drücken = vorlesen"
]:
    if token in s:
        raise SystemExit(f"German UI remains: {token!r}")

print("Right Reader launch fixes applied successfully")
