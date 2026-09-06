from pathlib import Path

p=Path('src/app-source.jsx')
s=p.read_text()

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s.replace(old,new,1)

# Pagination visual shell. Keep native DOM so individual word taps remain exact.
once('''.reader{padding:18px 4px 132px;font-size:var(--rsize);line-height:var(--rlead);letter-spacing:.003em}''','''.reader-shell{position:relative;height:calc(100dvh - 73px);overflow:hidden;touch-action:manipulation}
.reader{height:100%;width:100%;padding:22px 4px 38px;font-size:var(--rsize);line-height:var(--rlead);
  letter-spacing:.003em;overflow:hidden;column-fill:auto;scroll-behavior:auto}
body.reading-mode{overflow:hidden;position:fixed;inset:0;width:100%}
.page-indicator{position:absolute;left:50%;bottom:7px;transform:translateX(-50%);z-index:4;
  background:rgba(255,248,227,.9);border:1px solid var(--line);border-radius:999px;padding:3px 9px;
  font-size:11px;font-weight:750;color:var(--ink2);pointer-events:none}
.page-edge{position:absolute;top:0;bottom:0;width:24%;z-index:2;pointer-events:none}
.page-edge.left{left:0}.page-edge.right{right:0}''','reader pagination css')

once('''.reader-tip{display:flex;align-items:center;gap:14px;background:#FFF0C7;color:var(--ink);
  border:1px solid #E7CE91;border-radius:18px;padding:12px 14px;margin:14px 0 8px;font-size:14px;line-height:1.45}''','''.reader-tip{position:absolute;left:10px;right:10px;top:8px;z-index:8;display:flex;align-items:center;gap:14px;
  background:rgba(255,240,199,.97);color:var(--ink);border:1px solid #E7CE91;border-radius:18px;
  padding:12px 14px;margin:0;font-size:14px;line-height:1.45;box-shadow:0 7px 22px rgba(71,59,28,.14)}''','reader tip overlay')

# Pagination state and refs.
once('''  const [showReaderTip,setShowReaderTip]=useState(()=>!lsGet("readerTipSeen",false));

  const bodyRef=useRef(null);''','''  const [showReaderTip,setShowReaderTip]=useState(()=>!lsGet("readerTipSeen",false));
  const [pageInfo,setPageInfo]=useState({page:0,total:1});

  const bodyRef=useRef(null);''','pagination state')
once('''  const prefetchRef=useRef({busy:false,done:new Set()});''','''  const prefetchRef=useRef({busy:false,done:new Set()});
  const pageRef=useRef({page:0,total:1,step:0});
  const pendingPctRef=useRef(null);''','pagination refs')

# Lock body only while reading.
once('''  useEffect(()=>{ const s=document.createElement("style"); s.textContent=CSS;
    document.head.appendChild(s); askPersist(); },[]);''','''  useEffect(()=>{ const s=document.createElement("style"); s.textContent=CSS;
    document.head.appendChild(s); askPersist(); },[]);
  useEffect(()=>{
    document.body.classList.toggle("reading-mode",view==="read");
    return ()=>document.body.classList.remove("reading-mode");
  },[view]);''','reading body lock')

# Replace scroll-restoration chapter layout with column pagination.
once('''    const pos=(positions[(book&&book.meta.id)||""]||{});
    const pct=(pos.chapter===chapIdx&&pos.pct)||0;
    requestAnimationFrame(()=>{
      const h=document.documentElement.scrollHeight-window.innerHeight;
      window.scrollTo(0,Math.max(0,Math.round(h*pct)));
    });
    prefetchChapter(spans);''','''    const pos=(positions[(book&&book.meta.id)||""]||{});
    const savedPct=pendingPctRef.current!=null
      ?pendingPctRef.current
      :((pos.chapter===chapIdx&&pos.pct)||0);
    pendingPctRef.current=null;
    requestAnimationFrame(()=>layoutPages(savedPct));
    /* Images can change pagination after their dimensions become known. Re-layout
       while preserving the current percentage rather than jumping pages. */
    for(const img of bodyRef.current.querySelectorAll("img")){
      if(!img.complete) img.addEventListener("load",()=>layoutPages(currentPagePct()),{once:true});
    }
    prefetchChapter(spans);''','chapter pagination layout')

