"""Check the packaged EPUB, teaching data and audio before deployment."""
from pathlib import Path
import json,zipfile,xml.etree.ElementTree as ET,hashlib,re
ROOT=Path(__file__).resolve().parent
book=json.loads((ROOT/'book/story.json').read_text())
teaching=json.loads((ROOT/'teaching.json').read_text())
audio=json.loads((ROOT/'audio.json').read_text())
anchors=list(teaching['anchors'].values())
assert len({a['picture'] for a in anchors})==len(anchors),'Each sound must have its own distinct icon.'
assert len({a['word'] for a in anchors})==len(anchors),'An anchor word must not represent two different sounds.'
assert len(book['pages'])==25
assert [p['number'] for p in book['pages']]==list(range(1,26))
assert [p['number'] for p in book['pages'] if p['heading']]==[1,13]
assert sum(len(re.findall(r"[A-Za-z]+(?:[’'][A-Za-z]+)?",p['text'])) for p in book['pages'])==587
with zipfile.ZipFile(ROOT/'book/Artus-and-Pip-The-Thirsty-Moonflower.epub') as z:
 assert z.namelist()[0]=='mimetype'
 assert z.getinfo('mimetype').compress_type==0
 assert z.read('mimetype')==b'application/epub+zip'
 for name in z.namelist():
  if name.endswith(('.xml','.opf','.xhtml')):ET.fromstring(z.read(name))
 for p in book['pages']:
  n=p['number'];doc=ET.fromstring(z.read(f'EPUB/page-{n:02}.xhtml'))
  assert doc.find('.//{http://www.w3.org/1999/xhtml}p[@id="story-text"]').text==p['text']
  assert z.read(f'EPUB/images/page-{n:02}.jpg')==(ROOT/p['image']).read_bytes()
for word,entry in teaching['words'].items():
 assert ''.join(p['text'] for p in entry['parts'])==word
 assert all(p['sound'] in teaching['anchors'] for p in entry['parts'])
 assert 0<=entry['focus']<len(entry['parts'])
 assert re.search(r'\b'+word+r'\b',' '.join(p['text'] for p in book['pages']),re.I)
 assert word in audio['words'],'Teaching target has no recorded audio: '+word
assert [p['text'] for p in teaching['words']['through']['parts']]==['th','r','ough']
assert teaching['words']['smooth']['parts'][-1]['sound']=='dh'
story_words={w.lower().replace('’',"'") for p in book['pages'] for w in re.findall(r"[A-Za-z]+(?:[’'][A-Za-z]+)?",p['text'])}
wanted=story_words|{w for e in teaching['words'].values() for w in e['family']}|{a['word'] for a in anchors}|set(teaching['rhyme']['words'])
assert set(audio['words'])==wanted,'Every story, family, rhyme and anchor word needs a recording.'
assert audio['recordedStoryWords']==audio['storyWordCount']==len(story_words)==264
assert audio['missingStoryWords']==[]
assert audio['voiceId']=='JBFqnCBsd6RMkjVDRZzb'
for word,clip in audio['words'].items():
 assert clip['file'].startswith('audio/') and '..' not in clip['file']
 assert hashlib.sha256((ROOT/clip['file']).read_bytes()).hexdigest()==clip['sha256']
 assert clip['voiceId']==audio['voiceId'] and clip['model']=='eleven_multilingual_v2','All word recordings must use George.'
 assert clip['sha256'][:12] in clip['file'],'New audio bytes must have a new cache-safe filename.'
print(f"PASS: 25 complete illustrated pages, 587 words, {len(teaching['words'])} teaching entries, {len(audio['words'])} audio files.")
