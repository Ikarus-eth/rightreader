from pathlib import Path

p=Path('src/app-source.jsx')
s=p.read_text()

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s.replace(old,new,1)

# Warm storybook palette inspired by the kitten/butterfly artwork.
once('''  --paper:#FBF6EC; --paper2:#F3EADA; --ink:#241F1A; --ink2:#5B5148;
  --accent:#B4551F; --accent-soft:#F4E2D3; --line:#E2D5C1;
  --good:#3D7A4E; --warn:#B4551F;''','''  --paper:#FFF8E3; --paper2:#F6EBCB; --ink:#20392D; --ink2:#6C624D;
  --accent:#E39A2E; --accent-soft:#FBE8B7; --line:#E7D5AA;
  --good:#60794E; --warn:#B86E22;''','root palette')
once('''  --paper:#FFFFFF; --paper2:#F2F2F0; --ink:#1B1B19; --ink2:#5E5E5A;
  --accent:#A8481A; --accent-soft:#F6E4D8; --line:#E4E4E0;''','''  --paper:#FFFDF4; --paper2:#F6EFD8; --ink:#20392D; --ink2:#6C624D;
  --accent:#E39A2E; --accent-soft:#FBE8B7; --line:#E8DAB9;''','light palette')
once('''  --paper:#15161A; --paper2:#22242A; --ink:#E4E2DC; --ink2:#9A968D;
  --accent:#E2884A; --accent-soft:#38291D; --line:#2E3138;
  --good:#7FB88C;''','''  --paper:#14251E; --paper2:#1D342A; --ink:#F8EFCF; --ink2:#C6B993;
  --accent:#F0B64A; --accent-soft:#3D472B; --line:#355344;
  --good:#A8C980;''','night palette')

once('''body{
  background:var(--paper); color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased;
  overscroll-behavior-y:none;
}''','''body{
  background:
    radial-gradient(circle at 12% 8%,rgba(255,237,161,.38),transparent 26%),
    radial-gradient(circle at 88% 16%,rgba(228,154,46,.10),transparent 26%),
    linear-gradient(180deg,var(--paper),#FFF3D4 130%);
  color:var(--ink);
  font-family:"Avenir Next",Avenir,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased;
  overscroll-behavior-y:none;
}''','body theme')

once('''.serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}''','''.serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
.brand-title{font-family:"Marker Felt","Chalkboard SE","Bradley Hand",sans-serif;font-size:24px!important;font-weight:800;letter-spacing:.2px;display:flex;align-items:center;gap:9px}
.brand-icon{width:38px;height:38px;border-radius:11px;object-fit:cover;box-shadow:0 3px 9px rgba(61,69,40,.18)}
.empty-mascot{width:116px;height:116px;border-radius:28px;display:block;margin:0 auto 16px;box-shadow:0 8px 24px rgba(75,62,33,.16)}''','brand css')

once('''.topbar{position:sticky;top:0;z-index:20;background:rgba(251,246,236,.94);
  backdrop-filter:saturate(140%) blur(10px);border-bottom:1px solid var(--line)}''','''.topbar{position:sticky;top:0;z-index:20;background:rgba(255,248,227,.94);
  backdrop-filter:saturate(135%) blur(14px);border-bottom:1px solid rgba(211,185,126,.55);
  box-shadow:0 3px 14px rgba(81,68,35,.06)}''','topbar')
once('''.icon-btn{border:none;background:transparent;font-size:20px;line-height:1;padding:9px 10px;
  border-radius:12px;cursor:pointer;color:var(--ink)}''','''.icon-btn{border:1px solid transparent;background:transparent;font-size:20px;line-height:1;padding:9px 10px;
  border-radius:14px;cursor:pointer;color:var(--ink)}''','icon button')
once('''.btn{border:none;border-radius:14px;padding:13px 18px;font-size:16px;font-weight:650;
  cursor:pointer;font-family:inherit;transition:transform .06s}''','''.btn{border:none;border-radius:18px;padding:13px 18px;font-size:16px;font-weight:750;
  cursor:pointer;font-family:inherit;transition:transform .06s,box-shadow .12s}''','button')
once('.btn-primary{background:var(--accent);color:#fff}', '.btn-primary{background:linear-gradient(180deg,#F2B84B,var(--accent));color:#20392D;box-shadow:0 5px 12px rgba(198,128,27,.22)}', 'primary')
once('.btn-ghost{background:var(--accent-soft);color:var(--accent)}', '.btn-ghost{background:#FFF7DF;color:#5A513D;border:1px solid var(--line)}', 'ghost')

once('''.bookcover{width:100%;aspect-ratio:2/3;border-radius:8px;object-fit:cover;
  background:var(--paper2);box-shadow:0 6px 18px rgba(60,40,20,.18);display:flex;''','''.bookcover{width:100%;aspect-ratio:2/3;border-radius:16px;object-fit:cover;
  background:var(--paper2);box-shadow:0 8px 20px rgba(70,59,31,.18);display:flex;''','bookcover')
