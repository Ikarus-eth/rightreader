from pathlib import Path

p=Path('src/app-source.jsx')
s=p.read_text()

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s.replace(old,new,1)

# Replace IPA with the kid-friendly dictionary respelling Juna recognises.
once('''"ipa":"British English IPA for span, between /slashes/, one pronunciation only"''',
     '''"pron":"kid-friendly British-English pronunciation respelling using normal letters and hyphens; CAPITALISE the stressed syllable; no IPA symbols; example: massacre -> MASS-uh-kuh"''',
     'lookup pronunciation shape')
once('''"ipa" (British English IPA for the word, between /slashes/, one pronunciation only)''',
     '''"pron" (kid-friendly British-English pronunciation respelling using normal letters and hyphens; CAPITALISE the stressed syllable; no IPA symbols; example: massacre -> MASS-uh-kuh)''',
     'batch pronunciation field')
once('''"ipa":"/.../"''','''"pron":"MASS-uh-kuh"''','batch pronunciation example')

for old,new,label in [
    ('ipa:String(r.ipa||"")','pron:String(r.pron||"")','prefetch pronunciation'),
    ('ipa:String(j.ipa||"")','pron:String(j.pron||"")','live pronunciation'),
]:
    n=s.count(old)
    if label=='live pronunciation':
        if n!=2: raise SystemExit(f'{label}: expected 2 matches, found {n}')
        s=s.replace(old,new)
    else:
        once(old,new,label)

once('''ctx:top.sentence,ipa:d.ipa,en:d.en''','''ctx:top.sentence,pron:d.pron,en:d.en''','save pronunciation')
once('''.ipa{font-family:"Charis SIL","Doulos SIL","Times New Roman",serif;color:var(--ink2);font-size:17px;letter-spacing:.02em;margin:3px 0 8px}''',
     '''.pron{font-family:"Avenir Next",Avenir,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink2);font-size:17px;font-weight:650;letter-spacing:.01em;margin:3px 0 8px}''',
     'pronunciation css')
once('''{d&&d.ipa&&<div className="ipa">{d.ipa}</div>}''','''{d&&d.pron&&<div className="pron">{d.pron}</div>}''','sheet pronunciation')
once('''{e.ipa&&<div className="ipa">{e.ipa}</div>}''','''{e.pron&&<div className="pron">{e.pron}</div>}''','word-list pronunciation')

# Legacy cache entries (including the short-lived IPA release) refresh once to gain respelling.
once('''      const haveIpa=!!(have&&have.senses.length&&have.senses.every(x=>String(x.ipa||"").trim()));
      if(haveIpa||knownSet.has(key)) continue;''',
'''      const havePron=!!(have&&have.senses.length&&have.senses.every(x=>String(x.pron||"").trim()));
      if(havePron||knownSet.has(key)) continue;''','prefetch old cache')
once('''        if(haveIpa) continue;''','''        if(havePron) continue;''','expression old cache')
once('''    const missingIpa=!!(entry&&entry.senses.some(x=>!String(x.ipa||"").trim()));''',
     '''    const missingPron=!!(entry&&entry.senses.some(x=>!String(x.pron||"").trim()));''','live old cache marker')
once('''    if(!entry||!entry.senses.length||missingIpa){''','''    if(!entry||!entry.senses.length||missingPron){''','live old cache refresh')
s=s.replace('''Cache entries created before IPA support are still useful for meaning,
       but they cannot satisfy the pronunciation UI.''','''Older cache entries are still useful for meaning,
       but they cannot satisfy the kid-friendly pronunciation UI.''')

# Treat normal grammatical forms as one word for seen/saved underlining.
# The model already supplies a lemma, so this is intentionally a small inflector,
# not a dictionary: massacre -> massacres/massacred/massacring, like -> likes/liked/liking.
once('''function normTok(w){ return w.toLowerCase().replace(/[’‘]/g,"'"); }

/* Longest match wins, so "put up with" beats "put up". */''',
'''function normTok(w){ return w.toLowerCase().replace(/[’‘]/g,"'"); }

function wordFamily(word){
  const w=normTok(String(word||"").trim());
  const out=new Set();
  if(!w) return out;
  out.add(w);
  if(/\\s/.test(w)) return out; // expressions stay exact

  const add=x=>{ if(x&&x.length>1) out.add(x); };
  if(/[^aeiou]y$/.test(w)){
    const stem=w.slice(0,-1);
    add(stem+"ies"); add(stem+"ied"); add(w+"ing");
  }else if(w.endsWith("e")&&!w.endsWith("ee")){
    add(w+"s"); add(w+"d"); add(w.slice(0,-1)+"ing");
  }else{
    add(w+(/(?:s|x|z|ch|sh)$/.test(w)?"es":"s"));
    add(w+"ed"); add(w+"ing");
    /* stop -> stopped/stopping, plan -> planned/planning */
    if(w.length>=3&&/[^aeiou][aeiou][^aeiouwxy]$/.test(w.slice(-3))){
      add(w+w.slice(-1)+"ed"); add(w+w.slice(-1)+"ing");
    }
  }
  return out;
}
function addWordFamily(set,word){ for(const f of wordFamily(word)) set.add(f); }

/* Longest match wins, so "put up with" beats "put up". */''','word-family helper')

