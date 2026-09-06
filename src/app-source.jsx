import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import JSZip from "jszip";
import FREQ from "./data/freq3500.json";
import MWE from "./data/mwe.json";

/* ============================================================
   Right Reader — EPUB reading for a young English-as-L2 reader
   (10 y/o, German L1, English A2-B1)

   Architecture, and why:

   NO SERVER. Calls go straight from the browser to api.openai.com.
   The key lives in localStorage on this one iPad, entered once via the
   parent screen. It is never in the repo. A browser-stored API key can
   be read by anyone with access to the device, so use a dedicated key,
   a small prepaid balance, and auto-recharge OFF.

   NO IFRAME. Chapters are parsed out of the EPUB zip and rendered into
   native DOM. epub.js renders into an iframe with CSS columns, and tap
   coordinate precision inside an iframe is the one thing this app
   cannot afford to get wrong, because tapping a word IS the app.

   Books  -> IndexedDB (raw .epub bytes, re-parsed on open)
   Everything else -> localStorage under "rr_"
   ============================================================ */

const DAY = 86400000;
const IDLE_MS = 90000;          // no scroll/tap this long = not reading
const POPUP_CREDIT_CAP = 45000; // most one lookup can count toward reading time
const WCACHE_MAX = 4000;

/* ---------------- scheduling (FSRS-4.5) ----------------
   Ported unchanged from Story Time so both apps grade memory the same
   way. Nothing in this app reviews words yet - she only collects them -
   but every saved word is written with the fields the scheduler needs,
   so the practice game can be switched on later without a migration. */
const FSRS_W=[0.4872,1.4003,3.7145,13.8206,5.1618,1.2298,0.8975,0.0310,
              1.6474,0.1367,1.0461,2.1072,0.0793,0.3246,1.5870,0.2272,2.8755];
const FSRS_DECAY=-0.5;
const FSRS_FACTOR=Math.pow(0.9,1/FSRS_DECAY)-1;
const TARGET_R=0.9;
function clampD(d){ return Math.min(10,Math.max(1,d)); }
function initS(g){ return Math.max(0.1,FSRS_W[g-1]); }
function initD(g){ return clampD(FSRS_W[4]-(g-3)*FSRS_W[5]); }
function retrievability(days,s){ return Math.pow(1+FSRS_FACTOR*days/Math.max(0.1,s),FSRS_DECAY); }
function nextD(d,g){ const dd=d-FSRS_W[6]*(g-3); return clampD(FSRS_W[7]*initD(4)+(1-FSRS_W[7])*dd); }
function nextS(s,d,r,g){
  const hard=g===2?FSRS_W[15]:1, easy=g===4?FSRS_W[16]:1;
  if(g===1) return Math.max(0.1,FSRS_W[11]*Math.pow(d,-FSRS_W[12])*(Math.pow(s+1,FSRS_W[13])-1)*Math.exp((1-r)*FSRS_W[14]));
  return Math.max(0.1,s*(1+Math.exp(FSRS_W[8])*(11-d)*Math.pow(s,-FSRS_W[9])*(Math.exp((1-r)*FSRS_W[10])-1)*hard*easy));
}
function intervalFor(s){
  const i=(s/FSRS_FACTOR)*(Math.pow(TARGET_R,1/FSRS_DECAY)-1);
  return Math.max(1,Math.round(i));
}
function schedule(entry,grade,now){
  const fresh=!entry||entry.s==null;
  let s,d;
  if(fresh){ s=initS(grade); d=initD(grade); }
  else{
    const days=Math.max(0,(now-(entry.last||now))/DAY);
    const r=retrievability(days,entry.s);
    s=nextS(entry.s,entry.d==null?5:entry.d,r,grade);
    d=nextD(entry.d==null?5:entry.d,grade);
  }
  return {...entry,s,d,last:now,due:now+intervalFor(s)*DAY,
    reps:((entry&&entry.reps)||0)+1,
    lapses:((entry&&entry.lapses)||0)+(grade===1?1:0)};
}
const STRENGTH_BANDS=[1,4,14,45];
const STRENGTH_NAMES=["Just met","Getting there","Sticking","Strong","Known"];
function strengthOf(e){
  if(!e||e.s==null) return 0;
  let i=0; while(i<STRENGTH_BANDS.length&&e.s>=STRENGTH_BANDS[i]) i++;
  return i;
}

/* ---------------- localStorage ---------------- */
function lsGet(key,fb){
  try{ const v=localStorage.getItem("rr_"+key); return v?JSON.parse(v):fb; }
  catch(e){ return fb; }
}
function lsSet(key,val){
  try{ localStorage.setItem("rr_"+key,JSON.stringify(val)); return true; }
  catch(e){ return false; }
}

/* ---------------- IndexedDB (book files only) ----------------
   Books are stored as the original bytes and re-parsed on open. Storing
   parsed chapters instead would be faster to open and far more fragile:
   any change to the parser would leave old books rendered by old rules. */
const DB_NAME="rightreader", DB_STORE="books";
let dbP=null;
function db(){
  if(dbP) return dbP;
  dbP=new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>{
      const d=r.result;
      if(!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE,{keyPath:"id"});
    };
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
  return dbP;
}
async function dbPut(rec){
  const d=await db();
  return new Promise((res,rej)=>{
    const t=d.transaction(DB_STORE,"readwrite");
    t.objectStore(DB_STORE).put(rec);
    t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error);
  });
}
async function dbGet(id){
  const d=await db();
  return new Promise((res,rej)=>{
    const t=d.transaction(DB_STORE,"readonly");
    const q=t.objectStore(DB_STORE).get(id);
    q.onsuccess=()=>res(q.result||null); q.onerror=()=>rej(q.error);
  });
}
async function dbAll(){
  const d=await db();
  return new Promise((res,rej)=>{
    const t=d.transaction(DB_STORE,"readonly");
    const q=t.objectStore(DB_STORE).getAll();
    q.onsuccess=()=>res(q.result||[]); q.onerror=()=>rej(q.error);
  });
}
async function dbDel(id){
  const d=await db();
  return new Promise((res,rej)=>{
    const t=d.transaction(DB_STORE,"readwrite");
    t.objectStore(DB_STORE).delete(id);
    t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error);
  });
}

/* Safari clears script-writable storage aggressively. This asks it not
   to. Support is uneven, which is exactly why the parent screen also
   has a one-tap export - the request is a mitigation, not a guarantee. */
async function askPersist(){
  try{
    if(navigator.storage&&navigator.storage.persist){
      const already=await navigator.storage.persisted();
      if(!already) return await navigator.storage.persist();
      return true;
    }
  }catch(e){}
  return false;
}

/* ============================================================
   EPUB parsing
   ============================================================ */

const XMLNS_OPF="http://www.idpf.org/2007/opf";

function pathJoin(base,rel){
  if(/^[a-z]+:/i.test(rel)) return rel;
  const b=base.split("/").slice(0,-1);
  for(const part of rel.split("/")){
    if(part===".") continue;
    if(part==="..") b.pop();
    else b.push(part);
  }
  return b.join("/");
}
function dirOf(p){ const i=p.lastIndexOf("/"); return i<0?"":p.slice(0,i+1); }
function stripFrag(p){ const i=p.indexOf("#"); return i<0?p:p.slice(0,i); }

function xml(text){
  const d=new DOMParser().parseFromString(text,"application/xml");
  if(d.querySelector("parsererror")){
    /* Some publishers ship XHTML that isn't well-formed XML. Retrying as
       HTML recovers most of them rather than rejecting the whole book. */
    return new DOMParser().parseFromString(text,"text/html");
  }
  return d;
}

/* Reads the container, the OPF and whichever table of contents the book
   happens to carry. EPUB 3 books have a nav document; EPUB 2 books (like
   most published children's fiction) have an NCX. Both are handled, and
   a book with neither still opens - the spine alone is enough to read. */
async function parseEpub(buf){
  const zip=await JSZip.loadAsync(buf);
  const files={};
  zip.forEach((p,f)=>{ if(!f.dir) files[p]=f; });

  const containerFile=files["META-INF/container.xml"];
  if(!containerFile) throw new Error("Not a valid EPUB: no META-INF/container.xml");
  if(files["META-INF/encryption.xml"])
    throw new Error("This book is copy-protected (DRM) and can't be opened.");

  const cdoc=xml(await containerFile.async("string"));
  const rootEl=cdoc.querySelector("rootfile");
  const opfPath=rootEl&&rootEl.getAttribute("full-path");
  if(!opfPath||!files[opfPath]) throw new Error("Not a valid EPUB: package file missing");

  const odoc=xml(await files[opfPath].async("string"));
  const opfDir=dirOf(opfPath);

  const get=(tag)=>{
    const el=odoc.getElementsByTagNameNS("*",tag)[0];
    return el?(el.textContent||"").trim():"";
  };
  const title=get("title")||"Untitled";
  const author=get("creator")||"";
  const language=get("language")||"en";

  const manifest={};
  Array.from(odoc.getElementsByTagNameNS("*","item")).forEach(it=>{
    const id=it.getAttribute("id");
    const href=it.getAttribute("href");
    if(!id||!href) return;
    manifest[id]={
      href:pathJoin(opfPath,decodeURIComponent(href)),
      type:it.getAttribute("media-type")||"",
      props:it.getAttribute("properties")||""
    };
  });

  const spine=[];
  Array.from(odoc.getElementsByTagNameNS("*","itemref")).forEach(ir=>{
    const idref=ir.getAttribute("idref");
    const m=manifest[idref];
    if(!m) return;
    if(!/xhtml|html/i.test(m.type)) return;
    spine.push({id:idref,href:m.href,linear:ir.getAttribute("linear")!=="no"});
  });
  if(!spine.length) throw new Error("This EPUB has no readable chapters.");

  /* cover: the OPF meta pointer first, then a manifest item that says so,
     then anything called cover. Books disagree about which they use. */
  let coverHref=null;
  const metaCover=Array.from(odoc.getElementsByTagNameNS("*","meta"))
    .find(m=>(m.getAttribute("name")||"").toLowerCase()==="cover");
  if(metaCover){
    const cid=metaCover.getAttribute("content");
    if(cid&&manifest[cid]&&/image/i.test(manifest[cid].type)) coverHref=manifest[cid].href;
  }
  if(!coverHref){
    const byProp=Object.values(manifest).find(m=>/cover-image/.test(m.props));
    if(byProp) coverHref=byProp.href;
  }
  if(!coverHref){
    const byName=Object.entries(manifest).find(([id,m])=>/image/i.test(m.type)&&/cover/i.test(id+m.href));
    if(byName) coverHref=byName[1].href;
  }

  /* Table of contents */
  const toc={};
  try{
    const navItem=Object.values(manifest).find(m=>/\bnav\b/.test(m.props));
    if(navItem&&files[navItem.href]){
      const nd=new DOMParser().parseFromString(await files[navItem.href].async("string"),"text/html");
      const list=nd.querySelector('nav[*|type="toc"], nav#toc, nav');
      if(list) list.querySelectorAll("a[href]").forEach(a=>{
        const h=stripFrag(pathJoin(navItem.href,decodeURIComponent(a.getAttribute("href"))));
        if(!toc[h]) toc[h]=(a.textContent||"").trim();
      });
    }
    if(!Object.keys(toc).length){
      const ncxId=(odoc.getElementsByTagNameNS("*","spine")[0]||{getAttribute:()=>null}).getAttribute("toc");
      const ncx=(ncxId&&manifest[ncxId])||Object.values(manifest).find(m=>/dtbncx/.test(m.type));
      if(ncx&&files[ncx.href]){
        const nd=xml(await files[ncx.href].async("string"));
        Array.from(nd.getElementsByTagNameNS("*","navPoint")).forEach(np=>{
          const lbl=np.getElementsByTagNameNS("*","text")[0];
          const con=np.getElementsByTagNameNS("*","content")[0];
          if(!lbl||!con) return;
          const h=stripFrag(pathJoin(ncx.href,decodeURIComponent(con.getAttribute("src")||"")));
          if(h&&!toc[h]) toc[h]=(lbl.textContent||"").trim();
        });
      }
    }
  }catch(e){ /* a missing TOC is cosmetic, never fatal */ }

  return {zip,files,manifest,spine,toc,title,author,language,coverHref,opfDir};
}

/* The cover used to be read with FileReader, which can sit there firing
   neither onload nor onerror. The import awaits it, so a stall meant the
   spinner stayed up forever and the book never appeared in the library -
   with no error to explain why. JSZip can emit base64 directly, so there
   is no FileReader in the path at all now, and a missing cover is never
   a reason to fail an import. */
