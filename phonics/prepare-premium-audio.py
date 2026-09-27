"""Generate a bounded, resumable set of story recordings. Run locally with an environment key.

Only the requested story, its teaching examples and anchors are sent to the
speech provider. Credentials are read from the environment and never written.
Existing saved recordings survive a quota failure. No automatic request retries.
"""
from pathlib import Path
import os,json,re,hashlib,urllib.request,urllib.error,sys
ROOT=Path(__file__).resolve().parent
KEY=os.environ.get('ELEVENLABS_API_KEY','')
VOICE='JBFqnCBsd6RMkjVDRZzb'
MODEL='eleven_multilingual_v2'
if not KEY:raise SystemExit('ELEVENLABS_API_KEY is not configured in the environment. Existing recordings are unchanged.')
book=json.loads((ROOT/'book/story.json').read_text())
teaching=json.loads((ROOT/'teaching.json').read_text())
manifest=json.loads((ROOT/'audio.json').read_text())
words=sorted(set(w.lower().replace('’',"'") for p in book['pages'] for w in re.findall(r"[A-Za-z]+(?:[’'][A-Za-z]+)?",p['text'])))
wanted=sorted(set(words)|{w for e in teaching['words'].values() for w in e['family']}|{a['word'] for a in teaching['anchors'].values()}|set(teaching['rhyme']['words']))
assert len(wanted)<400 and sum(map(len,wanted))<4000,'Audio request exceeds the bounded book plan.'
def save():
    manifest['recordedStoryWords']=sum(w in manifest['words'] for w in words)
    manifest['missingStoryWords']=[w for w in words if w not in manifest['words']]
    (ROOT/'audio.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
generated=0
try:
 for word in wanted:
    old=manifest['words'].get(word,{})
    if old.get('voiceId')==VOICE and old.get('model')==MODEL and (ROOT/old['file']).exists():continue
    text={'i':'I','artus':'Artus',"artus's":"Artus’s",'pip':'Pip'}.get(word,word)+'.'
    data=json.dumps({'text':text,'model_id':MODEL,'voice_settings':{'stability':.75,'similarity_boost':.75,'speed':.85}}).encode()
    req=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/'+VOICE+'?output_format=mp3_44100_128',data=data,headers={'xi-api-key':KEY,'Content-Type':'application/json','Accept':'audio/mpeg'},method='POST')
    try:
      with urllib.request.urlopen(req,timeout=90) as r:audio=r.read()
    except urllib.error.HTTPError as e:
      detail=e.read().decode(errors='replace').replace(KEY,'[redacted]')
      raise RuntimeError('Speech service HTTP '+str(e.code)+': '+detail[:600]) from None
    if len(audio)<500:raise ValueError('The speech service returned an unexpectedly short recording.')
    filename='audio/'+hashlib.sha256(word.encode()).hexdigest()[:16]+'.mp3'
    (ROOT/filename).write_bytes(audio)
    manifest['words'][word]={'file':filename,'voice':'George, British English','voiceId':VOICE,'model':MODEL,'sha256':hashlib.sha256(audio).hexdigest(),'source':'ElevenLabs API','text':text}
    generated+=1;save();print('Prepared',word,flush=True)
finally:
 save();print('Saved',generated,'new recordings.',flush=True)