once('''  const knownSet=useMemo(()=>{
    const s=new Set();
    for(const e of Object.values(vocab)){
      if(e.w) s.add(normTok(e.w));
      if(e.span) s.add(normTok(e.span));
      for(const f of e.forms||[]) s.add(normTok(f));
    }
    return s;
  },[vocab]);
  const seenSet=useMemo(()=>new Set(Object.keys(seen)),[seen]);''',
'''  const knownSet=useMemo(()=>{
    const s=new Set();
    for(const e of Object.values(vocab)){
      if(e.w) addWordFamily(s,e.w);
      if(e.span) addWordFamily(s,e.span);
      for(const f of e.forms||[]) addWordFamily(s,f);
    }
    return s;
  },[vocab]);
  const seenSet=useMemo(()=>{
    const s=new Set();
    for(const k of Object.keys(seen)){
      addWordFamily(s,k);
      const entry=normalizeEntry(wcache[k]);
      for(const sense of (entry&&entry.senses)||[]){
        addWordFamily(s,sense.lemma||"");
        addWordFamily(s,sense.span||"");
      }
    }
    return s;
  },[seen,wcache]);''','known/seen word families')

# Give the page noticeably more breathing room at the bottom, including the iPad safe area.
once('''.reader{height:100%;width:auto;margin-inline:clamp(28px,7vw,60px);padding:22px 0 38px;font-size:var(--rsize);line-height:var(--rlead);''',
'''.reader{height:100%;width:auto;margin-inline:clamp(28px,7vw,60px);padding:22px 0 max(82px,calc(env(safe-area-inset-bottom) + 66px));font-size:var(--rsize);line-height:var(--rlead);''','reader bottom gap')
once('''.page-indicator{position:absolute;left:50%;bottom:7px;transform:translateX(-50%);z-index:4;''',
'''.page-indicator{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:4;''','page indicator bottom gap')

# Full portable backup: unlike the old JSON backup this includes the API key,
# every rr_ localStorage value, and the actual EPUB bytes from IndexedDB.
old='''    function exportAll(){
      const blob=new Blob([JSON.stringify({
        v:1,exported:new Date().toISOString(),
        vocab,seen,wcache,sessions,positions,spend
      },null,1)],{type:"application/json"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="right-reader-backup-"+today()+".json";
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    }
    function importAll(file){
      const fr=new FileReader();
      fr.onload=()=>{
        try{
          const j=JSON.parse(fr.result);
          if(j.vocab) saveVocab({...vocab,...j.vocab});
          if(j.seen) saveSeen({...seen,...j.seen});
          if(j.wcache) setWcache(persistCache(migrateCache({...wcache,...j.wcache})));
          if(j.sessions){ const n={...sessions,...j.sessions}; setSessions(n); lsSet("sessions",n); }
          if(j.positions){ const n={...positions,...j.positions}; setPositions(n); lsSet("pos",n); }
          setMsg("Restored.");
        }catch(e){ setMsg("Could not read that file."); }
      };
      fr.readAsText(file);
    }'''