once('''.addcard{border:2px dashed var(--line);border-radius:8px;aspect-ratio:2/3;display:flex;''','''.addcard{border:2px dashed #D6B66D;border-radius:16px;aspect-ratio:2/3;display:flex;
  background:rgba(255,250,233,.7);''','addcard')

once('''.reader{padding:6px 0 132px;font-size:var(--rsize);line-height:var(--rlead)}''','''.reader{padding:18px 4px 132px;font-size:var(--rsize);line-height:var(--rlead);letter-spacing:.003em}''','reader')
once('''.w.known{background:linear-gradient(transparent 68%,#CFE6D3 68%)}
.w.seen{background:linear-gradient(transparent 72%,#EFE0C6 72%)}''','''.w.known{background:linear-gradient(transparent 70%,#C9DBA9 70%)}
.w.seen{background:linear-gradient(transparent 70%,#F4CC73 70%)}''','word highlights')

once('''.sheet{background:var(--paper);width:100%;max-width:560px;border-radius:22px 22px 0 0;
  padding:20px 20px max(20px,env(safe-area-inset-bottom));max-height:86vh;overflow:auto;
  box-shadow:0 -8px 40px rgba(40,25,10,.25);animation:up .2s ease-out}''','''.sheet{background:linear-gradient(180deg,#FFFCF0,var(--paper));width:100%;max-width:560px;border-radius:28px 28px 0 0;
  padding:22px 22px max(22px,env(safe-area-inset-bottom));max-height:86vh;overflow:auto;
  border:1px solid var(--line);box-shadow:0 -10px 44px rgba(54,48,27,.22);animation:up .2s ease-out}''','sheet')
once('''.headword{font-size:30px;font-weight:800;flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.15}''','''.headword{font-size:31px;font-weight:800;flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.15;color:#20392D}''','headword')
once('''.de-box{background:var(--paper2);border-radius:14px;padding:13px 15px;margin-top:14px}''','''.de-box{background:#F8EDCF;border:1px solid var(--line);border-radius:18px;padding:13px 15px;margin-top:14px}''','de box')

once('''.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:14px}''','''.card{background:rgba(255,252,240,.92);border:1px solid var(--line);border-radius:20px;padding:17px;margin-bottom:14px;box-shadow:0 5px 16px rgba(78,67,37,.06)}''','card')
once('''.wcard{background:var(--paper2);border-radius:14px;padding:14px 16px;margin-bottom:10px}''','''.wcard{background:rgba(255,252,240,.92);border:1px solid var(--line);border-radius:20px;padding:15px 17px;margin-bottom:11px;box-shadow:0 4px 12px rgba(78,67,37,.06)}''','word card')
once('''.tabs button.on{background:var(--accent);color:#fff}''','''.tabs button.on{background:var(--accent);color:#20392D;box-shadow:0 3px 8px rgba(198,128,27,.18)}''','active tab')
once('''.reader-tip{display:flex;align-items:center;gap:14px;background:var(--accent-soft);color:var(--ink);
  border-radius:14px;padding:12px 14px;margin:14px 0 8px;font-size:14px;line-height:1.45}''','''.reader-tip{display:flex;align-items:center;gap:14px;background:#FFF0C7;color:var(--ink);
  border:1px solid #E7CE91;border-radius:18px;padding:12px 14px;margin:14px 0 8px;font-size:14px;line-height:1.45}''','reader tip')

# Add the kitten brand mark in the library and empty-state screen.
once('''          <div className="tb-title serif" style={{fontSize:19}}>Right Reader</div>''','''          <div className="tb-title brand-title"><img className="brand-icon" src="./icons/icon-192.png" alt=""/>Right Reader</div>''','library brand')
once('''              <div className="serif" style={{fontSize:25,fontWeight:800,color:"var(--ink)",marginBottom:12}}>
                Choose a book to start
              </div>''','''              <img className="empty-mascot" src="./icons/icon-192.png" alt=""/>
              <div className="brand-title" style={{justifyContent:"center",fontSize:27,marginBottom:8}}>
                Choose a book to start
              </div>''','empty mascot')

# Keep browser chrome in the new parchment tone.
once('''    if(meta) meta.setAttribute("content",prefs.theme==="night"?"#15161A":prefs.theme==="light"?"#FFFFFF":"#FBF6EC");''','''    if(meta) meta.setAttribute("content",prefs.theme==="night"?"#14251E":prefs.theme==="light"?"#FFFDF4":"#FFF8E3");''','theme color runtime')

p.write_text(s)

# PWA shell colors and cache version.
index=Path('index.html')
i=index.read_text().replace('<html lang="de">','<html lang="en">')
i=i.replace('#FBF6EC','#FFF8E3')
index.write_text(i)

manifest=Path('manifest.json')
m=manifest.read_text().replace('#FBF6EC','#FFF8E3')
manifest.write_text(m)

sw=Path('sw.js')
w=sw.read_text()
if 'const VERSION = "rr-v5";' not in w:
    raise SystemExit('unexpected service worker version')
sw.write_text(w.replace('const VERSION = "rr-v5";','const VERSION = "rr-v6";',1))

print('storybook theme applied')
