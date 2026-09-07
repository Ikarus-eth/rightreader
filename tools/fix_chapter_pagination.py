from pathlib import Path

p=Path('src/app-source.jsx')
s=p.read_text()

def repl(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s=s.replace(old,new,1)

repl(
'''  const pageRef=useRef({page:0,total:1,step:0});\n  const pendingPctRef=useRef(null);''',
'''  const pageRef=useRef({chapter:null,page:0,total:1,step:0});\n  const pendingPctRef=useRef(null);\n  const activeChapterRef=useRef(chapIdx);''',
'page refs')

repl(
'''  useEffect(()=>{ if(view!=="read") setReaderMenuOpen(false); },[view,chapIdx,book?book.meta.id:null]);''',
'''  useEffect(()=>{ if(view!=="read") setReaderMenuOpen(false); },[view,chapIdx,book?book.meta.id:null]);\n  useEffect(()=>{ activeChapterRef.current=chapIdx; },[chapIdx]);''',
'active chapter effect')

repl(
'''    const savedPct=pendingPctRef.current!=null\n      ?pendingPctRef.current\n      :((pos.chapter===chapIdx&&pos.pct)||0);\n    pendingPctRef.current=null;\n    requestAnimationFrame(()=>layoutPages(savedPct));\n    /* Images can change pagination after their dimensions become known. Re-layout\n       while preserving the current percentage rather than jumping pages. */\n    for(const img of bodyRef.current.querySelectorAll("img")){\n      if(!img.complete) img.addEventListener("load",()=>layoutPages(currentPagePct()),{once:true});\n    }''',
'''    const pending=pendingPctRef.current;\n    const savedPct=pending&&pending.chapter===chapIdx\n      ?pending.pct\n      :((pos.chapter===chapIdx&&pos.pct)||0);\n    if(pending&&pending.chapter===chapIdx) pendingPctRef.current=null;\n    requestAnimationFrame(()=>layoutPages(savedPct));\n    /* Images can change pagination after their dimensions become known. A detached\n       image from the previous chapter may finish loading late, so only let images\n       belonging to the chapter that registered the listener trigger a reflow. */\n    const layoutChapter=chapIdx;\n    for(const img of bodyRef.current.querySelectorAll("img")){\n      if(!img.complete) img.addEventListener("load",()=>{\n        if(activeChapterRef.current===layoutChapter) layoutPages(currentPagePct());\n      },{once:true});\n    }''',
'chapter-scoped initial layout')

repl(
'''  function currentPagePct(){\n    const r=pageRef.current;\n    return r.total>1?r.page/(r.total-1):0;\n  }''',
'''  function currentPagePct(){\n    const r=pageRef.current;\n    if(r.chapter!==chapIdx) return 0;\n    return r.total>1?r.page/(r.total-1):0;\n  }''',
'current pct guard')

repl(
'''  function savePagePosition(){\n    if(!book) return;\n    const pct=currentPagePct();''',
'''  function savePagePosition(){\n    if(!book||pageRef.current.chapter!==chapIdx) return;\n    const pct=currentPagePct();''',
'save position guard')

repl(
'''      pageRef.current={page,total,step};''',
'''      pageRef.current={chapter:chapIdx,page,total,step};''',
'layout page chapter')

repl(
'''  function goPage(page){\n    const el=bodyRef.current;\n    const r=pageRef.current;\n    if(!el) return;''',
'''  function goPage(page){\n    const el=bodyRef.current;\n    const r=pageRef.current;\n    if(!el||r.chapter!==chapIdx) return;''',
'go page guard')

repl(
'''    if(dir>0&&chapIdx<book.parsed.spine.length-1){\n      flushClock(true); savePagePosition(); pendingPctRef.current=0; setChapIdx(chapIdx+1); return;\n    }\n    if(dir<0&&chapIdx>0){\n      flushClock(true); savePagePosition(); pendingPctRef.current=1; setChapIdx(chapIdx-1);\n    }''',
'''    if(dir>0&&chapIdx<book.parsed.spine.length-1){\n      const target=chapIdx+1;\n      flushClock(true); savePagePosition();\n      pendingPctRef.current={chapter:target,pct:0};\n      pageRef.current={chapter:target,page:0,total:1,step:0};\n      setPageInfo({page:0,total:1});\n      setChapIdx(target); return;\n    }\n    if(dir<0&&chapIdx>0){\n      const target=chapIdx-1;\n      flushClock(true); savePagePosition();\n      pendingPctRef.current={chapter:target,pct:1};\n      pageRef.current={chapter:target,page:0,total:1,step:0};\n      setPageInfo({page:0,total:1});\n      setChapIdx(target);\n    }''',
'turn page chapter reset')

p.write_text(s)

sw=Path('sw.js')
t=sw.read_text()
if 'const VERSION = "rr-v11";' not in t:
    raise SystemExit('unexpected sw version')
t=t.replace('const VERSION = "rr-v11";','const VERSION = "rr-v12";',1)
t=t.replace('./app.js?v=11','./app.js?v=12').replace('./config.js?v=11','./config.js?v=12').replace('./manifest.json?v=11','./manifest.json?v=12')
sw.write_text(t)

idx=Path('index.html')
i=idx.read_text()
i=i.replace('manifest.json?v=11','manifest.json?v=12').replace('app.js?v=11','app.js?v=12').replace('config.js?v=11','config.js?v=12')
idx.write_text(i)

print('chapter pagination patch applied')