async function readCover(parsed){
  if(!parsed.coverHref||!parsed.files[parsed.coverHref]) return null;
  try{
    const b64=await parsed.files[parsed.coverHref].async("base64");
    if(!b64||b64.length>3000000) return null;
    const item=Object.values(parsed.manifest||{}).find(m=>m.href===parsed.coverHref);
    const type=(item&&item.type)||"image/jpeg";
    return "data:"+type+";base64,"+b64;
  }catch(e){ return null; }
}

/* ============================================================
   Chapter rendering + word tokenising

   Two passes, and the reason for two is phrasal verbs. A tap target has
   to be a real element, but "put up with" can be split across inline
   markup - "put <em>up</em> with" is one expression and three text
   nodes. So pass one wraps every word and records the token order for
   the whole paragraph; pass two matches expressions against that flat
   token list and marks the members. Doing it in one pass would only
   ever find expressions that happen to sit inside a single text node.
   ============================================================ */

const WORD_RE=/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’‘-][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g;
const CONTRACTION_RE=/^[a-zà-öø-ÿ]+['’](t|s|d|ll|re|ve|m)$/i;
const DROP_TAGS=new Set(["SCRIPT","STYLE","LINK","META","TITLE","IFRAME","OBJECT","EMBED","FORM","INPUT","BUTTON","SVG","NOSCRIPT","AUDIO","VIDEO","BASE"]);
const BLOCKISH=new Set(["P","DIV","H1","H2","H3","H4","H5","H6","BLOCKQUOTE","LI","TD","TH","DD","DT","FIGCAPTION","PRE"]);

const FREQ_SET=new Set(FREQ);

/* Suffix-stripping so "shouted", "cages" and "crying" are recognised as
   known if their base is. Deliberately crude: a false "known" costs one
   live lookup with a two-second wait, a false "unknown" costs a
   thousandth of a dollar. Both are cheap, so precision isn't worth
   dragging a real morphology library into the bundle for. */
function isCommon(lw){
  if(FREQ_SET.has(lw)) return true;
  const tries=[["s",1],["es",2],["ed",2],["d",1],["ing",3],["er",2],["est",3],["ly",2],["ies",3]];
  for(const [suf,cut] of tries){
    if(lw.length>cut+2&&lw.endsWith(suf)){
      const b=lw.slice(0,-cut);
      if(FREQ_SET.has(b)) return true;
      if(FREQ_SET.has(b+"e")) return true;
      if(suf==="ies"&&FREQ_SET.has(b+"y")) return true;
      if(b.length>2&&b[b.length-1]===b[b.length-2]&&FREQ_SET.has(b.slice(0,-1))) return true;
    }
  }
  return false;
}

/* verb form -> candidate expressions starting with it */
const MWE_MAP=(()=>{
  const m=new Map();
  const add=(k,v)=>{ if(!m.has(k)) m.set(k,[]); m.get(k).push(v); };
  for(const [pat,e] of Object.entries(MWE.phrasal)) for(const f of e.v) add(f,[pat,e.rest]);
  for(const parts of MWE.idiom) add(parts[0],[parts.join(" "),parts.slice(1)]);
  return m;
})();

function normTok(w){ return w.toLowerCase().replace(/[’‘]/g,"'"); }

/* Longest match wins, so "put up with" beats "put up". */
function tagMwe(words){
  const out=new Array(words.length).fill(null);
  let i=0;
  while(i<words.length){
    const cands=MWE_MAP.get(words[i]);
    let best=null;
    if(cands) for(const [pat,rest] of cands){
      if(rest.length&&i+rest.length<words.length+0){
        let ok=true;
        for(let k=0;k<rest.length;k++) if(words[i+1+k]!==rest[k]){ ok=false; break; }
        if(ok&&(!best||rest.length>best[1].length)) best=[pat,rest];
      }
    }
    if(best){
      for(let k=0;k<=best[1].length;k++) out[i+k]=best[0];
      i+=best[1].length+1;
    } else i++;
  }
  return out;
}

function sanitize(root){
  const walker=[];
  (function collect(n){
    for(const c of Array.from(n.childNodes)){
      if(c.nodeType===1){ walker.push(c); collect(c); }
    }
  })(root);
  for(const el of walker){
    if(DROP_TAGS.has(el.tagName)){ el.remove(); continue; }
    for(const a of Array.from(el.attributes)){
      const n=a.name.toLowerCase();
      if(n.startsWith("on")||n==="style"&&/expression|javascript:/i.test(a.value)) el.removeAttribute(a.name);
    }
    /* Neutralise links: an external tap would drop her out of the app,
       and an internal one would jump past the reading-position tracking. */
    if(el.tagName==="A"){ el.removeAttribute("href"); el.removeAttribute("target"); }
  }
}

/* XHTML is XML, so <a id="page_1"/> is a complete, empty element. HTML is
   not: it ignores self-closing syntax on anything that isn't a void tag,
   leaves the anchor open, and then the adoption-agency algorithm
   restructures every following paragraph inside it. Published EPUB 2
   fiction is full of these - they are the print page markers - and the
   damage is silent: the chapter still renders, it just loses a third of
   its paragraphs. Parsing as XML instead trades one breakage for another
   (any book whose XHTML isn't well-formed would fail outright), so the
   fix is to close the tags in the source string and stay in HTML, which
   is forgiving about everything else publishers do. */
const VOID_TAGS=new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
function closeSelfClosing(html){
  return html.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\/>/g,
    (m,tag,attrs)=>VOID_TAGS.has(tag.toLowerCase())?m:`<${tag}${attrs}></${tag}>`);
}

async function renderChapter(parsed,href,objectUrls){
  const f=parsed.files[href];
  if(!f) return {html:"",paras:[],nWords:0};
  const raw=await f.async("string");
  const doc=new DOMParser().parseFromString(closeSelfClosing(raw),"text/html");
  const body=doc.body||doc.documentElement;
  sanitize(body);

  /* images: pull the bytes out of the zip and hand the DOM a blob URL */
  const imgs=Array.from(body.querySelectorAll("img, image"));
  for(const im of imgs){
    const src=im.getAttribute("src")||im.getAttribute("xlink:href")||im.getAttribute("href");
    if(!src||/^data:/.test(src)) continue;
    const p=stripFrag(pathJoin(href,decodeURIComponent(src)));
    const zf=parsed.files[p];
    if(!zf){ im.remove(); continue; }
    try{
      const blob=await zf.async("blob");
      const url=URL.createObjectURL(blob);
      objectUrls.push(url);
      im.setAttribute("src",url);
      im.removeAttribute("xlink:href");
      im.setAttribute("loading","lazy");
    }catch(e){ im.remove(); }
  }

  /* Pass 1 — wrap words, paragraph by paragraph */
  const paras=[];
  let gi=0;   // global word index within the chapter

  const blocks=[];
  (function findBlocks(n){
    let hasBlockChild=false;
    for(const c of Array.from(n.children)) if(BLOCKISH.has(c.tagName)){ hasBlockChild=true; findBlocks(c); }
    if(!hasBlockChild&&BLOCKISH.has(n.tagName)) blocks.push(n);
  })(body);
  if(!blocks.length) blocks.push(body);

  for(const blk of blocks){
    const pIdx=paras.length;
    const inHeading=/^H[1-6]$/.test(blk.tagName);
    const texts=[];
    const tokenEls=[], tokenWords=[];
    const tw=document.createTreeWalker(blk,NodeFilter.SHOW_TEXT,null);
    const nodes=[];
    let tn; while((tn=tw.nextNode())) nodes.push(tn);

    /* Whether a capital letter means "name" or just "start of sentence"
       is decided here, by remembering the last non-space character seen
       anywhere in the paragraph. Without it every sentence-opening word
       looks like a proper noun and gets skipped by the prefetcher. */
    let prevSig="";
    for(const node of nodes){
      const s=node.nodeValue;
      if(!s||!s.trim()){ texts.push(s||""); continue; }
      texts.push(s);
      WORD_RE.lastIndex=0;
      const frag=document.createDocumentFragment();
      let last=0, m;
      while((m=WORD_RE.exec(s))){
        if(m.index>last) frag.appendChild(document.createTextNode(s.slice(last,m.index)));
        const before=(s.slice(last,m.index).replace(/\s+$/,"").slice(-1))||prevSig;
        const sentInitial=!before||/[.!?…:;“‘"(]/.test(before);
        const sp=document.createElement("span");
        sp.className="w";
        sp.setAttribute("data-i",String(gi));
        sp.setAttribute("data-p",String(pIdx));
        if(sentInitial) sp.setAttribute("data-si","1");
        if(inHeading) sp.setAttribute("data-h","1");
        sp.textContent=m[0];
        prevSig=m[0].slice(-1);
        frag.appendChild(sp);
        tokenEls.push(sp);
        tokenWords.push(normTok(m[0]));
        gi++;
        last=m.index+m[0].length;
      }
      if(last<s.length){
        const tail=s.slice(last).replace(/\s+$/,"").slice(-1);
        if(tail) prevSig=tail;
        frag.appendChild(document.createTextNode(s.slice(last)));
      }
      node.parentNode.replaceChild(frag,node);
    }

    /* Pass 2 — expressions across the whole paragraph's token stream */
    if(tokenWords.length){
      const tags=tagMwe(tokenWords);
      for(let k=0;k<tags.length;k++){
        if(tags[k]){
          tokenEls[k].setAttribute("data-mwe",tags[k]);
          if(k===0||tags[k-1]!==tags[k]) tokenEls[k].setAttribute("data-mwe-start","1");
        }
      }
    }
    paras.push(texts.join("").replace(/\s+/g," ").trim());
  }

  return {html:body.innerHTML,paras,nWords:gi};
}

/* The sentence a tapped word sits in, for the model's context. Falls
   back to the paragraph when the split is unclear. */
function sentenceFor(paraText,word){
  const t=String(paraText||"");
  if(!t) return "";
  const parts=t.split(/(?<=[.!?…][\"'”’)]*)\s+/);
  const w=String(word||"").split(/\s+/)[0];
  const re=new RegExp("\\b"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/'/g,"['’]")+"\\b","i");
  const hit=parts.find(p=>re.test(p));
  const out=(hit||t).trim();
  return out.length>420?out.slice(0,420)+"…":out;
}

function isProperNounish(surface,sentInitial,lowerSeen){
  if(!/^[A-ZÀ-Ö]/.test(surface)) return false;
  if(surface===surface.toUpperCase()&&surface.length>1) return false;  // ALL CAPS is emphasis
  if(sentInitial) return false;
  return !lowerSeen.has(normTok(surface));
}

/* ============================================================
   Model API — straight from the browser, no proxy

   The API key travels in a browser request and is therefore readable by
   anyone with access to this device. This app deliberately accepts that
   tradeoff for a single-family prototype. Guard rails below are financial
   and behavioural: a per-day request ceiling, a hard output-token cap,
   and same-day token accounting on the parent screen.
   ============================================================ */

/* ---------------- provider ----------------
   OpenAI by default. Both providers answer cross-origin requests from a
   browser, which is what keeps this app serverless: OpenAI echoes the
   page's origin back in access-control-allow-origin and accepts an
   Authorization header, and Anthropic does the same behind its
   dangerous-direct-browser-access header. Verified by preflight against
   both, not assumed.

   The Anthropic path is kept rather than deleted because the only thing
   that differs between them is this adapter, and having it means
   switching back is a one-line change in config.js instead of a rewrite. */

const PROVIDERS={
  openai:{
    url:"https://api.openai.com/v1/chat/completions",
    modelsUrl:"https://api.openai.com/v1/models",
    keyHint:"sk-\u2026",
    headers:k=>({"content-type":"application/json","authorization":"Bearer "+k}),
    body:(model,prompt,maxTokens,drop)=>{
      const b={model,messages:[{role:"user",content:prompt}]};
      /* Newer OpenAI models renamed max_tokens and reject the old name,
         and reasoning models bill hidden thinking tokens against the same
         budget, so a tight limit can come back with empty content. Both
         are handled by the parameter fallback below rather than by
         guessing which family a model belongs to. */
      if(!drop.has("max_completion_tokens")) b.max_completion_tokens=maxTokens;
      else b.max_tokens=maxTokens;
      if(!drop.has("response_format")) b.response_format={type:"json_object"};
      if(CFG.REASONING_EFFORT&&!drop.has("reasoning_effort")) b.reasoning_effort=CFG.REASONING_EFFORT;
      return b;
    },
    text:d=>((d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||""),
    usage:d=>({in:(d.usage||{}).prompt_tokens||0,out:(d.usage||{}).completion_tokens||0}),
    models:d=>(d.data||[]).map(m=>m.id)
  },
  anthropic:{
    url:"https://api.anthropic.com/v1/messages",
    modelsUrl:"https://api.anthropic.com/v1/models",
    keyHint:"sk-ant-\u2026",
    headers:k=>({"content-type":"application/json","x-api-key":k,
      "anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}),
    body:(model,prompt,maxTokens)=>({model,max_tokens:maxTokens,messages:[{role:"user",content:prompt}]}),
    text:d=>(d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n"),
    usage:d=>({in:(d.usage||{}).input_tokens||0,out:(d.usage||{}).output_tokens||0}),
    models:d=>(d.data||[]).map(m=>m.id)
  }
};

const CFG=(typeof window!=="undefined"&&window.APP_CONFIG)||{};
const PROVIDER=PROVIDERS[CFG.PROVIDER]?CFG.PROVIDER:"openai";
const P=PROVIDERS[PROVIDER];
const DAILY_CALL_CAP=CFG.DAILY_CALL_CAP||1200;

function models(){
  const saved=lsGet("models",null);
  return {fast:(saved&&saved.fast)||CFG.MODEL_FAST||"gpt-5.6-luna",
          good:(saved&&saved.good)||CFG.MODEL_GOOD||"gpt-5.6-terra"};
}
function priceOf(model){
  const t=(CFG.PRICES||{})[model];
  /* An unknown model still gets counted, just with a placeholder rate, so
     the spend figure is never silently zero. */
  return t||{in:1,out:5};
}

function localDateKey(d=new Date()){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function today(){ return localDateKey(); }

function noteUsage(model,u){
  if(!u) return;
  const sp=lsGet("spend",{});
  const d=today();
  const row=sp[d]||{calls:0,in:0,out:0,usd:0};
  const pr=priceOf(model);
  row.calls+=1; row.in+=u.in; row.out+=u.out;
  row.usd+=(u.in*pr.in+u.out*pr.out)/1e6;
  sp[d]=row;
  const keys=Object.keys(sp).sort();
  while(keys.length>120) delete sp[keys.shift()];
  lsSet("spend",sp);
}
function callsToday(){ const r=lsGet("spend",{})[today()]; return r?r.calls:0; }

const inFlight=new Set();
let userAborted=false;
function abortAll(){
  userAborted=true;
  for(const c of inFlight){ try{ c.abort(); }catch(e){} }
  inFlight.clear();
  setTimeout(()=>{ userAborted=false; },0);
}

class NeedsKey extends Error{}
class CapReached extends Error{}
class Aborted extends Error{}

/* Parameters the API told us it does not accept for this model, learned
   once and remembered, so a wrong guess costs one rejected call ever
   rather than one on every lookup. */
function droppedParams(){ return new Set(lsGet("drop",[])); }
function dropParam(name){
  const d=droppedParams(); if(d.has(name)) return false;
  d.add(name); lsSet("drop",[...d]); return true;
}

async function rawCall(model,prompt,maxTokens,timeoutMs,key){
  const ctrl=new AbortController();
  inFlight.add(ctrl);
  const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  let res;
  try{
    res=await fetch(P.url,{method:"POST",signal:ctrl.signal,
      headers:P.headers(key),
      body:JSON.stringify(P.body(model,prompt,maxTokens,droppedParams()))});
  }catch(e){
    if(userAborted) throw new Aborted("cancelled");
    if(ctrl.signal.aborted) throw new Error("timed out");
    throw new Error("network");
  }finally{ clearTimeout(timer); inFlight.delete(ctrl); }

  const txt=await res.text();
  if(!res.ok){
    let msg=txt.slice(0,300);
    try{ msg=(JSON.parse(txt).error||{}).message||msg; }catch(e){}
    if(res.status===401||res.status===403) throw new NeedsKey(msg);
    if(res.status===429) throw new Error("Too many requests — wait a moment.");
    /* A 400 naming a parameter means this model does not take it. Drop it
       for good and try once more instead of failing the lookup. */
    if(res.status===400){
      const m=/max_completion_tokens|max_tokens|response_format|reasoning_effort/.exec(msg);
      if(m&&dropParam(m[0]==="max_tokens"?"max_completion_tokens":m[0]))
        return rawCall(model,prompt,maxTokens,timeoutMs,key);
    }
    throw new Error("HTTP "+res.status+": "+msg);
  }
  let data;
  try{ data=JSON.parse(txt); }catch(e){ throw new Error("bad response"); }
  if(data.error) throw new Error(data.error.message||"api error");
  noteUsage(model,P.usage(data));
  const out=P.text(data);
  if(!out||!out.trim()) throw new Error("empty response");
  return out;
}

async function callModel(prompt,{model,maxTokens=1400,timeoutMs=60000}={}){
  const key=lsGet("apikey","");
  if(!key) throw new NeedsKey("No API key set yet.");
  if(callsToday()>=DAILY_CALL_CAP) throw new CapReached("Daily request limit reached.");
  return rawCall(model||models().good,prompt,maxTokens,timeoutMs,key);
}

async function listModels(key){
  const res=await fetch(P.modelsUrl,{headers:P.headers(key)});
  const txt=await res.text();
  if(!res.ok){
    let msg=txt.slice(0,200);
    try{ msg=(JSON.parse(txt).error||{}).message||msg; }catch(e){}
    throw new Error(msg);
  }
  return P.models(JSON.parse(txt)).sort();
}

function parseLoose(raw){
  let t=(raw||"").replace(/```json/gi,"").replace(/```/g,"").trim();
  const a=t.indexOf("{"), b=t.lastIndexOf("}");
  if(a>=0&&b>a) t=t.slice(a,b+1);
  try{ return JSON.parse(t); }catch(e){}
  return JSON.parse(t.replace(/[\u0000-\u001F]+/g," "));
}
const BACKOFF=[0,3000,9000];
async function askJson(prompt,opts){
  let last;
  for(let i=0;i<3;i++){
    if(i>0) await new Promise(r=>setTimeout(r,BACKOFF[i]+Math.random()*1500));
    try{ return parseLoose(await callModel(prompt+(i?"\nReply with ONLY the JSON object, one line, nothing else.":""),opts)); }
    catch(e){
      last=e;
      if(e instanceof NeedsKey||e instanceof CapReached||e instanceof Aborted) break;
    }
  }
  throw last;
}

/* ---------------- prompts ---------------- */

const LEMMA_RULE="Give \"lemma\" as the plain dictionary headword: reduce adverbs to their root ( \"admiringly\" -> \"admire\" ), comparatives and superlatives to the plain adjective, plurals to singular, and any inflected form to the simplest version a beginner would look up.";

const SHAPE='{"span":"...","lemma":"...","sense":"a 1-3 word label for which meaning this is","also":["0-2 short English phrases naming OTHER common, clearly different meanings; empty array if not ambiguous"],"alsoDe":["German for each phrase in also, same order and count"],"en":"one very simple English sentence, max 14 easy words, explaining what it means HERE","de":"the German translation as used here, 1-3 words","deDesc":"one simple German sentence, max 14 words, explaining it"}';

/* The candidate expression comes from a local list that cannot tell
   idiomatic use from literal use - "look at the cat" and "look after
   the cat" both match a pattern. So the list only ever proposes, and
   the model decides, in the same call that does the explaining. This
   costs nothing extra and is the only way to get "put up with" right
   while leaving "go into the kitchen" alone. */
function spanRule(cand){
  if(!cand) return `Set "span" to just the word itself.`;
  return `The words "${cand}" in this sentence MIGHT be a single expression with a meaning of its own. Decide from the sentence. If they are used together as one unit with a meaning you could not work out from the separate words, set "span" to "${cand}" and explain the whole expression. If the words just happen to sit next to each other with their ordinary literal meanings, set "span" to only the tapped word and explain that word alone.`;
}

function wordPrompt(word,sentence,cand){
  return [
    `A 10-year-old German child (English level A2/B1) is reading an English story and tapped the word "${word}" in this sentence: "${sentence}"`,
    spanRule(cand),
    `Explain ONLY the meaning it has in THIS sentence, even if that is not its most common meaning. ${LEMMA_RULE}`,
    `Reply with ONLY one single-line JSON object, no markdown:`,
    SHAPE
  ].join("\n");
}

function nestedPrompt(word,explanation){
  return [
    `A 10-year-old German child (English level A2/B1) is reading a simple English explanation and did not understand one word in it.`,
    `The explanation was: "${explanation}"`,
    `She tapped the word "${word}".`,
    `Explain that word as simply as you possibly can, simpler than the sentence it came from, using only very easy words. ${LEMMA_RULE}`,
    `Set "span" to just the word.`,
    `Reply with ONLY one single-line JSON object, no markdown:`,
    SHAPE
  ].join("\n");
}

function batchPrompt(items){
  const list=items.map((it,i)=>`${i+1}) "${it.w}" in: "${it.s}"`).join("  ");
  return [
    `A 10-year-old German child (English level A2/B1) is reading an English story. Explain each word below very simply, using ONLY the meaning it has in ITS OWN given sentence. ${LEMMA_RULE}`,
    `WORDS: ${list}`,
    `For each give: "word" (exactly as listed), "lemma", "sense" (1-3 word label), "also" (0-2 short English phrases naming other common, clearly different meanings; empty array if not ambiguous), "alsoDe" (German for each, same order and count), "en" (one very simple English sentence, max 14 easy words), "de" (German translation, 1-3 words), "deDesc" (one simple German sentence, max 14 words).`,
    `Reply with ONLY one single-line JSON object, no markdown, no line breaks:`,
    `{"words":[{"word":"...","lemma":"...","sense":"...","also":[],"alsoDe":[],"en":"...","de":"...","deDesc":"..."}]}`
  ].join("\n");
}

/* ---------------- speech ---------------- */
/* iOS will not speak unless synthesis has been started from a real user
   gesture at least once. The long press fires from a timer, which does not
   count, so her very first listen would silently do nothing. Priming it on
   the first touch anywhere in the app fixes that. */
let speechReady=false;
function primeSpeech(){
  if(speechReady||!window.speechSynthesis) return;
  try{
    const u=new SpeechSynthesisUtterance("");
    u.volume=0;
    window.speechSynthesis.speak(u);
    speechReady=true;
  }catch(e){}
}
function speak(text){
  try{
    if(!window.speechSynthesis) return;
    const u=new SpeechSynthesisUtterance(String(text));
    u.lang="en-GB"; u.rate=0.85;
    const vs=window.speechSynthesis.getVoices()||[];
    const v=vs.find(x=>/^en[-_]GB/i.test(x.lang||""))||vs.find(x=>/^en/i.test(x.lang||""));
    if(v) u.voice=v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch(e){}
}

/* ============================================================
   Senses

   The first version cached one explanation per word, keyed by the word.
   So the first time "shut" appeared the app learned one meaning, and
   every later "shut" got that meaning whether it fitted or not. In a
   children's novel that is not an edge case: "shut the door", "shut up",
   "shut in".

   The cache now holds a list of senses per word plus a memo of which
   sense won for which sentence, so a re-tap of the same sentence is
   free. What decides between them:

     no senses yet         -> full lookup
     one sense, not
       flagged ambiguous   -> serve it, no call at all
     one sense, flagged
       ambiguous           -> serve it immediately, verify in the
                              background, replace only if it was wrong
     two or more senses    -> must choose, so a short pick call first

   The ambiguity flag is free: the explanation prompt already returns
   "also", the other common meanings of the word, and an empty "also" is
   the model saying this word only means one thing. Most words come back
   empty, which is why most taps never trigger a check.

   Serving first and verifying after is the deliberate part. A spinner on
   every ambiguous word would tax a lot of correct answers to catch a few
   wrong ones; showing the wrong meaning permanently is worse than a
   rare, labelled correction.
   ============================================================ */
function sentHash(s){
  const t=String(s||"").toLowerCase().replace(/[^a-z0-9 ]+/g,"").trim().slice(0,300);
  let h=5381;
  for(let i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))>>>0;
  return h.toString(36);
}
function emptyEntry(){ return {senses:[],picks:{},ts:Date.now()}; }
/* Old flat entries become a one-sense entry, so an existing cache keeps
   working instead of being thrown away on upgrade. */
function normalizeEntry(e){
  if(!e) return null;
  if(Array.isArray(e.senses)) return e;
  if(e.en||e.de) return {senses:[{...e}],picks:{},ts:e.ts||Date.now()};
  return null;
}
function migrateCache(c){
  let changed=false;
  const out={};
  for(const [k,v] of Object.entries(c||{})){
    const n=normalizeEntry(v);
    if(!n) { changed=true; continue; }
    if(n!==v) changed=true;
    out[k]=n;
  }
  return changed?out:c;
}
function mergeSense(entry,d){
  const e=entry||emptyEntry();
  const label=String(d.sense||"").toLowerCase().trim();
  const i=e.senses.findIndex(x=>String(x.sense||"").toLowerCase().trim()===label);
  const senses=e.senses.slice();
  if(i>=0) senses[i]={...senses[i],...d};
  else senses.push(d);
  return [{...e,senses,ts:Date.now()},i>=0?i:senses.length-1];
}

function disambigPrompt(word,sentence,senses){
  const list=senses.map((x,i)=>`${i+1}) ${x.sense||"?"} — ${x.en}`).join("\n");
  return [
    `Which meaning of "${word}" is used in this sentence?`,
    `SENTENCE: "${sentence}"`,
    `MEANINGS:`,
    list,
    `Answer with the number of the meaning that is used in this sentence.`,
    `If none of them fit the sentence, answer 0.`,
    `Reply with ONLY this JSON and nothing else: {"pick":N}`
  ].join("\n");
}

function senseKey(lemma,sense){
  return String(lemma||"").toLowerCase().trim()+"|"+String(sense||"").toLowerCase().trim().slice(0,24);
}

/* ============================================================
   Styles
   ============================================================ */
const CSS=`
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{
  --paper:#FFF8E3; --paper2:#F6EBCB; --ink:#20392D; --ink2:#6C624D;
  --accent:#E39A2E; --accent-soft:#FBE8B7; --line:#E7D5AA;
  --good:#60794E; --warn:#B86E22;
  --rsize:20px; --rlead:1.68;
}
html[data-theme="light"]{
  --paper:#FFFDF4; --paper2:#F6EFD8; --ink:#20392D; --ink2:#6C624D;
  --accent:#E39A2E; --accent-soft:#FBE8B7; --line:#E8DAB9;
}
html[data-theme="night"]{
  --paper:#14251E; --paper2:#1D342A; --ink:#F8EFCF; --ink2:#C6B993;
  --accent:#F0B64A; --accent-soft:#3D472B; --line:#355344;
  --good:#A8C980;
}
html[data-theme="night"] .card{background:#1C1E23}
html[data-theme="night"] input{background:#1C1E23;color:var(--ink)}
html[data-theme="night"] .reader img{filter:brightness(.9)}
html[data-theme="night"] .w.known{background:linear-gradient(transparent 68%,#2C4433 68%)}
html[data-theme="night"] .w.seen{background:linear-gradient(transparent 72%,#43371F 72%)}
html,body,#root{height:100%;margin:0}
body{
  background:
    radial-gradient(circle at 12% 8%,rgba(255,237,161,.38),transparent 26%),
    radial-gradient(circle at 88% 16%,rgba(228,154,46,.10),transparent 26%),
    linear-gradient(180deg,var(--paper),#FFF3D4 130%);
  color:var(--ink);
  font-family:"Avenir Next",Avenir,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased;
  overscroll-behavior-y:none;
}
.wrap{max-width:760px;margin:0 auto;padding:0 18px}
.serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
.brand-title{font-family:"Marker Felt","Chalkboard SE","Bradley Hand",sans-serif;font-size:24px!important;font-weight:800;letter-spacing:.2px;display:flex;align-items:center;gap:9px}
.brand-icon{width:38px;height:38px;border-radius:11px;object-fit:cover;box-shadow:0 3px 9px rgba(61,69,40,.18)}
.empty-mascot{width:116px;height:116px;border-radius:28px;display:block;margin:0 auto 16px;box-shadow:0 8px 24px rgba(75,62,33,.16)}

.topbar{position:sticky;top:0;z-index:20;background:rgba(255,248,227,.94);
  backdrop-filter:saturate(135%) blur(14px);border-bottom:1px solid rgba(211,185,126,.55);
  box-shadow:0 3px 14px rgba(81,68,35,.06)}
.topbar-in{display:flex;align-items:center;gap:10px;padding:10px 0;min-height:52px}
.tb-title{flex:1;min-width:0;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.icon-btn{border:1px solid transparent;background:transparent;font-size:20px;line-height:1;padding:9px 10px;
  border-radius:14px;cursor:pointer;color:var(--ink)}
.icon-btn:active{background:var(--paper2)}

.btn{border:none;border-radius:18px;padding:13px 18px;font-size:16px;font-weight:750;
  cursor:pointer;font-family:inherit;transition:transform .06s,box-shadow .12s}
.btn:active{transform:scale(.98)}
.btn-primary{background:linear-gradient(180deg,#F2B84B,var(--accent));color:#20392D;box-shadow:0 5px 12px rgba(198,128,27,.22)}
.btn-ghost{background:#FFF7DF;color:#5A513D;border:1px solid var(--line)}
.btn-plain{background:var(--paper2);color:var(--ink2)}
.btn[disabled]{opacity:.5}

/* ---- library ---- */
.shelf{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:18px;padding:18px 0 40px}
.bookcard{cursor:pointer;position:relative}
.bookcover{width:100%;aspect-ratio:2/3;border-radius:16px;object-fit:cover;
  background:var(--paper2);box-shadow:0 8px 20px rgba(70,59,31,.18);display:flex;
  align-items:center;justify-content:center;text-align:center;padding:12px;
  font-weight:700;font-size:14px;color:var(--ink2);overflow:hidden}
.bookmeta{margin-top:8px;font-size:13px;font-weight:650;line-height:1.3}
.bookauth{font-size:12px;color:var(--ink2);margin-top:2px}
.progbar{height:4px;background:var(--line);border-radius:3px;margin-top:6px;overflow:hidden}
.progbar i{display:block;height:100%;background:var(--accent)}
.addcard{border:2px dashed #D6B66D;border-radius:16px;aspect-ratio:2/3;display:flex;
  background:rgba(255,250,233,.7);
  flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--ink2);
  font-weight:650;font-size:14px;cursor:pointer}

/* ---- reading ---- */
.reader-shell{position:relative;height:calc(100dvh - 73px);overflow:hidden;touch-action:manipulation}
.reader{height:100%;width:100%;padding:22px 4px 38px;font-size:var(--rsize);line-height:var(--rlead);
  letter-spacing:.003em;overflow:hidden;column-fill:auto;scroll-behavior:auto}
body.reading-mode{overflow:hidden;position:fixed;inset:0;width:100%}
.page-indicator{position:absolute;left:50%;bottom:7px;transform:translateX(-50%);z-index:4;
  background:rgba(255,248,227,.9);border:1px solid var(--line);border-radius:999px;padding:3px 9px;
  font-size:11px;font-weight:750;color:var(--ink2);pointer-events:none}
.page-edge{position:absolute;top:0;bottom:0;width:24%;z-index:2;pointer-events:none}
.page-edge.left{left:0}.page-edge.right{right:0}
.reader.sans{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.reader p.speaking{background:var(--accent-soft);border-radius:8px;
  box-shadow:0 0 0 6px var(--accent-soft);transition:background .2s}
.reader p{margin:0 0 1.05em}
.reader h1,.reader h2,.reader h3{line-height:1.25;margin:1.6em 0 .7em;font-weight:700}
.reader img{max-width:100%;height:auto;display:block;margin:1.2em auto;border-radius:6px}
.reader .sidebar,.reader blockquote{background:var(--paper2);border-left:3px solid var(--line);
  padding:12px 16px;border-radius:0 10px 10px 0;margin:1.2em 0}
.w{cursor:pointer;border-radius:4px;padding:1px 0;transition:background .12s}
.w:active{background:var(--accent-soft)}
.w.known{background:linear-gradient(transparent 70%,#C9DBA9 70%)}
.w.seen{background:linear-gradient(transparent 70%,#F4CC73 70%)}
.w.lit{background:var(--accent-soft);box-shadow:0 0 0 2px var(--accent-soft)}

.chapnav{display:flex;gap:10px;align-items:center;justify-content:space-between;
  padding:22px 0 10px;border-top:1px solid var(--line);margin-top:30px}

.hud{position:fixed;left:0;right:0;bottom:0;z-index:15;
  background:rgba(251,246,236,.95);backdrop-filter:blur(10px);
  border-top:1px solid var(--line);padding:8px 0 max(8px,env(safe-area-inset-bottom))}
.hud-in{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--ink2);font-weight:600}
.ring{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;
  font-size:10px;font-weight:800;color:var(--accent)}
.pill{background:var(--paper2);border-radius:999px;padding:4px 11px;font-size:12px;font-weight:700}
.pill.on{background:#D8EBDC;color:var(--good)}

/* ---- popup ---- */
.scrim{position:fixed;inset:0;z-index:60;background:rgba(30,22,14,.34);
  display:flex;align-items:flex-end;justify-content:center}
@media(min-width:640px){.scrim{align-items:center}}
.sheet{background:linear-gradient(180deg,#FFFCF0,var(--paper));width:100%;max-width:560px;border-radius:28px 28px 0 0;
  padding:22px 22px max(22px,env(safe-area-inset-bottom));max-height:86vh;overflow:auto;
  border:1px solid var(--line);box-shadow:0 -10px 44px rgba(54,48,27,.22);animation:up .2s ease-out}
@media(min-width:640px){.sheet{border-radius:22px}}
@keyframes up{from{transform:translateY(18px);opacity:.4}to{transform:none;opacity:1}}
.sheet-head{display:flex;align-items:flex-start;gap:8px}
.headword{font-size:31px;font-weight:800;flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.15;color:#20392D}
.ctx{color:var(--ink2);font-size:14px;font-style:italic;margin:10px 0 2px;line-height:1.5}
.ctx b{background:var(--accent-soft);font-style:normal;font-weight:700;border-radius:4px;padding:0 3px}
.expl{font-size:19px;line-height:1.6;margin-top:14px}
.expl .w{cursor:pointer;border-bottom:1px dotted var(--line)}
.de-box{background:#F8EDCF;border:1px solid var(--line);border-radius:18px;padding:13px 15px;margin-top:14px}
.chip{display:inline-block;background:var(--accent-soft);color:var(--accent);
  border-radius:999px;padding:4px 11px;font-size:12px;font-weight:750;margin-top:10px}
.nudge{background:#FBEFD6;border-radius:12px;padding:10px 13px;margin-top:12px;
  font-size:14px;font-weight:600;color:#8A5A12;line-height:1.45}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);
  margin-right:6px;animation:pulse 1.1s ease-in-out infinite;vertical-align:middle}
@keyframes pulse{0%,100%{opacity:.25}50%{opacity:1}}
.spin{width:22px;height:22px;border:3px solid var(--line);border-top-color:var(--accent);
  border-radius:50%;animation:sp .8s linear infinite;margin:26px auto}
@keyframes sp{to{transform:rotate(360deg)}}

/* ---- parent ---- */
.card{background:rgba(255,252,240,.92);border:1px solid var(--line);border-radius:20px;padding:17px;margin-bottom:14px;box-shadow:0 5px 16px rgba(78,67,37,.06)}
.card h3{margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:var(--ink2)}
.bigstat{font-size:34px;font-weight:800;line-height:1}
.bars{display:flex;align-items:flex-end;gap:5px;height:76px;margin-top:12px}
.bars .b{flex:1;background:var(--paper2);border-radius:4px 4px 0 0;position:relative;min-height:3px}
.bars .b.hit{background:var(--good)}
.bars .b.part{background:var(--accent)}
.blab{font-size:9px;color:var(--ink2);text-align:center;margin-top:4px}
.wrow{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--paper2);font-size:15px}
.wrow:last-child{border-bottom:none}
.wrow .lw{font-weight:700;min-width:0;overflow-wrap:anywhere}
.wrow .lt{color:var(--ink2);font-size:13px;flex:1;min-width:0}
input[type=text],input[type=password],input[type=number]{
  width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:12px;
  font-size:16px;font-family:inherit;background:#fff;color:var(--ink)}
.hint{color:var(--ink2);font-size:13px;line-height:1.5;margin-top:8px}
.err{background:#FBE4DC;color:#9A3412;border-radius:12px;padding:11px 14px;font-size:14px;
  font-weight:600;margin-top:12px;line-height:1.45}
.toc-row{display:flex;align-items:center;gap:10px;padding:13px 4px;border-bottom:1px solid var(--paper2);
  cursor:pointer;font-size:16px}
.toc-row.cur{font-weight:800;color:var(--accent)}
.toc-row .n{font-size:12px;color:var(--ink2);font-weight:700;min-width:26px}
.seg{display:flex;gap:6px;margin-top:8px}
.seg button{flex:1;border:1px solid var(--line);background:transparent;color:var(--ink2);
  padding:11px 6px;border-radius:11px;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer}
.seg button.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.steprow{display:flex;align-items:center;gap:12px;margin-top:8px}
.steprow button{width:52px;height:44px;border:1px solid var(--line);background:transparent;
  border-radius:12px;font-size:18px;font-weight:700;color:var(--ink);cursor:pointer}
.steprow .val{flex:1;text-align:center;font-weight:700;color:var(--ink2);font-size:14px}
.setlab{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--ink2);
  font-weight:700;margin-top:18px}
.setlab:first-child{margin-top:0}
.wcard{background:rgba(255,252,240,.92);border:1px solid var(--line);border-radius:20px;padding:15px 17px;margin-bottom:11px;box-shadow:0 4px 12px rgba(78,67,37,.06)}
.wcard .h{display:flex;align-items:center;gap:8px}
.wcard .hw{font-size:21px;font-weight:800;flex:1;min-width:0;overflow-wrap:anywhere}
.wcard .de{color:var(--accent);font-weight:700;font-size:15px;margin-top:2px}
.wcard .en{font-size:15px;margin-top:5px;line-height:1.5}
.wcard .src{font-size:12px;color:var(--ink2);margin-top:7px;font-style:italic;line-height:1.45}
.tabs{display:flex;gap:6px;margin:14px 0}
.tabs button{flex:1;border:none;background:var(--paper2);color:var(--ink2);padding:10px;
  border-radius:11px;font-weight:700;font-size:13px;font-family:inherit;cursor:pointer}
.tabs button.on{background:var(--accent);color:#20392D;box-shadow:0 3px 8px rgba(198,128,27,.18)}
.empty{text-align:center;color:var(--ink2);padding:44px 20px;line-height:1.6}
.reader-tip{position:absolute;left:10px;right:10px;top:8px;z-index:8;display:flex;align-items:center;gap:14px;
  background:rgba(255,240,199,.97);color:var(--ink);border:1px solid #E7CE91;border-radius:18px;
  padding:12px 14px;margin:0;font-size:14px;line-height:1.45;box-shadow:0 7px 22px rgba(71,59,28,.14)}
.reader-tip>div{flex:1}.reader-tip .btn{padding:8px 11px;font-size:13px;white-space:nowrap}
.translation{margin-top:9px}.translation summary{cursor:pointer;color:var(--accent);font-weight:700;font-size:13px}
.translation .de{margin-top:6px}
`;

/* ============================================================
   The word sheet

   Two levels, no more. Level 0 is the word she tapped in the book.
   Level 1 is a word inside that explanation she also didn't know,
   which is the whole reason the first app existed: an explanation
   made of unknown words explains nothing. Level 1 words are recorded
   as seen but never offered for saving - the thing she is reading is
   the book, and a vocabulary list that fills up with the machinery of
   definitions is a list about definitions.
   ============================================================ */

function TapExplain({text,onWord,knownSet}){
  const parts=useMemo(()=>String(text||"").split(/(\s+)/),[text]);
  return parts.map((p,i)=>{
    if(!p) return null;
    if(/^\s+$/.test(p)) return <span key={i}>{p}</span>;
    const m=p.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’-][A-Za-zÀ-ÖØ-öø-ÿ]+)*/);
    if(!m) return <span key={i}>{p}</span>;
    const clean=m[0];
    if(clean.length<3||FREQ_SET.has(clean.toLowerCase())&&clean.length<5) return <span key={i}>{p}</span>;
    return <span key={i} className={"w"+(knownSet.has(normTok(clean))?" known":"")}
      onClick={e=>{e.stopPropagation();onWord(clean,String(text));}}>{p}</span>;
  });
}

function Ctx({sentence,span}){
  if(!sentence) return null;
  const sp=String(span||"").trim();
  if(!sp) return <div className="ctx">“{sentence}”</div>;
  const re=new RegExp("("+sp.split(/\s+/).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("\\s+")+")","i");
  const bits=String(sentence).split(re);
  return (
    <div className="ctx">“{bits.map((b,i)=>re.test(b)&&i%2===1?<b key={i}>{b}</b>:<span key={i}>{b}</span>)}”</div>
  );
}

function WordSheet({stack,onClose,onNested,onSave,onRetry,knownSet,onPopupTime}){
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
              <div className="chip">These {d.span.split(/\s+/).length} words go together</div>
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
   Reading clock

   Elapsed time is not reading time. Two ways it lies: the app sits open
   on a table, and she sits on one page. Both are handled by capping
   what a stretch of time can earn against how much text has actually
   gone past.

     earned = words scrolled past / floor_wpm   +   time in word popups
     credited = min(elapsed, earned)

   The popup term matters more than it looks. Six lookups on a page is
   two minutes of real work and no scrolling at all, so a pure
   words-per-minute cap would punish exactly the behaviour this whole
   app exists to encourage. Capped per lookup so an abandoned popup
   can't run the clock either.

   floor_wpm is measured, not guessed. A number for a German ten-year-old
   reading English would be a guess, and she gets faster over a year
   anyway. Until there are three real sessions to learn from it sits at
   a permissive 50, then settles at 40% of her own observed median.
   ============================================================ */
function floorWpmFrom(sessions){
  const rows=Object.values(sessions).filter(r=>r&&r.words>=300&&r.raw>120000);
  if(rows.length<3) return 50;
  const w=rows.map(r=>r.words/(r.raw/60000)).sort((a,b)=>a-b);
  const med=w[Math.floor(w.length/2)];
  return Math.min(120,Math.max(25,Math.round(med*0.4)));
}
const TARGET_MIN=20, TARGET_DAYS=5;

function fmtMin(ms){
  const m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000);
  return m+":"+String(s).padStart(2,"0");
}
function lastNDays(n){
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
}
function streakOf(sessions){
  /* consecutive weeks is the wrong unit for "5 days a week"; this is the
     simpler thing she can actually see: days hit in the last 7. */
  return lastNDays(7).filter(d=>(sessions[d]||{}).ms>=TARGET_MIN*60000).length;
}

/* ============================================================
   App
   ============================================================ */

export default function App(){
  const [view,setView]=useState("library");
  const [books,setBooks]=useState([]);
  const [busy,setBusy]=useState("");
  const [fatal,setFatal]=useState("");

  const [vocab,setVocab]=useState(()=>lsGet("vocab",{}));
  const [seen,setSeen]=useState(()=>lsGet("seen",{}));
  const [wcache,setWcache]=useState(()=>migrateCache(lsGet("wcache",{})));
  const [sessions,setSessions]=useState(()=>lsGet("sessions",{}));
  const [positions,setPositions]=useState(()=>lsGet("pos",{}));

  const [book,setBook]=useState(null);          // {meta, parsed}
  const [chapIdx,setChapIdx]=useState(0);
  const [chap,setChap]=useState(null);          // {html,paras,nWords}
  const [stack,setStack]=useState([]);          // word sheet levels
  const [tab,setTab]=useState("time");
  const [key,setKey]=useState(()=>lsGet("apikey",""));
  const [msg,setMsg]=useState("");
  const [modelList,setModelList]=useState([]);
  const [mdl,setMdl]=useState(()=>models());
  const [testing,setTesting]=useState(false);
  const [bookUrl,setBookUrl]=useState("");
  const [prefs,setPrefs]=useState(()=>lsGet("prefs",{size:20,lead:1.68,theme:"paper",serif:true}));
  const [sheet,setSheet]=useState(null);   // "toc" | "type" | null
  const [showReaderTip,setShowReaderTip]=useState(()=>!lsGet("readerTipSeen",false));
  const [pageInfo,setPageInfo]=useState({page:0,total:1});

  const bodyRef=useRef(null);
  const urlsRef=useRef([]);
  const fileRef=useRef(null);
  const clock=useRef({elapsed:0,popup:0,words:0,base:0,flushed:0,flushedRaw:0,flushedWords:0,last:Date.now(),bookId:null});
  const spansRef=useRef([]);
  const prefetchRef=useRef({busy:false,done:new Set()});
  const pageRef=useRef({page:0,total:1,step:0});
  const pendingPctRef=useRef(null);

  useEffect(()=>{ const s=document.createElement("style"); s.textContent=CSS;
    document.head.appendChild(s); askPersist(); },[]);
  useEffect(()=>{
    document.body.classList.toggle("reading-mode",view==="read");
    return ()=>document.body.classList.remove("reading-mode");
  },[view]);

  useEffect(()=>{
    const r=document.documentElement;
    r.setAttribute("data-theme",prefs.theme);
    r.style.setProperty("--rsize",prefs.size+"px");
    r.style.setProperty("--rlead",String(prefs.lead));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute("content",prefs.theme==="night"?"#14251E":prefs.theme==="light"?"#FFFDF4":"#FFF8E3");
    lsSet("prefs",prefs);
  },[prefs]);

  /* ---- persistence helpers ---- */
  const saveVocab=useCallback(v=>{ setVocab(v); if(!lsSet("vocab",v)) setFatal("Storage is full — please export a backup in Parent settings."); },[]);
  const saveSeen =useCallback(v=>{ setSeen(v); lsSet("seen",v); },[]);
  /* Every cache write goes through here. The trimming used to live in a
     helper that nothing called any more, so the word cache grew without
     any limit toward Safari's storage ceiling; and a failed write was
     silent, so it would simply stop persisting and she would lose the
     lot on the next eviction. Now it trims by age, and on a quota error
     it drops the oldest half and tries once more. */
  function persistCache(v){
    let out=v;
    const keys=Object.keys(v);
    if(keys.length>WCACHE_MAX){
      keys.sort((a,b)=>((v[a]||{}).ts||0)-((v[b]||{}).ts||0));
      out={...v};
      for(const k of keys.slice(0,keys.length-WCACHE_MAX)) delete out[k];
    }
    if(lsSet("wcache",out)) return out;
    const ks=Object.keys(out).sort((a,b)=>((out[a]||{}).ts||0)-((out[b]||{}).ts||0));
    const half={...out};
    for(const k of ks.slice(0,Math.ceil(ks.length/2))) delete half[k];
    if(lsSet("wcache",half)) return half;
    return half;
  }

  /* ---- derived sets used for underlining in the text ---- */
  const knownSet=useMemo(()=>{
    const s=new Set();
    for(const e of Object.values(vocab)){
      if(e.w) s.add(normTok(e.w));
      if(e.span) s.add(normTok(e.span));
      for(const f of e.forms||[]) s.add(normTok(f));
    }
    return s;
  },[vocab]);
  const seenSet=useMemo(()=>new Set(Object.keys(seen)),[seen]);

  /* ---- library ---- */
  const refreshBooks=useCallback(async()=>{
    try{
      const all=await dbAll();
      all.sort((a,b)=>(b.opened||b.added||0)-(a.opened||a.added||0));
      setBooks(all.map(({file,...m})=>m));
    }catch(e){ setFatal("Could not load the library."); }
  },[]);
  useEffect(()=>{ refreshBooks(); },[refreshBooks]);

  async function addBook(buf,label){
    /* Never leave the spinner up with nothing behind it: whatever goes
       wrong, this either adds a book or says why. */
    const withLimit=(p,ms)=>Promise.race([p,
      new Promise((_,rej)=>setTimeout(()=>rej(new Error("took too long")),ms))]);
    const parsed=await withLimit(parseEpub(buf),60000);
    const cover=await withLimit(readCover(parsed),15000).catch(()=>null);
    const id="b_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
    await dbPut({id,file:buf,title:parsed.title||label,author:parsed.author,
      language:parsed.language,cover,nChapters:parsed.spine.length,
      added:Date.now(),opened:0,words:0});
    await refreshBooks();
  }

  async function importFiles(list){
    for(const file of Array.from(list||[])){
      setBusy("Opening “"+file.name+"” …");
      try{
        if(!/\.epub$/i.test(file.name||""))
          throw new Error("that is not an .epub file");
        await addBook(await file.arrayBuffer(),file.name);
      }catch(e){
        setFatal("“"+file.name+"”: "+(e&&e.message||"could not be read"));
      }
    }
    setBusy("");
    if(fileRef.current) fileRef.current.value="";
  }

  async function importUrl(url){
    const clean=String(url||"").trim();
    if(!/^https:\/\//i.test(clean)){ setFatal("The link must start with https://."); return; }
    setBusy("Downloading book …");
    try{
      const res=await fetch(clean);
      if(!res.ok) throw new Error("HTTP "+res.status);
      await addBook(await res.arrayBuffer(),clean.split("/").pop());
    }catch(e){
      /* A cross-origin block and a dead link look identical from here, so
         say both rather than guessing which one it was. */
      setFatal("Could not load that link: "+(e&&e.message||"")+
        ". The server must provide the file directly and allow CORS (raw.githubusercontent.com does).");
    }
    setBusy("");
  }

  async function openBook(id){
    setBusy("Opening book …");
    try{
      const rec=await dbGet(id);
      if(!rec) throw new Error("not found");
      const parsed=await parseEpub(rec.file);
      await dbPut({...rec,opened:Date.now()});
      const {file,...meta}=rec;
      setBook({meta:{...meta,id},parsed});
      const pos=positions[id]||{};
      const start=Number.isInteger(pos.chapter)?pos.chapter:firstTextChapter(parsed);
      setChapIdx(start);
      clock.current={elapsed:0,popup:0,words:0,base:0,flushed:0,flushedRaw:0,flushedWords:0,last:Date.now(),bookId:id};
      prefetchRef.current.done=new Set();
      setView("read");
    }catch(e){ setFatal("Could not open the book: "+(e&&e.message||"")); }
    setBusy("");
  }

  /* Front matter is copyright pages and half-titles; opening a new book
     on chapter one is what she expects and what Books does. */
  function firstTextChapter(parsed){
    const i=parsed.spine.findIndex(s=>/ch\d|chapter|part|prologue/i.test(s.id+s.href));
    if(i>=0) return i;
    /* findIndex returns -1 on no match, and -1 is truthy, so the old
       `|| 0` never fired and the book opened on spine[-1]: blank. */
    const j=parsed.spine.findIndex(s=>s.linear);
    return j>=0?j:0;
  }

  function closeBook(){
    flushClock(true);
    abortAll();
    for(const u of urlsRef.current) URL.revokeObjectURL(u);
    urlsRef.current=[];
    setBook(null); setChap(null); setStack([]);
    setView("library");
    refreshBooks();
  }

  /* ---- chapter loading ---- */
  useEffect(()=>{
    if(!book) return;
    let cancelled=false;
    (async()=>{
      setChap(null);
      for(const u of urlsRef.current) URL.revokeObjectURL(u);
      urlsRef.current=[];
      const item=book.parsed.spine[chapIdx];
      if(!item) return;
      try{
        const urls=[];
        const c=await renderChapter(book.parsed,item.href,urls);
        if(cancelled){ for(const u of urls) URL.revokeObjectURL(u); return; }
        urlsRef.current=urls;
        setChap(c);
      }catch(e){
        if(!cancelled) setChap({html:"<p>This chapter could not be displayed.</p>",paras:[],nWords:0});
      }
    })();
    return ()=>{ cancelled=true; };
  },[book,chapIdx]);

  /* Words banked so far IN THIS SITTING.

     This used to sum every chapter she had ever read in the book, taken
     from stored progress. So on the second day, opening chapter five
     handed the clock four chapters of credit before she read a word:
     earned was instantly over an hour and min(elapsed, earned) was just
     elapsed. The cap silently stopped capping after the first chapter of
     any book, which is exactly the case it was built for.

     Banking the session count instead also means re-reading a chapter
     earns nothing, which is correct. */
  useEffect(()=>{
    clock.current.base=clock.current.words;
  },[chapIdx,book]);

  /* The chapter is written into the DOM here rather than through
     dangerouslySetInnerHTML, because React re-applies that prop on every
     render: it replaced all 31 nodes of the chapter once a second (the
     reading clock re-renders that often). Two things broke. The span list
     used to measure how far she has scrolled pointed at detached nodes,
     whose getBoundingClientRect is all zeros, so the measurement jumped
     to the end of the chapter and the anti-idling cap quietly stopped
     capping anything. And 20KB of HTML was being re-parsed every second
     on an iPad. Writing it once per chapter and leaving React out of this
     subtree fixes both. */
  useEffect(()=>{
    if(!bodyRef.current) return;
    bodyRef.current.innerHTML=chap?chap.html:"";
    if(!chap){ spansRef.current=[]; return; }
    const spans=Array.from(bodyRef.current.querySelectorAll(".w"));
    spansRef.current=spans;
    paintKnown(spans);
    const pos=(positions[(book&&book.meta.id)||""]||{});
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
    prefetchChapter(spans);
    // eslint-disable-next-line
  },[chap]);

  function paintKnown(spans){
    for(const sp of spans||spansRef.current){
      const w=normTok(sp.textContent);
      sp.classList.toggle("known",knownSet.has(w));
      sp.classList.toggle("seen",!knownSet.has(w)&&seenSet.has(w));
    }
  }
  useEffect(()=>{ paintKnown(); /* eslint-disable-next-line */ },[knownSet,seenSet]);

  /* ---- prefetch ----
     Everything worth explaining in this chapter, resolved in the
     background in batches of twelve on the cheap model, so a tap is
     instant. Three filters keep the bill honest and the results useful:
     words she has already met, words in the commonest 3,500 English
     words, and proper nouns. On a real children's novel this leaves
     about 3% of the running text, and explaining "Rotherham" to her
     would have been noise as well as cost. */
  async function prefetchChapter(spans){
    /* This used to simply return when a prefetch was already running, so
       turning the page mid-prefetch meant the new chapter never got one
       and every tap in it fell back to a slow live lookup. Now the running
       pass is asked to stop and this one takes over. */
    if(prefetchRef.current.busy){
      prefetchRef.current.cancel=true;
      for(let i=0;i<40&&prefetchRef.current.busy;i++) await new Promise(r=>setTimeout(r,100));
    }
    prefetchRef.current.cancel=false;
    if(!lsGet("apikey","")) return;
    /* Copyright pages and half-titles are not reading. Explaining
       "cataloging-in-publication" to a ten-year-old is money spent on
       a page she will scroll past once. */
    const href=((book&&book.parsed.spine[chapIdx])||{}).href||"";
    if(/copyright|halftitle|title|cover|toc|contents|dedication|acknowledg|back-?cover|colophon|imprint/i.test(href)) return;
    const lowerSeen=new Set();
    for(const sp of spans) if(/^[a-zà-öø-ÿ]/.test(sp.textContent)) lowerSeen.add(normTok(sp.textContent));

    const queue=[]; const picked=new Set();
    for(const sp of spans){
      const surface=sp.textContent;
      const cand=sp.getAttribute("data-mwe");
      const key=normTok(cand||surface);
      if(picked.has(key)||prefetchRef.current.done.has(key)) continue;
      const have=normalizeEntry(wcache[key]);
      if((have&&have.senses.length)||knownSet.has(key)) continue;
      if(!cand){
        const lw=normTok(surface);
        if(lw.length<4) continue;
        /* Chapter titles are Title Case, so inside a heading every word
           looks like a proper noun and the name filter throws them all
           away. Skip headings entirely instead: a word in a chapter
           title almost always appears in the chapter body too, in
           lower case, where it is judged properly. */
        if(sp.getAttribute("data-h")==="1") continue;
        if(CONTRACTION_RE.test(lw)) continue;
        if(isCommon(lw)) continue;
        if(isProperNounish(surface,sp.getAttribute("data-si")==="1",lowerSeen)) continue;
      } else {
        /* expressions are always worth one look: the local list can only
           propose, and whether it is idiomatic here is the model's call */
        if(have&&have.senses.length) continue;
      }
      const p=Number(sp.getAttribute("data-p"))||0;
      picked.add(key);
      queue.push({w:cand||surface,s:sentenceFor(chap.paras[p],surface),key});
      if(queue.length>=180) break;
    }
    if(!queue.length) return;

    prefetchRef.current.busy=true;
    try{
      for(let i=0;i<queue.length;i+=12){
        if(prefetchRef.current.cancel) break;
        const batch=queue.slice(i,i+12);
        try{
          const j=await askJson(batchPrompt(batch),{model:models().fast,maxTokens:2600,timeoutMs:70000});
          const got=Array.isArray(j.words)?j.words:[];
          const add=[];
          for(const r of got){
            const m=batch.find(b=>normTok(b.w)===normTok(r.word||""))||null;
            if(!m) continue;
            add.push([m.key,{span:m.w,lemma:String(r.lemma||m.w),sense:String(r.sense||""),
              en:String(r.en||""),de:String(r.de||""),deDesc:String(r.deDesc||""),
              also:Array.isArray(r.also)?r.also.slice(0,2):[],
              alsoDe:Array.isArray(r.alsoDe)?r.alsoDe.slice(0,2):[],ctx:m.s,ts:Date.now()},
              sentHash(m.s)]);
            prefetchRef.current.done.add(m.key);
          }
          if(add.length){
            setWcache(cur=>{
              const nc={...cur};
              /* the sentence the prefetcher used is pinned to this sense,
                 so tapping that exact sentence never re-checks anything */
              for(const [k,d,h] of add){
                const [entry,idx]=mergeSense(normalizeEntry(nc[k]),d);
                nc[k]={...entry,picks:{...(entry.picks||{}),[h]:idx}};
              }
              return persistCache(nc);
            });
          }
        }catch(e){
          if(e instanceof NeedsKey||e instanceof CapReached||e instanceof Aborted) break;
        }
        await new Promise(r=>setTimeout(r,400));
      }
    } finally { prefetchRef.current.busy=false; }
  }

  /* ---- hearing a sentence ----
     Epic's most praised feature for second-language readers is being read
     to, because a sentence she can decode word by word is still a sentence
     she cannot hear the shape of. A tap already means "explain this word",
     so hearing is a long press: 550ms on any paragraph reads that sentence
     aloud and highlights it. The press also suppresses the click that
     would otherwise follow, or every listen would open a word sheet. */
  const press=useRef({t:null,el:null,fired:false,x:0,y:0});
  /* A finger never holds still, so cancelling on any pointermove made the
     long press almost impossible to trigger on a touchscreen. Ten pixels
     of slop distinguishes a hold from the start of a scroll. */
  function onPressMove(e){
    if(press.current.t==null) return;
    if(Math.abs(e.clientX-press.current.x)>10||Math.abs(e.clientY-press.current.y)>10) onPressEnd();
  }
  function onPressStart(e){
    touch();
    const el=e.target.closest&&e.target.closest("p,div,h1,h2,h3,li,blockquote");
    if(!el||!bodyRef.current||!bodyRef.current.contains(el)) return;
    press.current.fired=false;
    press.current.el=el;
    press.current.x=e.clientX; press.current.y=e.clientY;
    press.current.t=setTimeout(()=>{
      press.current.fired=true;
      const wordEl=e.target.closest&&e.target.closest(".w");
      const p=Number((wordEl||el).getAttribute&&(wordEl||el).getAttribute("data-p"));
      const text=Number.isInteger(p)&&chap?chap.paras[p]:(el.textContent||"");
      const say=wordEl?sentenceFor(text,wordEl.textContent):text;
      if(!say) return;
      el.classList.add("speaking");
      speak(say);
      const clear=()=>el.classList.remove("speaking");
      if(window.speechSynthesis){
        const iv=setInterval(()=>{ if(!window.speechSynthesis.speaking){ clearInterval(iv); clear(); } },400);
        setTimeout(()=>{ clearInterval(iv); clear(); },90000);
      } else setTimeout(clear,1200);
    },550);
  }
  function onPressEnd(){ clearTimeout(press.current.t); press.current.t=null; }

  /* ---- tapping a word ---- */
  function onTap(e){
    if(press.current.fired){ press.current.fired=false; return; }
    const el=e.target.closest&&e.target.closest(".w");
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
    const surface=el.textContent;
    const cand=el.getAttribute("data-mwe");
    const p=Number(el.getAttribute("data-p"))||0;
    const sentence=sentenceFor((chap&&chap.paras[p])||"",surface);
    openWord(surface,sentence,cand);
    if(cand){
      /* show her the whole expression is one unit before the sheet even
         answers - the highlight is half the lesson */
      const all=Array.from(bodyRef.current.querySelectorAll('[data-mwe="'+cand.replace(/"/g,'\\"')+'"]'));
      const near=all.filter(x=>Math.abs(Number(x.getAttribute("data-i"))-Number(el.getAttribute("data-i")))<6);
      near.forEach(x=>x.classList.add("lit"));
      setTimeout(()=>near.forEach(x=>x.classList.remove("lit")),2400);
    }
  }

  function vocabKeyFor(cacheKey,d){
    const k=senseKey(d.lemma||d.span||cacheKey,d.sense||"");
    return vocab[k]?k:(Object.keys(vocab).find(x=>x===k)||k);
  }

  function bump(cacheKey){
    setSeen(cur=>{
      const n={...cur,[cacheKey]:{n:((cur[cacheKey]||{}).n||0)+1,last:Date.now()}};
      lsSet("seen",n); return n;
    });
    return ((seen[cacheKey]||{}).n||0)+1;
  }

  function putEntry(cacheKey,entry){
    setWcache(cur=>{ const n={...cur,[cacheKey]:entry}; return persistCache(n); });
  }
  function pinPick(cacheKey,h,idx){
    setWcache(cur=>{
      const e=normalizeEntry(cur[cacheKey])||emptyEntry();
      const picks={...(e.picks||{}),[h]:idx};
      /* the memo is per sentence, so it only ever grows with the text she
         has actually read; trimming the oldest keeps it from unbounded */
      const ks=Object.keys(picks);
      if(ks.length>400) delete picks[ks[0]];
      const n={...cur,[cacheKey]:{...e,picks}};
      return persistCache(n);
    });
  }
  function showSense(surface,sentence,cand,cacheKey,h,d,extra){
    const vk=senseKey(d.lemma||d.span,d.sense);
    setStack([{level:0,word:surface,sentence,cand,cacheKey,h,data:d,
      loading:false,showDe:false,saved:!!vocab[vk],
      seenCount:((seen[cacheKey]||{}).n||0)+1,...(extra||{})}]);
  }

  function openWord(surface,sentence,cand){
    const cacheKey=normTok(cand||surface);
    const h=sentHash(sentence);
    const entry=normalizeEntry(wcache[cacheKey]);
    bump(cacheKey);

    if(!entry||!entry.senses.length){
      setStack([{level:0,word:surface,sentence,cand,cacheKey,h,data:null,
        loading:true,showDe:false,saved:false,seenCount:((seen[cacheKey]||{}).n||0)+1}]);
      liveLookup(surface,sentence,cand,cacheKey,h);
      return;
    }

    const pinned=(entry.picks||{})[h];
    if(Number.isInteger(pinned)&&entry.senses[pinned]){
      showSense(surface,sentence,cand,cacheKey,h,entry.senses[pinned]);
      return;
    }

    if(entry.senses.length===1){
      const d=entry.senses[0];
      const ambiguous=(d.also||[]).length>0;
      showSense(surface,sentence,cand,cacheKey,h,d,{checking:ambiguous});
      if(ambiguous) verifySense(surface,sentence,cand,cacheKey,h,entry);
      else pinPick(cacheKey,h,0);
      return;
    }

    setStack([{level:0,word:surface,sentence,cand,cacheKey,h,data:null,
      loading:true,choosing:true,showDe:false,saved:false,
      seenCount:((seen[cacheKey]||{}).n||0)+1}]);
    chooseSense(surface,sentence,cand,cacheKey,h,entry);
  }

  async function askPick(word,sentence,senses){
    const j=await askJson(disambigPrompt(word,sentence,senses),
      {model:models().fast,maxTokens:24,timeoutMs:20000});
    const n=Number(j&&j.pick);
    return Number.isFinite(n)?n:1;
  }

  /* two or more senses on file: she waits for the pick, but it is a
     fast-model call returning a single digit, not a full explanation */
  async function chooseSense(surface,sentence,cand,cacheKey,h,entry){
    try{
      const pick=await askPick(cand||surface,sentence,entry.senses);
      if(pick>=1&&entry.senses[pick-1]){
        pinPick(cacheKey,h,pick-1);
        showSense(surface,sentence,cand,cacheKey,h,entry.senses[pick-1]);
      } else {
        await liveLookup(surface,sentence,cand,cacheKey,h);
      }
    }catch(e){
      /* if the pick fails, the first sense beats an error message */
      showSense(surface,sentence,cand,cacheKey,h,entry.senses[0]);
    }
  }

  /* one sense on file but the word is known to have others: she already
     has an answer on screen, so this runs behind it and only interrupts
     if the answer was actually wrong for this sentence */
  async function verifySense(surface,sentence,cand,cacheKey,h,entry){
    try{
      const pick=await askPick(cand||surface,sentence,entry.senses);
      if(pick===1){
        pinPick(cacheKey,h,0);
        setStack(st=>st.length&&st[0].h===h?[{...st[0],checking:false},...st.slice(1)]:st);
        return;
      }
      setStack(st=>st.length&&st[0].h===h?[{...st[0],checking:false,loading:true,changed:true},...st.slice(1)]:st);
      await liveLookup(surface,sentence,cand,cacheKey,h,true);
    }catch(e){
      setStack(st=>st.length&&st[0].h===h?[{...st[0],checking:false},...st.slice(1)]:st);
    }
  }

  async function liveLookup(surface,sentence,cand,cacheKey,h,changed){
    try{
      const j=await askJson(wordPrompt(surface,sentence,cand),{model:models().good,maxTokens:700,timeoutMs:45000});
      const d={span:String(j.span||surface),lemma:String(j.lemma||surface),sense:String(j.sense||""),
        en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),
        also:Array.isArray(j.also)?j.also.slice(0,2):[],
        alsoDe:Array.isArray(j.alsoDe)?j.alsoDe.slice(0,2):[],ctx:sentence,ts:Date.now()};
      setWcache(cur=>{
        const [entry,idx]=mergeSense(normalizeEntry(cur[cacheKey]),d);
        const picks={...(entry.picks||{}),[h]:idx};
        const n={...cur,[cacheKey]:{...entry,picks}};
        return persistCache(n);
      });
      const vk=senseKey(d.lemma,d.sense);
      setStack(st=>st.length&&st[0].cacheKey===cacheKey
        ?[{...st[0],loading:false,checking:false,choosing:false,data:d,saved:!!vocab[vk],changed:!!changed},...st.slice(1)]:st);
    }catch(e){
      const msg=e instanceof NeedsKey
        ?"No API key is set yet (Parent settings)."
        :e instanceof CapReached
          ?"That is enough lookups for today — try again tomorrow."
          :"That did not work.";
      setStack(st=>st.length?[{...st[0],loading:false,checking:false,choosing:false,
        error:msg,canRetry:!(e instanceof NeedsKey)},...st.slice(1)]:st);
    }
  }

  const nested={
    open:(word,explanation)=>{
      if(stack.length>=2) return;             // two levels, deliberately
      const cacheKey="x:"+normTok(word);
      bump(normTok(word));
      const hitE=normalizeEntry(wcache[cacheKey]);
      const hit=hitE&&hitE.senses[0];
      if(hit){ setStack(s=>[...s,{level:1,word,sentence:explanation,cacheKey,data:hit,loading:false,showDe:false}]); return; }
      setStack(s=>[...s,{level:1,word,sentence:explanation,cacheKey,data:null,loading:true,showDe:false}]);
      (async()=>{
        try{
          const j=await askJson(nestedPrompt(word,explanation),{model:models().good,maxTokens:600,timeoutMs:45000});
          const d={span:String(j.span||word),lemma:String(j.lemma||word),sense:String(j.sense||""),
            en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),
            also:[],alsoDe:[],ts:Date.now()};
          setWcache(cur=>{ const [e]=mergeSense(normalizeEntry(cur[cacheKey]),d);
            const n={...cur,[cacheKey]:e}; return persistCache(n); });
          setStack(s=>s.map((x,i)=>i===s.length-1&&x.cacheKey===cacheKey?{...x,loading:false,data:d}:x));
        }catch(e){
          setStack(s=>s.map((x,i)=>i===s.length-1?{...x,loading:false,error:"That did not work.",canRetry:true}:x));
        }
      })();
    },
    back:()=>setStack(s=>s.slice(0,-1)),
    german:()=>setStack(s=>s.map((x,i)=>i===s.length-1?{...x,showDe:true}:x))
  };

  function saveWord(){
    const top=stack[0];
    if(!top||!top.data) return;
    const d=top.data;
    const k=senseKey(d.lemma||d.span,d.sense);
    const now=Date.now();
    const prev=vocab[k];
    const entry=prev
      ?{...prev,forms:[...new Set([...(prev.forms||[]),normTok(top.word),normTok(d.span)])]}
      :{w:d.lemma||d.span,span:d.span,sense:d.sense,
        forms:[...new Set([normTok(top.word),normTok(d.span)])],
        ctx:top.sentence,en:d.en,de:d.de,dd:d.deDesc,
        also:d.also,alsoDe:d.alsoDe,
        src:{book:(book&&book.meta.title)||"",chapter:chapIdx},
        added:now,s:null,d:null,reps:0,lapses:0,due:now,last:null};
    saveVocab({...vocab,[k]:entry});
    setStack(s=>s.map((x,i)=>i===0?{...x,saved:true}:x));
  }

  /* ---- the clock ---- */
  const floorWpm=useMemo(()=>floorWpmFrom(sessions),[sessions]);

  function touch(){ clock.current.last=Date.now(); primeSpeech(); }
  function dismissReaderTip(){
    if(!showReaderTip) return;
    lsSet("readerTipSeen",true);
    setShowReaderTip(false);
  }

  const measureWords=useCallback(()=>{
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
  }

  function flushClock(final){
    const c=clock.current;
    const earned=c.words/Math.max(1,floorWpm)*60000+c.popup;
    const credited=Math.max(0,Math.min(c.elapsed,earned));
    const delta=credited-c.flushed;
    const rawDelta=c.elapsed-(c.flushedRaw||0);
    const wordsDelta=Math.max(0,c.words-(c.flushedWords||0));
    if(delta<1000&&rawDelta<1000&&!final) return credited;
    c.flushed=credited; c.flushedRaw=c.elapsed; c.flushedWords=c.words;
    if(delta>0||rawDelta>0||wordsDelta>0){
      setSessions(cur=>{
        const d=today();
        const row=cur[d]||{ms:0,raw:0,words:0,lookups:0,saves:0};
        /* ms is credited time, raw is real elapsed time. They used to both
           receive the credited delta, which made the measured reading
           speed a function of the cap that the speed itself sets, and hid
           the elapsed-vs-credited gap the parent screen exists to show. */
        const n={...cur,[d]:{...row,ms:row.ms+Math.max(0,delta),
          raw:row.raw+Math.max(0,rawDelta),words:row.words+wordsDelta}};
        lsSet("sessions",n); return n;
      });
    }
    return credited;
  }

  useEffect(()=>{
    if(view!=="read"){ return; }
    const iv=setInterval(()=>{
      const c=clock.current;
      const now=Date.now();
      const idle=now-c.last>IDLE_MS;
      const hidden=document.visibilityState!=="visible";
      const active=!idle&&!hidden;
      if(active) c.elapsed+=1000;
      const credited=flushClock(false);
    },1000);
    return ()=>{ clearInterval(iv); flushClock(true); };
    // eslint-disable-next-line
  },[view,floorWpm]);

  /* Page mode: there is no reader scroll position. Resize reflows the columns
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
  },[view,book,chapIdx,chap]);

  function onPopupTime(ms){
    clock.current.popup+=Math.min(ms,POPUP_CREDIT_CAP);
    touch();
    setSessions(cur=>{
      const d=today();
      const row=cur[d]||{ms:0,raw:0,words:0,lookups:0,saves:0};
      const n={...cur,[d]:{...row,lookups:(row.lookups||0)+1}};
      lsSet("sessions",n); return n;
    });
  }

  /* ============================================================
     Views
     ============================================================ */

  function Library(){
    const todayMs=(sessions[today()]||{}).ms||0;
    const hit=todayMs>=TARGET_MIN*60000;
    return (
      <>
        <div className="topbar"><div className="wrap topbar-in">
          <div className="tb-title brand-title"><img className="brand-icon" src="./icons/icon-192.png" alt=""/>Right Reader</div>
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
              <img className="empty-mascot" src="./icons/icon-192.png" alt=""/>
              <div className="brand-title" style={{justifyContent:"center",fontSize:27,marginBottom:8}}>
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
        </div>
      </>
    );
  }

  function Parent(){
    const days=lastNDays(14);
    const goal=TARGET_MIN*60000;
    const spend=lsGet("spend",{});
    const spend30=lastNDays(30).reduce((a,d)=>a+((spend[d]||{}).usd||0),0);
    const streak=streakOf(sessions);

    const learning=Object.entries(vocab).sort((a,b)=>(b[1].added||0)-(a[1].added||0));
    const seenList=Object.entries(seen)
      .filter(([k,v])=>v.n>=2&&(normalizeEntry(wcache[k])||{senses:[]}).senses.length
        &&!Object.values(vocab).some(e=>(e.forms||[]).includes(k)))
      .sort((a,b)=>b[1].n-a[1].n).slice(0,60);

    function exportAll(){
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
    }
    function promote(k){
      const c=((normalizeEntry(wcache[k])||{senses:[]}).senses||[])[0]; if(!c) return;
      const vk=senseKey(c.lemma||c.span,c.sense||"");
      const now=Date.now();
      saveVocab({...vocab,[vk]:{w:c.lemma||c.span,span:c.span,sense:c.sense,
        forms:[...new Set([k,normTok(c.span||"")])],ctx:"",en:c.en,de:c.de,dd:c.deDesc,
        also:c.also||[],alsoDe:c.alsoDe||[],src:{book:"",chapter:0},
        added:now,s:null,d:null,reps:0,lapses:0,due:now,last:null}});
    }
    function forget(k){
      const n={...vocab}; delete n[k]; saveVocab(n);
    }

    return (
      <>
        <div className="topbar"><div className="wrap topbar-in">
          <button className="icon-btn" onClick={()=>setView(book?"read":"library")}>{"‹"}</button>
          <div className="tb-title">Parent</div>
        </div></div>
        <div className="wrap" style={{paddingBottom:60}}>
          <div className="tabs">
            <button className={tab==="time"?"on":""} onClick={()=>setTab("time")}>Reading</button>
            <button className={tab==="words"?"on":""} onClick={()=>setTab("words")}>Words</button>
            <button className={tab==="set"?"on":""} onClick={()=>setTab("set")}>Settings</button>
          </div>

          {tab==="time"&&(<>
            <div className="card">
              <h3>Today</h3>
              <div className="bigstat">{Math.floor(((sessions[today()]||{}).ms||0)/60000)}
                <span style={{fontSize:16,fontWeight:600,color:"var(--ink2)"}}> / {TARGET_MIN} min</span></div>
              <div className="hint">{streak} of {TARGET_DAYS} reading days completed in the last 7 days.</div>
            </div>
            <div className="card">
              <h3>Last 14 days</h3>
              <div className="bars">
                {days.map(d=>{
                  const ms=(sessions[d]||{}).ms||0;
                  const h=Math.min(1,ms/(goal*1.5));
                  return <div key={d} className={"b "+(ms>=goal?"hit":ms>0?"part":"")}
                    style={{height:Math.max(3,h*76)+"px"}} title={d}/>;
                })}
              </div>
              <div style={{display:"flex",gap:5}}>
                {days.map(d=><div key={d} className="blab" style={{flex:1}}>{d.slice(8)}</div>)}
              </div>
            </div>
            <div className="card">
              <h3>How reading time is counted</h3>
              <div className="hint">
                Time counts only while the app is visible and there was activity in the last 90 seconds.
                It is capped by how many words are on pages she has actually reached: {floorWpm} words per minute,
                plus time spent in word explanations (max. 45 seconds per lookup). Leaving one page open
                therefore stops earning time. {floorWpm} is {Object.keys(sessions).length<3?"still the starting value":"calculated from her own reading pace"}.
              </div>
            </div>
          </>)}

          {tab==="words"&&(<>
            <div className="card">
              <h3>Saved ({learning.length})</h3>
              {!learning.length&&<div className="hint">None yet. She can tap <b>Save word</b> while reading.</div>}
              {learning.slice(0,80).map(([k,e])=>(
                <div className="wrow" key={k}>
                  <span className="lw">{e.span||e.w}</span>
                  <span className="lt">{e.de||e.en}</span>
                  <span style={{fontSize:11,color:"var(--ink2)",fontWeight:700}}>{STRENGTH_NAMES[strengthOf(e)]}</span>
                  <button className="icon-btn" style={{fontSize:14}} onClick={()=>forget(k)}>{"✕"}</button>
                </div>
              ))}
            </div>
            <div className="card">
              <h3>Looked up more than once, not saved</h3>
              <div className="hint" style={{marginTop:0,marginBottom:10}}>
                Words she has needed more than once but chose not to save.
                These are useful candidates for you to review.
              </div>
              {!seenList.length&&<div className="hint">None yet.</div>}
              {seenList.map(([k,v])=>(
                <div className="wrow" key={k}>
                  <span className="lw">{((normalizeEntry(wcache[k])||{senses:[]}).senses[0]||{}).span||k}</span>
                  <span className="lt">{((normalizeEntry(wcache[k])||{senses:[]}).senses[0]||{}).de||""}</span>
                  <span style={{fontSize:11,color:"var(--ink2)",fontWeight:700}}>{v.n}×</span>
                  <button className="btn btn-ghost" style={{padding:"6px 11px",fontSize:13}}
                    onClick={()=>promote(k)}>{"＋"}</button>
                </div>
              ))}
            </div>
          </>)}

          {tab==="set"&&(<>
            <div className="card">
              <h3>API key ({PROVIDER})</h3>
              <input type="password" value={key} placeholder={P.keyHint}
                onChange={e=>setKey(e.target.value)}/>
              <button className="btn btn-primary" style={{width:"100%",marginTop:10}}
                disabled={testing}
                onClick={async()=>{
                  const k=key.trim();
                  if(!k){ setMsg("Enter an API key first."); return; }
                  setTesting(true); setMsg("Connecting …");
                  try{
                    const ms=await listModels(k);
                    lsSet("apikey",k);
                    setModelList(ms);
                    setMsg("Connected. Key saved. "+ms.length+" models found.");
                  }catch(e){
                    setMsg("Connection failed. The new key was not saved: "+(e&&e.message||""));
                  }
                  setTesting(false);
                }}>{testing?"Connecting …":"Save & test"}</button>
              <div className="hint">
                Stored only on this iPad, never in the repository. Use a dedicated key for this app,
                keep the prepaid balance small, and leave auto-recharge off.
              </div>
            </div>

            <div className="card">
              <h3>Models</h3>
              <div className="hint" style={{marginTop:0}}>
                “Fast” pre-explains likely difficult words in the background and makes most requests.
                “Good” is used for live lookups and choosing the meaning that fits the sentence.
              </div>
              {[["fast","Fast (prefetch)"],["good","Good (live lookup)"]].map(([k,lab])=>(
                <div key={k} style={{marginTop:12}}>
                  <div className="setlab" style={{marginTop:0}}>{lab}</div>
                  {modelList.length
                    ? <select value={mdl[k]} onChange={e=>setMdl(m=>({...m,[k]:e.target.value}))}
                        style={{width:"100%",padding:"12px 14px",border:"1px solid var(--line)",
                          borderRadius:12,fontSize:16,fontFamily:"inherit",
                          background:"var(--paper)",color:"var(--ink)"}}>
                        {modelList.map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                    : <input type="text" value={mdl[k]}
                        onChange={e=>setMdl(m=>({...m,[k]:e.target.value}))}/>}
                </div>
              ))}
              <button className="btn btn-plain" style={{width:"100%",marginTop:12}}
                onClick={()=>{ lsSet("models",mdl); setMsg("Models saved."); }}>
                Save models
              </button>
              {!modelList.length&&<div className="hint">
                Tap “Save & test” above to load the model list available to this API key.
              </div>}
            </div>
            <div className="card">
              <h3>Cost (30 days)</h3>
              <div className="bigstat">${spend30.toFixed(2)}</div>
              <div className="hint">Estimated from API token usage
                ({models().fast} / {models().good}).
                Today: {callsToday()} of max. {DAILY_CALL_CAP} requests.</div>
            </div>
            <div className="card">
              <h3>Backup</h3>
              <button className="btn btn-plain" style={{width:"100%"}} onClick={exportAll}>Export everything</button>
              <label className="btn btn-plain" style={{width:"100%",marginTop:8,display:"block",textAlign:"center"}}>
                Restore
                <input type="file" accept="application/json,.json" style={{display:"none"}}
                  onChange={e=>e.target.files[0]&&importAll(e.target.files[0])}/>
              </label>
              <div className="hint">
                Browser storage can occasionally be cleared. Books can be imported again, but
                word history and reading time cannot, so export a backup occasionally.
              </div>
            </div>
            <div className="card">
              <h3>Import a book from a link</h3>
              <input type="text" value={bookUrl} placeholder="https://…/book.epub"
                onChange={e=>setBookUrl(e.target.value)}/>
              <button className="btn btn-plain" style={{width:"100%",marginTop:10}}
                onClick={async()=>{ await importUrl(bookUrl); setBookUrl(""); }}>Import</button>
              <div className="hint">
                Useful for a shared library across devices. The server must provide the file directly
                and allow CORS. raw.githubusercontent.com does; iCloud and Dropbox share links do not.
              </div>
            </div>

            <div className="card">
              <h3>Books ({books.length})</h3>
              {books.map(b=>(
                <div className="wrow" key={b.id}>
                  <span className="lt" style={{fontWeight:650,color:"var(--ink)"}}>{b.title}</span>
                  <button className="icon-btn" style={{fontSize:14}}
                    onClick={async()=>{ await dbDel(b.id); refreshBooks(); }}>{"✕"}</button>
                </div>
              ))}
            </div>
            {msg&&<div className="chip">{msg}</div>}
          </>)}
        </div>
      </>
    );
  }

  function TocSheet(){
    const sp=book.parsed.spine;
    return (
      <div className="scrim" onClick={()=>setSheet(null)}>
        <div className="sheet" onClick={e=>e.stopPropagation()}>
          <div className="sheet-head">
            <div className="headword serif" style={{fontSize:22}}>Contents</div>
            <button className="icon-btn" onClick={()=>setSheet(null)}>{"✕"}</button>
          </div>
          <div style={{marginTop:8}}>
            {sp.map((it,i)=>{
              const t=book.parsed.toc[it.href];
              if(!t&&!it.linear) return null;
              return (
                <div key={it.id+i} className={"toc-row"+(i===chapIdx?" cur":"")}
                  onClick={()=>{ flushClock(true); setSheet(null); setChapIdx(i); window.scrollTo(0,0); }}>
                  <span className="n">{i+1}</span>
                  <span style={{flex:1}}>{t||("Section "+(i+1))}</span>
                  {i===chapIdx&&<span>{"●"}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function TypeSheet(){
    const set=(k,v)=>setPrefs(p=>({...p,[k]:v}));
    return (
      <div className="scrim" onClick={()=>setSheet(null)}>
        <div className="sheet" onClick={e=>e.stopPropagation()}>
          <div className="sheet-head">
            <div className="headword serif" style={{fontSize:22}}>Text</div>
            <button className="icon-btn" onClick={()=>setSheet(null)}>{"✕"}</button>
          </div>

          <div className="setlab">Text size</div>
          <div className="steprow">
            <button onClick={()=>set("size",Math.max(16,prefs.size-1))}>A−</button>
            <span className="val">{prefs.size} px</span>
            <button onClick={()=>set("size",Math.min(30,prefs.size+1))}>A+</button>
          </div>

          <div className="setlab">Line spacing</div>
          <div className="seg">
            {[["tight",1.45],["normal",1.68],["wide",2.0]].map(([l,v])=>(
              <button key={l} className={Math.abs(prefs.lead-v)<0.02?"on":""}
                onClick={()=>set("lead",v)}>{l}</button>
            ))}
          </div>

          <div className="setlab">Font</div>
          <div className="seg">
            <button className={prefs.serif?"on":""} onClick={()=>set("serif",true)}>Serif</button>
            <button className={!prefs.serif?"on":""} onClick={()=>set("serif",false)}>Sans</button>
          </div>

          <div className="setlab">Background</div>
          <div className="seg">
            {[["Paper","paper"],["Light","light"],["Night","night"]].map(([l,v])=>(
              <button key={v} className={prefs.theme===v?"on":""} onClick={()=>set("theme",v)}>{l}</button>
            ))}
          </div>

          <div className="hint">
            Hold a sentence to hear it read aloud.
          </div>
        </div>
      </div>
    );
  }

  /* Her own list. English stays primary; German is available on demand. */
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

  /* ---- root ---- */
  return (
    <>
      {view==="library"&&Library()}
      {view==="read"&&book&&Reader()}
      {view==="parent"&&Parent()}
      {view==="words"&&WordList()}
      {view==="read"&&book&&sheet==="toc"&&TocSheet()}
      {view==="read"&&book&&sheet==="type"&&TypeSheet()}
      {stack.length>0&&(
        <WordSheet stack={stack} knownSet={knownSet}
          onClose={()=>setStack([])}
          onNested={nested}
          onSave={saveWord}
          onPopupTime={onPopupTime}
          onRetry={()=>{
            const t=stack[stack.length-1];
            if(t.level===0){ setStack([{...t,loading:true,error:null}]); liveLookup(t.word,t.sentence,t.cand,t.cacheKey,t.h); }
            else { setStack(s=>s.slice(0,-1)); setTimeout(()=>nested.open(t.word,t.sentence),0); }
          }}/>
      )}
    </>
  );
}
