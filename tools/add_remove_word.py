from pathlib import Path
p=Path('src/app-source.jsx')
s=p.read_text()

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s.replace(old,new,1)

once('''function WordSheet({stack,onClose,onNested,onSave,onRetry,knownSet,onPopupTime}){''',
'''function WordSheet({stack,onClose,onNested,onSave,onRemove,onRetry,knownSet,onPopupTime}){''','WordSheet remove prop')

once('''            {top.level===0&&(
              top.saved
                ? <div className="chip" style={{background:"#D8EBDC",color:"var(--good)"}}>✓ Saved</div>
                : <button className="btn btn-primary" style={{width:"100%",marginTop:14}}
                    onClick={onSave}>Save word</button>
            )}''',
'''            {top.level===0&&(
              <>
                {top.saved
                  ? <div className="chip" style={{background:"#D8EBDC",color:"var(--good)"}}>✓ Saved</div>
                  : <button className="btn btn-primary" style={{width:"100%",marginTop:14}}
                      onClick={onSave}>Save word</button>}
                <button className="btn btn-ghost" style={{width:"100%",marginTop:9}}
                  onClick={onRemove}>Remove underline</button>
              </>
            )}''','lookup remove control')

once('''  function saveWord(){
    const top=stack[0];''',
'''  function removeWordFamily(words){
    const family=new Set();
    for(const w of words||[]) for(const f of wordFamily(w)) family.add(f);
    if(!family.size) return;
    const touches=w=>{
      for(const f of wordFamily(w)) if(family.has(f)) return true;
      return false;
    };
    setSeen(cur=>{
      const n={...cur};
      for(const k of Object.keys(n)) if(touches(k)) delete n[k];
      lsSet("seen",n); return n;
    });
    setVocab(cur=>{
      const n={...cur};
      for(const [k,e] of Object.entries(n)){
        const forms=[e.w,e.span,...(e.forms||[])].filter(Boolean);
        if(forms.some(touches)) delete n[k];
      }
      lsSet("vocab",n); return n;
    });
  }

  function removeTopWord(){
    const top=stack[0];
    if(!top) return;
    const d=top.data||{};
    removeWordFamily([top.word,top.cacheKey,d.lemma,d.span]);
    setStack([]);
  }

  function saveWord(){
    const top=stack[0];''','remove word helpers')

once('''                <button className="icon-btn" aria-label="Say it" onClick={()=>speak(e.span||e.w)}>{"🔊"}</button>
              </div>''',
'''                <button className="icon-btn" aria-label="Say it" onClick={()=>speak(e.span||e.w)}>{"🔊"}</button>
                <button className="icon-btn" aria-label="Remove word" title="Remove word"
                  onClick={()=>removeWordFamily([e.w,e.span,...(e.forms||[])])}>{"⌫"}</button>
              </div>''','word list remove control')

once('''          onNested={nested}
          onSave={saveWord}
          onPopupTime={onPopupTime}''',
'''          onNested={nested}
          onSave={saveWord}
          onRemove={removeTopWord}
          onPopupTime={onPopupTime}''','root remove prop')

p.write_text(s)
for needle in ['Remove underline','function removeWordFamily','onRemove={removeTopWord}','aria-label="Remove word"']:
    if needle not in s: raise SystemExit('missing '+needle)
print('remove-word UI patch complete')
