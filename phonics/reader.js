const BUILD='moonflower-20260928-r9';
const KEY='rrp_moonflower_v1';
const CACHE='rightreader-phonics-moonflower-v9';
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal=s=>s.toLowerCase().replaceAll('’',"'");
const emptyState=()=>({version:1,book:'artus-pip-thirsty-moonflower',page:0,size:30,words:{},updated:0});
function validState(s){
 if(!s||s.version!==1||s.book!=='artus-pip-thirsty-moonflower'||!Number.isInteger(s.page)||s.page<0||s.page>24||![26,30,34].includes(s.size)||typeof s.words!=='object'||!s.words||Array.isArray(s.words))return false;
 return Object.entries(s.words).length<=1000&&Object.entries(s.words).every(([k,v])=>/^[a-z]+(?:'[a-z]+)?$/.test(k)&&v&&Number.isInteger(v.taps)&&v.taps>=0&&v.taps<100000&&Number.isFinite(v.last));
}
let state=emptyState();
try{const saved=JSON.parse(localStorage.getItem(KEY));if(validState(saved))state=saved;}catch{}
let book,teaching,audioManifest,selectedWord='',noticeTimer,playSerial=0,currentAudio=null,lastWordButton=null,review=null,registration=null;
const help=$('help-dialog'),menu=$('menu-dialog');
function notice(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,6000);}
function save(){state.updated=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state));}catch{notice('Your progress could not be saved. You can make a backup in Reading settings.');}updateCount();}
function updateCount(){const n=Object.keys(state.words).length;$('word-count').textContent=n;$('word-count').hidden=!n;}
function stopAudio(){
 playSerial++;
 if(currentAudio){currentAudio.pause();currentAudio.removeAttribute('src');currentAudio.load();currentAudio=null;}
 help.classList.remove('playing');
}
function setAudioStatus(text,fallback=false){const el=$('audio-status');if(el){el.textContent=text;el.classList.toggle('fallback',fallback);}}
function speak(word){
 stopAudio();const serial=playSerial;const entry=audioManifest.words[normal(word)];
 if(!entry){setAudioStatus('Recording not available for this word.',true);return;}
 const a=$('narrator');a.src=new URL(entry.file,location.href).href;currentAudio=a;a.preload='auto';
 setAudioStatus('George · British English');
 a.onplaying=()=>{if(serial===playSerial)help.classList.toggle('playing',normal($('help-title')?.textContent||'')===normal(word));};
 a.onended=()=>{if(serial===playSerial){help.classList.remove('playing');currentAudio=null;}};
 a.onerror=()=>{if(serial===playSerial){help.classList.remove('playing');setAudioStatus('Recording unavailable. Tap Listen to retry.',true);notice('The recording could not load. Try again when connected.');}};
 a.play().catch(e=>{if(serial!==playSerial)return;a.dataset.playbackError=e.name+': '+e.message;help.classList.remove('playing');setAudioStatus(e.name==='NotAllowedError'?'Tap Listen to start the recording.':'Recording unavailable. Tap Listen to retry.',true);});
}
function wordMarkup(text){
 const re=/[A-Za-z]+(?:[’'][A-Za-z]+)?/g;let out='',offset=0;
 for(const m of text.matchAll(re)){
  let prefix=text.slice(offset,m.index),opening='';
  if(/[“‘"(]$/.test(prefix)){opening=prefix.slice(-1);prefix=prefix.slice(0,-1);}
  const end=m.index+m[0].length,closing=text.slice(end).match(/^[.,!?;:…”’)\]]*/)[0];
  out+=escapeHTML(prefix)+`<span class="word-unit">${escapeHTML(opening)}<button class="word" data-word="${escapeHTML(normal(m[0]))}" aria-label="Hear ${escapeHTML(m[0])}">${escapeHTML(m[0])}</button>${escapeHTML(closing)}</span>`;
  offset=end+closing.length;
 }
 return out+escapeHTML(text.slice(offset));
}
function renderPage(){
 const p=book.pages[state.page];document.documentElement.style.setProperty('--reader-size',state.size+'px');
 $('reader').innerHTML=`<article class="story-page" aria-label="Page ${p.number}"><div class="picture-panel"><img class="scene-wash" src="${p.image}" alt="" aria-hidden="true" decoding="async"><img class="scene-artwork" src="${p.image}" alt="${escapeHTML(p.alt)}" fetchpriority="high" decoding="async"></div><div class="reading-panel"><p class="eyebrow">${p.heading?'CHAPTER '+p.chapter:'ARTUS & PIP'}</p>${p.heading?`<h1 class="chapter-title">${wordMarkup(p.heading)}</h1>`:''}<p class="story-text">${wordMarkup(p.text)}</p>${state.page===24?`<p class="attribution">${escapeHTML(book.attribution)}</p>`:''}<p class="reading-tip">Tap a word whenever you need a little help.</p></div></article>`;
 $('previous').disabled=state.page===0;$('next').disabled=state.page===24;
 $('page-menu').innerHTML=`${p.number} <span>/ ${book.pages.length}</span>`;
 $('page-menu').setAttribute('aria-label',`Page ${p.number} of ${book.pages.length}. Choose a page.`);
 $('reader').querySelectorAll('[data-word]').forEach(b=>b.addEventListener('click',()=>{lastWordButton=b;openWord(b.dataset.word,true);}));
 if(state.page<24){const im=new Image();im.src=book.pages[state.page+1].image;}
}
function goPage(n){if(n<0||n>=book.pages.length)return;stopAudio();help.close();menu.close();state.page=n;save();renderPage();window.scrollTo({top:0,behavior:'instant'});}
function closeHelp(){stopAudio();help.close();document.querySelectorAll('.word.selected').forEach(x=>x.classList.remove('selected'));}
function dialogFrame(title,body){return `<div class="dialog-top"><p class="eyebrow">RIGHT READER</p><button class="close" aria-label="Close">×</button></div><div class="menu-body"><h2 class="menu-title" id="menu-title">${title}</h2>${body}</div>`;}
function showMenu(title,body){closeHelp();stopAudio();menu.innerHTML=dialogFrame(title,body);menu.querySelector('.close').onclick=()=>menu.close();if(!menu.open)menu.showModal();}
function markPattern(word,pattern){const i=word.indexOf(pattern);return i<0||!pattern?escapeHTML(word):escapeHTML(word.slice(0,i))+'<mark>'+escapeHTML(pattern)+'</mark>'+escapeHTML(word.slice(i+pattern.length));}
function openWord(word,fromStory=false){
 stopAudio();menu.close();selectedWord=normal(word);const entry=teaching.words[selectedWord];
 if(fromStory){const old=state.words[selectedWord]||{taps:0,last:0};state.words[selectedWord]={taps:old.taps+1,last:Date.now(),page:state.page};save();}
 document.querySelectorAll('.word.selected').forEach(x=>x.classList.remove('selected'));
 if(lastWordButton&&fromStory)lastWordButton.classList.add('selected');
 const sounds=entry?`<section class="sound-section"><p class="section-label">${entry.phonemeCount} ${entry.phonemeCount===1?'sound':'sounds'} · tap a part for a hint</p><div class="chunks">${entry.parts.map((p,i)=>`<button class="chunk ${i===entry.focus?'focus':''} ${!p.sounds.length&&p.linkedTo===undefined?'silent':''} ${p.linkedTo!==undefined||entry.parts.some(q=>q.linkedTo===i)?'linked':''}" data-part="${i}" aria-label="Explain ${escapeHTML(p.text)}" aria-pressed="false">${escapeHTML(p.text)}</button>`).join('')}</div><div id="anchor" aria-live="polite" hidden></div><button class="hint-toggle" id="hint-toggle">Show a helpful hint</button><p class="note" id="word-note" hidden>${escapeHTML(entry.note)}</p></section>`:'';
 const family=entry?.family.length?`<section class="family"><h3>Try the same spelling pattern</h3><div class="family-words">${entry.family.map(w=>`<button class="family-word" data-related="${w}" aria-label="Hear ${w}">${markPattern(w,entry.pattern)}</button>`).join('')}</div></section>`:'';
 const sentences=entry?.sentences.length?`<section class="sentence-help"><h3>Meet this word again</h3>${entry.sentences.map(s=>`<p>${escapeHTML(s).replace(selectedWord,`<strong>${selectedWord}</strong>`)}</p>`).join('')}</section>`:'';
 help.innerHTML=`<div class="dialog-top"><p class="eyebrow">A LITTLE WORD HELP</p><button class="close" aria-label="Close word help">×</button></div><div class="help-body"><h2 id="help-title" class="help-word">${escapeHTML(word)}</h2><div class="listen-row"><button class="primary" id="listen-word">▶ Listen</button>${review?'<button class="secondary" id="back-review">Back to practice</button>':''}</div><p class="audio-status" id="audio-status" role="status"></p>${sounds}${family}${sentences}<button class="primary return-button" id="return-story">Back to the story</button></div>`;
 help.querySelector('.close').onclick=()=>{review=null;closeHelp();};$('return-story').onclick=()=>{review=null;closeHelp();};$('listen-word').onclick=()=>speak(selectedWord);
 if($('back-review'))$('back-review').onclick=()=>{closeHelp();showReview();};
 if(entry){
  help.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>showAnchor(entry,Number(b.dataset.part)));
  $('hint-toggle').onclick=()=>{showAnchor(entry,entry.focus);$('word-note').hidden=false;$('hint-toggle').hidden=true;};
 }
 help.querySelectorAll('[data-related]').forEach(b=>b.onclick=()=>openWord(b.dataset.related));
 if(!help.open)help.showModal();speak(word);
}
function showAnchor(entry,index){
 const target=entry.parts[index].linkedTo??index,part=entry.parts[target];
 const linked=entry.parts.map((p,i)=>p.linkedTo===target?i:-1).filter(i=>i>=0);
 help.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String([target,...linked].includes(Number(b.dataset.part)))));
 const el=$('anchor');el.className='anchor-hints';
 const introduction=!part.sounds.length?`${part.text} is silent here. No extra sound.`:linked.length?`${part.text}…${linked.map(i=>entry.parts[i].text).join('')} work together. One sound.`:part.sounds.length>1?`${part.text} contains ${part.sounds.length} sounds. Try these in order.`:'';
 el.innerHTML=(introduction?`<p class="part-explanation">${escapeHTML(introduction)}</p>`:'')+part.sounds.map((sound,i)=>{
  const a=teaching.anchors[sound];return `<div class="anchor"><span class="anchor-picture" role="img" aria-label="${escapeHTML(a.word)}">${a.picture}</span><div class="anchor-copy"><p class="anchor-word">${part.sounds.length>1?(i+1)+'. ':''}${escapeHTML(a.word)}</p><p class="anchor-cue">${escapeHTML(a.cue)}</p></div><button class="anchor-listen" data-anchor="${a.word}" aria-label="Hear the example word ${escapeHTML(a.word)}">▶</button></div>`;
 }).join('');el.hidden=false;
 el.querySelectorAll('[data-anchor]').forEach(b=>b.onclick=()=>speak(b.dataset.anchor));
}
function showBookMenu(){
 showMenu('The Thirsty Moonflower',`<p class="empty">An adventure with Artus and Pip.</p><div class="menu-list"><button class="menu-item" id="continue-book">Continue reading<small>Page ${state.page+1} of 25</small></button><button class="menu-item" id="chapter-one">Chapter 1 · Before the Dark</button><button class="menu-item" id="chapter-two">Chapter 2 · One Small Stone</button><button class="menu-item" id="sound-guide">Sound pictures<small>44 sounds, one picture each</small></button><button class="menu-item" id="rhyme-button">Rhyme time<small>Light, night, bright</small></button><a class="menu-item" href="book/Artus-and-Pip-The-Thirsty-Moonflower.epub" download>Download the EPUB<small>Read it in another book app</small></a></div>`);
 $('continue-book').onclick=()=>menu.close();$('chapter-one').onclick=()=>goPage(0);$('chapter-two').onclick=()=>goPage(12);$('rhyme-button').onclick=showRhyme;$('sound-guide').onclick=showSoundGuide;
}
function showSoundGuide(){
 review=null;
 showMenu('44 sound pictures',`<p class="empty">One picture for each sound. Tap a picture to see its word and highlighted sound.</p>${['consonant','vowel'].map(kind=>`<h3 class="guide-label">${kind==='consonant'?'24 consonant sounds':'20 vowel sounds'}</h3><div class="sound-grid">${Object.entries(teaching.anchors).filter(([,a])=>a.kind===kind).map(([id,a])=>`<button class="sound-card" data-sound="${id}" aria-label="${escapeHTML(a.word)} sound picture"><span aria-hidden="true">${a.picture}</span>${escapeHTML(a.word)}</button>`).join('')}</div>`).join('')}<p class="helper-line">These are the traditional 44 British English sounds. Accents vary, especially the vowel in cure. Listen buttons play whole example words.</p>`);
 menu.querySelectorAll('[data-sound]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.sound,word=teaching.anchors[id].word,entry=teaching.words[word];
  openWord(word);showAnchor(entry,entry.parts.findIndex(p=>p.sounds.includes(id)));
  $('return-story').textContent='Back to sound pictures';$('return-story').onclick=()=>{closeHelp();showSoundGuide();};
 });
}
function showPages(){showMenu('Choose a page',`<div class="page-grid">${book.pages.map((p,i)=>`<button class="page-choice ${i===state.page?'active':''}" data-page="${i}" aria-label="Page ${i+1}">${i+1}</button>`).join('')}</div>`);menu.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>goPage(Number(b.dataset.page)));}
function showWords(){
 const words=Object.keys(state.words).sort((a,b)=>state.words[b].last-state.words[a].last);
 review=null;showMenu('My words',words.length?`<p class="empty">Words you asked about in the story. Tap one to hear it again.</p><div class="words-list">${words.map(w=>`<button data-saved="${escapeHTML(w)}">${escapeHTML(w)}</button>`).join('')}</div><button class="primary return-button" id="start-review">Try three words</button><p class="helper-line">No timer. No scores. Read first, then listen if you need help.</p>`:'<p class="empty">Your words will appear here when you tap them in the story.</p>');
 menu.querySelectorAll('[data-saved]').forEach(b=>b.onclick=()=>openWord(b.dataset.saved));
 if($('start-review'))$('start-review').onclick=()=>{review={words:words.slice(0,3),index:0};showReview();};
}
function showReview(){
 if(!review)return;
 const word=review.words[review.index];showMenu('Your turn to read',`<p class="review-progress">${review.index+1} of ${review.words.length}</p><p class="review-word">${escapeHTML(word)}</p><p class="helper-line">Say the word. Listening is here if you need it.</p><div class="review-actions"><button class="secondary" id="review-help">Help me</button><button class="primary" id="review-next">${review.index===review.words.length-1?'Back to the story':'Next word'}</button></div>`);
 $('review-help').onclick=()=>openWord(word);
 $('review-next').onclick=()=>{stopAudio();if(++review.index===review.words.length){review=null;menu.close();}else showReview();};
}
function showRhyme(){
 showMenu('Rhyme time',`<p class="empty">Tap each word in a rhythm. Can you say all three?</p><div class="rhyme-cards">${teaching.rhyme.words.map(w=>`<button data-rhyme="${w}">${markPattern(w,'ight')}</button>`).join('')}</div><p class="rhyme-line">A light in the night,<br>shining bright.</p><p class="helper-line">Make up your own tune, then try reading the words without singing.</p>`);
 menu.querySelectorAll('[data-rhyme]').forEach(b=>b.onclick=()=>{speak(b.dataset.rhyme);b.classList.add('beat');setTimeout(()=>b.classList.remove('beat'),180);});
}
function showSettings(){
 const total=audioManifest.storyWordCount||0;
 showMenu('Reading settings',`<p class="empty">Choose a comfortable text size.</p><div class="size-options">${[26,30,34].map((n,i)=>`<button class="${state.size===n?'active':''}" data-size="${n}" aria-label="${['Small','Medium','Large'][i]} text">${['A','A+','A++'][i]}</button>`).join('')}</div><div class="setting-row"><p><strong>Audio</strong><br>All ${total} different story words and the picture and practice words use the same recorded British voice: George. Picture buttons play the example word, not an isolated speech sound.</p></div><div class="setting-row"><p><strong>Keep a copy</strong><br>Reading position and word-help history stay on this device, separately from the original reader.</p><div class="backup"><button class="secondary" id="backup">Save progress backup</button><label class="secondary" for="restore" style="cursor:pointer">Restore backup</label><input type="file" id="restore" accept="application/json,.json" hidden></div></div><div class="setting-row"><button class="secondary" id="offline">Save this book for offline reading</button><p id="offline-status" role="status" class="helper-line"></p></div><p class="helper-line">A word tap records a request for help. It is not a reading score.</p><p class="version">${BUILD}</p>`);
 menu.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{state.size=Number(b.dataset.size);save();renderPage();showSettings();});
 $('backup').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='artus-reading-progress-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('restore').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>1000000)throw Error();const imported=JSON.parse(await f.text());if(!validState(imported))throw Error();if(!window.confirm('Replace this pilot’s reading position and word-help history with the backup?'))return;state=imported;save();renderPage();showSettings();notice('Progress restored.');}catch{notice('That is not a valid Artus reading backup. Nothing was changed.');}};
 $('offline').onclick=saveOffline;
}
async function saveOffline(){
 const button=$('offline'),label=$('offline-status');button.disabled=true;
 try{
  if(!registration||!('caches'in window))throw Error('Offline support has not started. Reopen the page while online.');
  const cache=await caches.open(CACHE);
  const urls=['./','index.html','reader.js?v=9','styles.css?v=9','book/story.json','teaching.json','audio.json','manifest.json',...book.pages.map(p=>p.image),...Object.values(audioManifest.words).map(a=>a.file)];
  const unique=[...new Set(urls)];let completed=0;
  for(let i=0;i<unique.length;i+=4){await Promise.all(unique.slice(i,i+4).map(async u=>{const res=await fetch(u,{cache:'reload'});if(!res.ok)throw Error('A book file could not download. Please try again.');await cache.put(u,res);completed++;}));if(label.isConnected)label.textContent=`Saving… ${Math.round(completed/unique.length*100)}%`;}
  if(label.isConnected)label.textContent='Book and all recordings saved for offline reading.';
 }catch(e){if(label.isConnected)label.textContent=e.message||'Unable to save offline. Check your connection and storage.';}
 finally{if(button.isConnected)button.disabled=false;}
}
for(const d of [help,menu]){
 d.addEventListener('cancel',()=>{review=null;stopAudio();});d.addEventListener('close',()=>{if(!help.open&&!menu.open)stopAudio();if(d===help)document.querySelectorAll('.word.selected').forEach(x=>x.classList.remove('selected'));});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});window.addEventListener('pagehide',stopAudio);
window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{const next=JSON.parse(e.newValue);if(validState(next)&&next.updated>state.updated){state=next;updateCount();renderPage();}}catch{}});
document.addEventListener('keydown',e=>{if(help.open||menu.open||!book)return;if(e.key==='ArrowRight')goPage(state.page+1);if(e.key==='ArrowLeft')goPage(state.page-1);});
async function init(){
 try{
  [book,teaching,audioManifest]=await Promise.all(['book/story.json','teaching.json','audio.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error(url);return r.json();}));
  $('home').onclick=showBookMenu;$('words-button').onclick=showWords;$('settings-button').onclick=showSettings;$('previous').onclick=()=>goPage(state.page-1);$('next').onclick=()=>goPage(state.page+1);$('page-menu').onclick=showPages;
  renderPage();updateCount();
  if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(r=>{registration=r;}).catch(()=>{});}
 }catch{ $('reader').innerHTML='<div class="loading"><div><p>The story could not load.</p><button class="primary" id="reload">Try again</button></div></div>';$('reload').onclick=()=>location.reload();$('previous').disabled=true;$('next').disabled=true; }
}
init();
