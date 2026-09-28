"""Build the manually authored Moonflower sound maps. No AI calls at runtime."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
anchors={
 'th':('thumb','👍','The first sound in thumb.'),
 'dh':('feather','🪶','The middle sound in feather. Your voice is on.'),
 'r':('rock','🪨','The first sound in rock.'),
 'oo':('boot','👢','The middle sound in boot.'),
 'l':('leaf','🍃','The first sound in leaf.'),
 'igh':('night','🌌','The middle sound in night.'),
 't':('tiger','🐅','The first sound in tiger.'),
 'n':('nose','👃','The first sound in nose.'),
 'm':('moon','🌙','The first sound in moon.'),
 'b':('ball','⚽','The first sound in ball.'),
 's':('sun','☀️','The first sound in sun.'),
 'k':('cat','🐈','The first sound in cat.'),
 'g':('goat','🐐','The first sound in goat.'),
 'oa':('boat','⛵','The middle sound in boat.'),
 'f':('fox','🦊','The first sound in fox.'),
 'ee':('tree','🌳','The last sound in tree.'),
 'p':('pig','🐖','The first sound in pig.'),
 'oi':('oil','🫒','The first sound in oil.'),
 'ai':('rain','🌧️','The middle sound in rain.'),
 'ar':('star','⭐','The last sound in star, in this British voice.'),
 'i':('fish','🐟','The middle sound in fish.'),
 'ng':('ring','💍','The last sound in ring.'),
 'sh':('ship','🚢','The first sound in ship.'),
 'u':('up','⬆️','The first sound in up.')
}
entries={}
def add(word,parts,sounds,focus,note,family=(),pattern='',sentences=()):
 assert ''.join(parts)==word and len(parts)==len(sounds)
 entries[word]={'parts':[{'text':p,'sound':s} for p,s in zip(parts,sounds)],'focus':focus,'note':note,'family':list(family),'pattern':pattern,'sentences':list(sentences)}
for w,onset in [('light','l'),('night','n'),('right','r')]:
 add(w,[w[0],'igh','t'],[onset,'igh','t'],1,'Three letters, igh, work together. These words share the same ending.',[v for v in ['light','night','right','bright'] if v!=w],'ight')
add('through',['th','r','ough'],['th','r','oo'],2,'In through, ough makes the middle sound in boot. There is no extra g or h sound.',sentences=['Go through the door.','Look through the window.'])
add('moon',['m','oo','n'],['m','oo','n'],1,'Here, oo makes the long sound in boot.',['boot','roots','smooth'],'oo')
add('boot',['b','oo','t'],['b','oo','t'],1,'Here, oo makes the long sound in boot.',['moon','roots','smooth'],'oo')
add('roots',['r','oo','t','s'],['r','oo','t','s'],1,'Here, oo makes the long sound in boot. Keep the final s.',['moon','boot','smooth'],'oo')
add('smooth',['s','m','oo','th'],['s','m','oo','dh'],2,'Here, oo makes the long sound in boot. The final th is voiced, as in feather.',['moon','boot','roots'],'oo')
for w,ps,ss in [('crow',['c','r','ow'],['k','r','oa']),('glow',['g','l','ow'],['g','l','oa']),('low',['l','ow'],['l','oa'])]:
 add(w,ps,ss,len(ps)-1,'In this word, ow sounds like the middle of boat.',[v for v in ['crow','glow','low'] if v!=w],'ow')
for w,ps,ss in [('grew',['g','r','ew'],['g','r','oo']),('flew',['f','l','ew'],['f','l','oo'])]:
 add(w,ps,ss,2,'In these words, ew makes the middle sound in boot.',['flew' if w=='grew' else 'grew'],'ew')
add('stream',['s','t','r','ea','m'],['s','t','r','ee','m'],3,'In stream, ea makes the last sound in tree.',['cream','dream'],'eam')
add('steep',['s','t','ee','p'],['s','t','ee','p'],2,'The two e letters work together.',['deep','keep','sleep'],'eep')
add('soil',['s','oi','l'],['s','oi','l'],1,'The letters oi work together.',['oil','boil'],'oil')
add('tail',['t','ai','l'],['t','ai','l'],1,'The letters ai work together.',['mail','sail'],'ail')
add('path',['p','a','th'],['p','ar','th'],1,'In this British pronunciation, a has the vowel sound in star. Other accents say path differently.',['bath'],'ath')
add('three',['th','r','ee'],['th','r','ee'],2,'Th is one sound; r is the next sound; ee is the last sound.',['tree','free'],'ee')
add('ring',['r','i','ng'],['r','i','ng'],2,'The letters ng make one sound.',['king','wing'],'ing')
add('fish',['f','i','sh'],['f','i','sh'],2,'The letters sh make one sound.',['dish','wish'],'ish')
add('sun',['s','u','n'],['s','u','n'],1,'Blend the three sounds together.',['run','fun'],'un')
add('shut',['sh','u','t'],['sh','u','t'],0,'The letters sh make one sound.',['ship','shop'],'sh')
add('thump',['th','u','m','p'],['th','u','m','p'],0,'The letters th make the first sound in thumb.',['thin','thick'],'th')
anchors.update({
 'd':('drop','💧','The first sound in drop.'),
 'h':('hand','✋','The first sound in hand.'),
 'v':('van','🚐','The first sound in van.'),
 'w':('web','🕸️','The first sound in web.'),
 'y':('yes','✅','The first sound in yes.'),
 'z':('rose','🌹','The last sound in rose. Your voice is on.'),
 'ch':('cheese','🧀','The first sound in cheese.'),
 'j':('jar','🫙','The first sound in jar.'),
 'zh':('treasure','💎','The sound of s in treasure. Your voice is on.'),
 'a':('apple','🍎','The first sound in apple.'),
 'e':('egg','🥚','The first sound in egg.'),
 'o':('sock','🧦','The middle sound in sock, in this British voice.'),
 'shortoo':('book','📚','The short middle sound in book.'),
 'ur':('bird','🐦','The middle sound in bird, in this British voice.'),
 'or':('paw','🐾','The last sound in paw.'),
 'ow':('cow','🐄','The last sound in cow.'),
 'ear':('ear','👂','The vowel sound in ear, in British English.'),
 'air':('chair','🪑','The last sound in chair, in British English.'),
 'ure':('cure','🩹','The vowel in a traditional British cure. Some speakers use the paw vowel instead.'),
 'schwa':('banana','🍌','The soft, unstressed first a in banana.')
})
ipa=dict(p='p',b='b',t='t',d='d',k='k',g='ɡ',f='f',v='v',th='θ',dh='ð',s='s',z='z',sh='ʃ',zh='ʒ',h='h',ch='tʃ',j='dʒ',m='m',n='n',ng='ŋ',l='l',r='r',w='w',y='j',i='ɪ',e='e',a='æ',o='ɒ',u='ʌ',shortoo='ʊ',schwa='ə',ee='iː',ar='ɑː',or_='ɔː',oo='uː',ur='ɜː',ai='eɪ',igh='aɪ',oi='ɔɪ',oa='əʊ',ow='aʊ',ear='ɪə',air='eə',ure='ʊə')
ipa['or']=ipa.pop('or_')
notes={
 'artus':'Artus uses the English pronunciation of the recorded voice: ar, t, a soft unstressed u, then s.',
 "artus's":'Say Artus, then add the buzzing last sound in rose for the possessive ending.',
 'before':'Here, e sounds like the middle of fish. The letters ore work together, as in more.',
 'close':'Here, close means nearby, as in “Stay close.” Its s is like sun. The verb “close a door” has the buzzing sound in rose.',
 'one':'One is an unusual spelling. The o stands for two sounds: the first sound in web, then the first sound in up.',
 'ones':'Start with one, then add the buzzing last sound in rose.',
 'some':'Here, o sounds like the first sound in up. The final e has no extra sound.',
 'have':'Here, a keeps the first sound in apple. The final e has no extra sound.',
 'shone':'In this British pronunciation, o has the short vowel in sock. The final e has no extra sound.',
 'whole':'Here, wh makes the first sound in hand. The o and final e work together, as in home.',
 'move':'Here, o and the final e spell the vowel in boot. This is different from home.',
 'would':'Here, ou has the short vowel in book. The l is silent.',
 'two':'The w is silent. The o has the vowel in boot.',
 'listened':'The t is silent. The ending ed adds just the first sound in drop.',
 'everyone':'Say ev-ree-wun. The e after v and the final e have no extra sounds in this pronunciation.',
 'new':'In British new, ew represents two sounds: the first sound in yes, then the vowel in boot.',
 'our':'This map uses the two vowel sounds in British “ow-uh.” Some speakers say our like are.',
 'tired':'This map uses “tie-uh-d.” The ire group contains two vowel sounds; some speakers join them more closely.',
 'cure':'The letters ure contain the yes sound followed by the traditional British /ʊə/ vowel. Many speakers now use the paw vowel here.',
 'a':'On its own, a can sound like the vowel in rain. In a sentence it often becomes the soft vowel in banana.',
 'the':'This map uses the soft vowel in banana. Before a vowel, or for emphasis, the often ends like tree.',
 'to':'This is the clear, stand-alone pronunciation. In a sentence the vowel is often shorter and softer.',
 'from':'This is the full British pronunciation with the vowel in sock. In a sentence the vowel can become the soft sound in banana.',
 'again':'Here, ai has the vowel in egg, as in said. Some speakers use the vowel in rain instead.',
 'against':'Here, ai has the vowel in egg. Some speakers use the vowel in rain instead.',
 'with':'Here, th is voiced like feather. Some speakers use the thumb sound instead.',
 'without':'Here, th is voiced like feather. Some speakers use the thumb sound instead.'
}
mapped={}
for line in (ROOT/'word-breakdowns.txt').read_text().splitlines():
 if not line.strip() or line.startswith('#'):continue
 word,*tokens=line.split()
 assert word not in mapped,word
 parts=[]
 for token in tokens:
  letters,sounds=token.split(':')
  part={'text':letters,'sounds':[]}
  if sounds.startswith('@'):
   target=int(sounds[1:]);assert 0<=target<len(parts) and parts[target]['sounds'],word
   part['linkedTo']=target
  elif sounds!='-':
   part['sounds']=sounds.split('+')
   assert all(s in anchors for s in part['sounds']),word
  parts.append(part)
 assert ''.join(p['text'] for p in parts)==word,word
 prior=entries.get(word,{})
 focus=prior.get('focus',next((i for i,p in enumerate(parts) if len(p['text'])>1 or not p['sounds']),0))
 note=notes.get(word,prior.get('note',''))
 if not note:
  linked=[(parts[p['linkedTo']]['text'],p['text']) for p in parts if 'linkedTo' in p]
  silent=[p['text'] for p in parts if not p['sounds'] and 'linkedTo' not in p]
  multi=[p['text'] for p in parts if len(p['sounds'])>1]
  if linked:note='The '+', '.join(a+'…'+b for a,b in linked)+' letters work together. The final e has no separate sound.'
  elif silent:note='The '+', '.join(silent)+' '+('letters have' if len(silent)>1 else 'has')+' no extra sound in this pronunciation.'
  elif multi:note='The '+', '.join(multi)+' group contains two sounds. Use the picture hints in order, then blend the whole word.'
  else:note='Say each sound from left to right, then blend them into the word. Letters in one tile work together.'
 mapped[word]={'parts':parts,'phonemeCount':sum(len(p['sounds']) for p in parts),'focus':focus,'note':note,
               'family':prior.get('family',[]),'pattern':prior.get('pattern',''),'sentences':prior.get('sentences',[])}
for family,pattern in [(['before','more'],'ore'),(['stone','stones'],'one'),(['looked','took','stood','good','book'],'oo'),(['brought'],'ough'),(['flower','power','shower','tower'],'ower')]:
 for word in family:
  mapped[word]['family']=[w for w in family if w!=word]
  mapped[word]['pattern']=pattern
for word in ['flower','power','shower','tower']:
 mapped[word]['focus']=next(i for i,p in enumerate(mapped[word]['parts']) if p['text']=='ow')
 mapped[word]['note']='These words rhyme and share ower: the vowel in cow followed by the soft, unstressed vowel in banana.'
anchor_data={k:dict(word=v[0],picture=v[1],cue=v[2],ipa=ipa[k],kind='consonant' if k in set('p b t d k g f v th dh s z sh zh h ch j m n ng l r w y'.split()) else 'vowel') for k,v in anchors.items()}
anchor_data['ee']['cue']+=' At the unstressed end of a word, this vowel is shorter.'
data={'version':3,'accent':'en-GB','inventory':'44 traditional British English phonemes; accents vary, especially the cure vowel.',
      'anchors':anchor_data,'words':dict(sorted(mapped.items())),'rhyme':{'words':['light','night','bright'],'ending':'ight','line':'A light in the night, shining bright.'}}
(ROOT/'teaching.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(len(mapped),'authored word breakdowns;',len(anchors),'sound anchors')