new='''    function bufferToBase64(buf){
      const bytes=buf instanceof ArrayBuffer?new Uint8Array(buf):new Uint8Array(buf.buffer,buf.byteOffset||0,buf.byteLength||buf.length);
      let out=""; const chunk=0x8000;
      for(let i=0;i<bytes.length;i+=chunk) out+=String.fromCharCode(...bytes.subarray(i,i+chunk));
      return btoa(out);
    }
    function base64ToBuffer(text){
      const raw=atob(String(text||""));
      const bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
      return bytes.buffer;
    }
    async function exportAll(){
      setMsg("Making full backup …");
      try{
        const stored=await dbAll();
        const bookRows=stored.map(r=>({...r,file:bufferToBase64(r.file)}));
        const storage={};
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if(k&&k.startsWith("rr_")) storage[k]=localStorage.getItem(k);
        }
        const blob=new Blob([JSON.stringify({
          v:2,exported:new Date().toISOString(),storage,books:bookRows
        })],{type:"application/json"});
        const a=document.createElement("a");
        a.href=URL.createObjectURL(blob);
        a.download="right-reader-full-backup-"+today()+".json";
        a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href),4000);
        setMsg("Full backup created. Keep it private: it contains the API key.");
      }catch(e){ setMsg("Could not create the full backup."); }
    }
    function importAll(file){
      const fr=new FileReader();
      fr.onload=async()=>{
        try{
          const j=JSON.parse(fr.result);
          if(j.v>=2&&j.storage){
            for(const [k,v] of Object.entries(j.storage)) if(k.startsWith("rr_")&&typeof v==="string") localStorage.setItem(k,v);
            for(const r of (j.books||[])) if(r&&r.id&&r.file) await dbPut({...r,file:base64ToBuffer(r.file)});
            setMsg("Everything restored. Reloading …");
            setTimeout(()=>location.reload(),350);
            return;
          }
          /* Legacy v1 backups remain importable. */
          if(j.vocab) saveVocab({...vocab,...j.vocab});
          if(j.seen) saveSeen({...seen,...j.seen});
          if(j.wcache) setWcache(persistCache(migrateCache({...wcache,...j.wcache})));
          if(j.sessions){ const n={...sessions,...j.sessions}; setSessions(n); lsSet("sessions",n); }
          if(j.positions){ const n={...positions,...j.positions}; setPositions(n); lsSet("pos",n); }
          setMsg("Restored.");
        }catch(e){ setMsg("Could not read that backup file."); }
      };
      fr.readAsText(file);
    }'''
once(old,new,'portable backup functions')

once('''              <button className="btn btn-plain" style={{width:"100%"}} onClick={exportAll}>Export everything</button>''',
'''              <button className="btn btn-primary" style={{width:"100%"}} onClick={exportAll}>Create full backup</button>''','backup button')
once('''                Browser storage can occasionally be cleared. Books can be imported again, but
                word history and reading time cannot, so export a backup occasionally.''',
'''                This backup contains the books, reading position, saved words, history, settings and API key.
                Create one before ever removing Right Reader from the Home Screen. Keep the file private.''','backup hint')

# Cache-bust icon references so Safari does not reuse the blank asset.
s=s.replace('./icons/icon-192.png','./icons/icon-192.png?v=8')

p.write_text(s)

# Cache-bust install icon and use a PNG favicon too.
idx=Path('index.html')
t=idx.read_text()
t=t.replace('href="icons/apple-touch-icon.png"','href="icons/apple-touch-icon.png?v=8"')
t=t.replace('<link rel="icon" href="icons/icon.svg" type="image/svg+xml"/>','<link rel="icon" href="icons/icon-192.png?v=8" type="image/png"/>')
idx.write_text(t)

man=Path('manifest.json')
t=man.read_text().replace('icons/icon-192.png','icons/icon-192.png?v=8').replace('icons/icon-512.png','icons/icon-512.png?v=8').replace('icons/icon-maskable-512.png','icons/icon-maskable-512.png?v=8')
man.write_text(t)

sw=Path('sw.js')
t=sw.read_text()
if 'const VERSION = "rr-v7";' not in t: raise SystemExit('unexpected sw version')
sw.write_text(t.replace('const VERSION = "rr-v7";','const VERSION = "rr-v8";',1))

r=Path('README.md')
t=r.read_text()
t=t.replace('British-English IPA','kid-friendly British-English pronunciation respelling')
t=t.replace('Current service-worker cache for this release: `rr-v7`.', 'Current service-worker cache for this release: `rr-v8`.')
if 'full portable backup' not in t.lower():
    t += '\n\n## Safe Home Screen reinstall\n\nNormal app/service-worker updates preserve IndexedDB and localStorage. Removing the Home Screen web app can delete that isolated storage on iPadOS. Parent → Settings → Backup now creates a full portable backup containing EPUBs, saved words, reading history/position, settings, and the API key. Create that file before removing the Home Screen app, then restore it after re-adding. Keep it private because it contains the API key.\n'
r.write_text(t)

out=p.read_text()
for needle in ['MASS-uh-kuh','Create full backup','bufferToBase64','missingPron','className="pron"','function wordFamily','addWordFamily(s,sense.lemma','max(82px']:
    if needle not in out: raise SystemExit('missing '+needle)
if 'rr-v8' not in sw.read_text(): raise SystemExit('sw not bumped')
print('source patch complete')
