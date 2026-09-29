"""Read-only ElevenLabs video preflight; never starts a generation."""
import json, os, urllib.request, urllib.error
key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
if not key:
    raise SystemExit('The existing ElevenLabs repository secret is unavailable.')

def get(path):
    request = urllib.request.Request('https://api.elevenlabs.io' + path, headers={'xi-api-key': key})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        try:
            body = json.loads(error.read())
        except ValueError:
            body = {'detail': {'message': 'Non-JSON API error'}}
        return error.code, body

report = {'mode': 'read_only', 'generationRequests': 0}
status, body = get('/v1/user/subscription')
report['subscription'] = {'httpStatus': status}
if status == 200:
    report['subscription'].update({k: body.get(k) for k in ['tier', 'status', 'character_count', 'character_limit', 'can_extend_character_limit']})
else:
    report['subscription']['error'] = body.get('detail')
status, body = get('/v1/flows/video?page_size=1')
report['videoApi'] = {'httpStatus': status}
if status == 200:
    report['videoApi']['listAccessible'] = True
else:
    report['videoApi']['error'] = body.get('detail')
print(json.dumps(report, indent=2))