# Replace word measurement: in paginated mode, count through the last word visible on this page.
once('''  const measureWords=useCallback(()=>{
    const spans=spansRef.current;
    if(!spans.length) return;
    const limit=window.innerHeight;
    let lo=0,hi=spans.length-1,best=-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1;
      if(spans[mid].getBoundingClientRect().top<limit){ best=mid; lo=mid+1; }
      else hi=mid-1;
    }
    if(best>=0){
      const n=Number(spans[best].getAttribute("data-i"))+1;
      clock.current.words=Math.max(clock.current.words,clock.current.base+n);
    }
  },[]);''','''  const measureWords=useCallback(()=>{
    const el=bodyRef.current;
    const spans=spansRef.current;
    if(!el||!spans.length) return;
    const box=el.getBoundingClientRect();
    let best=-1;
    for(const sp of spans){
      const r=sp.getBoundingClientRect();
      const visible=r.right>box.left+2&&r.left<box.right-2&&r.bottom>box.top&&r.top<box.bottom;
      if(visible) best=Math.max(best,Number(sp.getAttribute("data-i"))||0);
    }
    if(best>=0) clock.current.words=Math.max(clock.current.words,clock.current.base+best+1);
  },[]);

  function currentPagePct(){
    const r=pageRef.current;
    return r.total>1?r.page/(r.total-1):0;
  }

  function savePagePosition(){
    if(!book) return;
    const pct=currentPagePct();
    setPositions(cur=>{
      const b=cur[book.meta.id]||{counted:{}};
      const counted={...(b.counted||{}),[chapIdx]:(chap&&chap.nWords)||((b.counted||{})[chapIdx])||0};
      const n={...cur,[book.meta.id]:{chapter:chapIdx,pct,page:pageRef.current.page,
        pages:pageRef.current.total,counted,ts:Date.now()}};
      lsSet("pos",n); return n;
    });
  }

  function layoutPages(pct){
    const el=bodyRef.current;
    if(!el||view!=="read") return;
    const width=el.clientWidth;
    if(width<20) return;
    const gap=Math.max(28,Math.min(44,Math.round(width*.055)));
    el.style.columnWidth=width+"px";
    el.style.columnGap=gap+"px";
    el.scrollLeft=0;
    requestAnimationFrame(()=>{
      const step=width+gap;
      const total=Math.max(1,Math.round((el.scrollWidth+gap)/step));
      const want=Math.max(0,Math.min(1,Number.isFinite(pct)?pct:currentPagePct()));
      const page=Math.max(0,Math.min(total-1,Math.round(want*Math.max(0,total-1))));
      pageRef.current={page,total,step};
      el.scrollLeft=page*step;
      setPageInfo({page,total});
      requestAnimationFrame(measureWords);
    });
  }

  function goPage(page){
    const el=bodyRef.current;
    const r=pageRef.current;
    if(!el) return;
    const next=Math.max(0,Math.min(r.total-1,page));
    pageRef.current={...r,page:next};
    el.scrollLeft=next*r.step;
    setPageInfo({page:next,total:r.total});
    touch();
    requestAnimationFrame(()=>{ measureWords(); savePagePosition(); });
  }

  function turnPage(dir){
    const r=pageRef.current;
    const next=r.page+dir;
    if(next>=0&&next<r.total){ goPage(next); return; }
    if(dir>0&&chapIdx<book.parsed.spine.length-1){
      flushClock(true); savePagePosition(); pendingPctRef.current=0; setChapIdx(chapIdx+1); return;
    }
    if(dir<0&&chapIdx>0){
      flushClock(true); savePagePosition(); pendingPctRef.current=1; setChapIdx(chapIdx-1);
    }
  }''','measure and pagination helpers')

# Page mode does not scroll; count words on page changes instead of scanning each second.
once('''      if(active) c.elapsed+=1000;
      measureWords();
      const credited=flushClock(false);''','''      if(active) c.elapsed+=1000;
      const credited=flushClock(false);''','clock no scroll measurement')

