"""Maintain the small, reviewed Moonflower teaching set. No AI calls at runtime."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
anchors={
 'th':('thumb','👍','The first sound in thumb.'),
 'dh':('feather','🪶','The middle sound in feather. Your voice is on.'),
 'r':('rain','🌧️','The first sound in rain.'),
 'oo':('moon','🌙','The middle sound in moon.'),
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
 'f':('fish','🐟','The first sound in fish.'),
 'ee':('tree','🌳','The last sound in tree.'),
 'p':('pig','🐖','The first sound in pig.'),
 'oi':('oil','🫒','The first sound in oil.'),
 'ai':('rain','🌧️','The middle sound in rain.'),
 'ar':('star','⭐','The last sound in star, in this British voice.'),
 'i':('fish','🐟','The middle sound in fish.'),
 'ng':('ring','💍','The last sound in ring.'),
 'sh':('ship','🚢','The first sound in ship.'),
 'u':('sun','☀️','The middle sound in sun.')
}
entries={}
def add(word,parts,sounds,focus,note,family=(),pattern='',sentences=()):
 assert ''.join(parts)==word and len(parts)==len(sounds)
 entries[word]={'parts':[{'text':p,'sound':s} for p,s in zip(parts,sounds)],'focus':focus,'note':note,'family':list(family),'pattern':pattern,'sentences':list(sentences)}
for w,onset in [('light','l'),('night','n'),('right','r')]:
 add(w,[w[0],'igh','t'],[onset,'igh','t'],1,'Three letters, igh, work together. These words share the same ending.',[v for v in ['light','night','right','bright'] if v!=w],'ight')
add('through',['th','r','ough'],['th','r','oo'],2,'In through, ough makes the middle sound in moon. There is no extra g or h sound.',sentences=['Go through the door.','Look through the window.'])
add('moon',['m','oo','n'],['m','oo','n'],1,'Here, oo makes the long sound in moon.',['boot','roots','smooth'],'oo')
add('boot',['b','oo','t'],['b','oo','t'],1,'Here, oo makes the long sound in moon.',['moon','roots','smooth'],'oo')
add('roots',['r','oo','t','s'],['r','oo','t','s'],1,'Here, oo makes the long sound in moon. Keep the final s.',['moon','boot','smooth'],'oo')
add('smooth',['s','m','oo','th'],['s','m','oo','dh'],2,'Here, oo makes the long sound in moon. The final th is voiced, as in feather.',['moon','boot','roots'],'oo')
for w,ps,ss in [('crow',['c','r','ow'],['k','r','oa']),('glow',['g','l','ow'],['g','l','oa']),('low',['l','ow'],['l','oa'])]:
 add(w,ps,ss,len(ps)-1,'In this word, ow sounds like the middle of boat.',[v for v in ['crow','glow','low'] if v!=w],'ow')
for w,ps,ss in [('grew',['g','r','ew'],['g','r','oo']),('flew',['f','l','ew'],['f','l','oo'])]:
 add(w,ps,ss,2,'In these words, ew makes the middle sound in moon.',['flew' if w=='grew' else 'grew'],'ew')
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
data={'version':1,'accent':'en-GB','anchors':{k:dict(word=v[0],picture=v[1],cue=v[2]) for k,v in anchors.items()},'words':entries,'rhyme':{'words':['light','night','bright'],'ending':'ight','line':'A light in the night, shining bright.'}}
(ROOT/'teaching.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(len(entries),'checked teaching words;',len(anchors),'sound anchors')
