"""Generate the bounded Moonflower vocabulary once, with one voice and saved costs."""
from pathlib import Path
import argparse, hashlib, json, math, os, re, urllib.request, urllib.error

ROOT = Path(__file__).resolve().parent
VOICE = 'JBFqnCBsd6RMkjVDRZzb'
MODEL = 'eleven_multilingual_v2'
SETTINGS = {'stability': .75, 'similarity_boost': .75, 'speed': .85}

def vocabulary():
    book = json.loads((ROOT/'book/story.json').read_text())
    teaching = json.loads((ROOT/'teaching.json').read_text())
    story = {w.lower().replace('’', "'") for p in book['pages']
             for w in re.findall(r"[A-Za-z]+(?:[’'][A-Za-z]+)?", p['text'])}
    wanted = story | {w for e in teaching['words'].values() for w in e['family']}
    wanted |= {a['word'] for a in teaching['anchors'].values()} | set(teaching['rhyme']['words'])
    assert len(wanted) == 299 and len(story) == 264, 'Re-review changed vocabulary.'
    return story, wanted

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed-dir', type=Path)
    parser.add_argument('--max-total-credits', type=int, default=1100)
    args = parser.parse_args()
    key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if not key:
        raise SystemExit('ELEVENLABS_API_KEY is not configured.')
    story, wanted = vocabulary()
    old = json.loads((ROOT/'audio.json').read_text())
    clips = {}
    for word, entry in old['words'].items():
        path = ROOT/entry['file']
        if (word in wanted and entry.get('voiceId') == VOICE and entry.get('model') == MODEL
            and path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256']):
            clips[word] = entry

    def add_clip(word, audio, text, credits, source):
        digest = hashlib.sha256(audio).hexdigest()
        # New audio bytes get a new URL, including for devices with older offline packs.
        filename = 'audio/'+hashlib.sha256(word.encode()).hexdigest()[:16]+'-'+digest[:12]+'.mp3'
        (ROOT/filename).write_bytes(audio)
        clips[word] = {'file': filename, 'voice': 'George, British English', 'voiceId': VOICE,
                      'model': MODEL, 'sha256': digest, 'source': source, 'text': text,
                      'credits': credits, 'voiceSettings': SETTINGS}

    if args.seed_dir:
        for report_path in sorted(args.seed_dir.glob('*/result.json')):
            report = json.loads(report_path.read_text())
            assert report['voice_id'] == VOICE
            assert report.get('model', report.get('model_id')) == MODEL
            for entry in report.get('words', [report]):
                word = entry['word']
                assert word in wanted
                audio = (report_path.parent/(word+'.mp3')).read_bytes()
                assert hashlib.sha256(audio).hexdigest() == entry['sha256']
                # The original Through cost was confirmed via ElevenLabs history.
                cost = entry.get('credits', 4 if word == 'through' else None)
                assert cost is not None
                if word not in clips:
                    add_clip(word, audio, entry['text'], cost, 'ElevenLabs verified sample artifact')

    initial_count = len(clips)
    initial_spent = sum(e['credits'] for e in clips.values())
    generated, spent = 0, initial_spent
    def save():
        manifest = {'version': 2, 'voice': 'George, British English', 'voiceId': VOICE, 'model': MODEL,
                    'storyWordCount': len(story), 'recordedStoryWords': len(story & clips.keys()),
                    'missingStoryWords': sorted(story-clips.keys()), 'words': dict(sorted(clips.items()))}
        (ROOT/'audio.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
        provenance = {'provider': 'ElevenLabs', 'voice': manifest['voice'], 'voiceId': VOICE,
                      'model': MODEL, 'voiceSettings': SETTINGS, 'reportedCredits': spent,
                      'creditSource': 'character-cost headers; original Through cost from history',
                      'generationRun': os.environ.get('GITHUB_RUN_ID'), 'clips': manifest['words']}
        (ROOT/'audio-provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2)+'\n')
        report = {'voice': manifest['voice'], 'model': MODEL, 'plannedWords': len(wanted),
                  'reusedWords': initial_count, 'newWords': generated, 'completedWords': len(clips),
                  'missingWords': sorted(wanted-clips.keys()), 'totalReportedCredits': spent,
                  'newReportedCredits': spent-initial_spent, 'maxTotalCredits': args.max_total_credits,
                  'originalSamplesReused': sum(e['source']=='ElevenLabs verified sample artifact' for e in clips.values()),
                  'generatedWordsTotal': sum(e['source']=='ElevenLabs API' for e in clips.values()),
                  'costVarianceNote': 'Stretched cost one more credit than the character estimate; measured total remains authoritative.',
                  'billingNote': 'Request-reported units; earlier subscription counter did not confirm balance deductions.',
                  'run': os.environ.get('GITHUB_RUN_ID')}
        (ROOT.parent/'docs/ELEVENLABS_AUDIO_GENERATION.json').write_text(json.dumps(report, indent=2)+'\n')

    save()
    try:
        for word in sorted(wanted-clips.keys()):
            text = {'i':'I', 'artus':'Artus', "artus's":'Artus’s', 'pip':'Pip'}.get(word, word.capitalize())+'.'
            predicted = math.ceil(len(text)*.5)
            if spent+predicted+1 > args.max_total_credits:
                raise RuntimeError('Stopped before exceeding the approved credit budget.')
            data = json.dumps({'text':text, 'model_id':MODEL, 'voice_settings':SETTINGS}).encode()
            req = urllib.request.Request(
                'https://api.elevenlabs.io/v1/text-to-speech/'+VOICE+'?output_format=mp3_44100_128',
                data=data, headers={'xi-api-key':key, 'Content-Type':'application/json', 'Accept':'audio/mpeg'}, method='POST')
            try:
                with urllib.request.urlopen(req, timeout=90) as response:
                    raw_cost = response.headers.get('character-cost')
                    content_type = response.headers.get('Content-Type', '')
                    audio = response.read()
            except urllib.error.HTTPError as exc:
                raise RuntimeError('ElevenLabs HTTP '+str(exc.code)+'; no retry. Completed clips saved.') from None
            if not content_type.startswith('audio/') or len(audio) < 500:
                raise RuntimeError('Unexpected response; no retry.')
            if raw_cost is None:
                raise RuntimeError('Missing cost header; stop to keep the budget auditable.')
            cost = float(raw_cost)
            if not math.isfinite(cost) or cost < 0:
                raise RuntimeError('Invalid cost header; stop for review.')
            add_clip(word, audio, text, cost, 'ElevenLabs API')
            spent += cost
            generated += 1
            save()
            print(f'Prepared {len(clips)}/{len(wanted)}: {word}; total reported credits {spent:g}', flush=True)
            if cost > predicted+1:
                raise RuntimeError('Credit cost exceeded the observed one-credit variance; clip saved, stopped for review.')
    finally:
        save()
    assert set(clips) == wanted
    print(f'Complete: {len(clips)} recordings, {spent:g} reported credits; reused {initial_count}.')

if __name__ == '__main__':
    main()