# Replace scroll tracking with resize/visibility/keyboard behavior for pages.
start='''  /* scroll position + interaction, throttled */
  useEffect(()=>{
    if(view!=="read") return;
    let t=0;
    const onScroll=()=>{
      touch();
      const now=Date.now();
      if(now-t<800) return;
      t=now;
      measureWords();
      if(book){
        const h=document.documentElement.scrollHeight-window.innerHeight;
        const pct=h>0?window.scrollY/h:0;
        setPositions(cur=>{
          const b=cur[book.meta.id]||{counted:{}};
          const counted={...(b.counted||{}),[chapIdx]:(chap&&chap.nWords)||b.counted&&b.counted[chapIdx]||0};
          const n={...cur,[book.meta.id]:{chapter:chapIdx,pct,counted,ts:Date.now()}};
          lsSet("pos",n); return n;
        });
      }
    };
    const onTouchStart=()=>touch();
    /* this used to be an anonymous listener with no matching remove, so a
       fresh one was added every time the chapter changed and none were
       ever cleaned up */
    const onVis=()=>{ touch(); if(document.visibilityState!=="visible") flushClock(true); };
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("touchstart",onTouchStart,{passive:true});
    window.addEventListener("keydown",onTouchStart);
    document.addEventListener("visibilitychange",onVis);
    return ()=>{
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("touchstart",onTouchStart);
      window.removeEventListener("keydown",onTouchStart);
      document.removeEventListener("visibilitychange",onVis);
    };
    // eslint-disable-next-line
  },[view,book,chapIdx,chap]);'''
replacement='''  /* Page mode: there is no reader scroll position. Resize reflows the columns
     while preserving the same fractional place in the chapter. */
  useEffect(()=>{
    if(view!=="read") return;
    const onTouchStart=()=>touch();
    const onKey=e=>{
      touch();
      if(e.key==="ArrowRight"||e.key==="PageDown"||e.key===" "){ e.preventDefault(); turnPage(1); }
      if(e.key==="ArrowLeft"||e.key==="PageUp"){ e.preventDefault(); turnPage(-1); }
    };
    let rt=0;
    const onResize=()=>{ clearTimeout(rt); rt=setTimeout(()=>layoutPages(currentPagePct()),120); };
    const onVis=()=>{ touch(); if(document.visibilityState!=="visible"){ savePagePosition(); flushClock(true); } };
    window.addEventListener("touchstart",onTouchStart,{passive:true});
    window.addEventListener("keydown",onKey);
    window.addEventListener("resize",onResize);
    document.addEventListener("visibilitychange",onVis);
    return ()=>{
      clearTimeout(rt); savePagePosition();
      window.removeEventListener("touchstart",onTouchStart);
      window.removeEventListener("keydown",onKey);
      window.removeEventListener("resize",onResize);
      document.removeEventListener("visibilitychange",onVis);
    };
    // eslint-disable-next-line
  },[view,book,chapIdx,chap]);'''
once(start,replacement,'replace scroll effect')

# Tap on a word still opens vocabulary. Otherwise edge taps turn pages.
once('''    const el=e.target.closest&&e.target.closest(".w");
    touch();
    if(!el||!bodyRef.current||!bodyRef.current.contains(el)) return;
    dismissReaderTip();
    const surface=el.textContent;''','''    const el=e.target.closest&&e.target.closest(".w");
    touch();
    if(!bodyRef.current) return;
    if(!el||!bodyRef.current.contains(el)){
      dismissReaderTip();
      const box=bodyRef.current.getBoundingClientRect();
      const x=e.clientX-box.left;
      if(x<box.width*.30) turnPage(-1);
      else if(x>box.width*.70) turnPage(1);
      return;
    }
    dismissReaderTip();
    const surface=el.textContent;''','tap zones')

# Replace Reader UI with fixed page viewport, no chapter buttons.
once('''        <div className="wrap">
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
        </div>''','''        <div className="wrap">
          <div className="reader-shell">
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
        </div>''','reader paginated view')

# Parent explanation should describe page turns rather than scrolling.
once('''                Time counts only while the app is visible and there was a tap or scroll in the last 90 seconds.
                It is also capped by how much text actually moved past: {floorWpm} words per minute,
                plus time spent in word explanations (max. 45 seconds per lookup). Sitting on one page
                therefore earns nothing.''','''                Time counts only while the app is visible and there was activity in the last 90 seconds.
                It is capped by how many words are on pages she has actually reached: {floorWpm} words per minute,
                plus time spent in word explanations (max. 45 seconds per lookup). Leaving one page open
                therefore stops earning time.''','parent page explanation')

p.write_text(s)
print('pagination patch applied')
