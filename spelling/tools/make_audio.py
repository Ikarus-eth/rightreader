#!/usr/bin/env python3
"""Spelling audio via fal.ai Kokoro (US English), $0.02 per 1,000 characters.

  samples  -> 3 short voice samples (about 330 characters, under 1 cent)
  all      -> one clip per word and one per example sentence (about 7,000
              characters, about 15 cents). The app plays word, sentence, word,
              so the word clip is reused and "slowly" is done by playback speed.

Files that already exist are skipped, so a rerun never pays twice.
Needs FAL_KEY in the environment and ffmpeg on PATH.
"""
import json, os, re, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = "https://fal.run/fal-ai/kokoro/american-english"
SAMPLE_VOICES = ["af_heart", "am_michael", "af_bella"]
SAMPLE_TEXT = "necessary. Sun cream is necessary at the beach. necessary."

def words():
    html = (ROOT / "index.html").read_text()
    raw = re.findall(r'^"([^"\n]*\|[^"\n]*)",?$', html, re.M)
    out = [dict(zip(["word", "meaning", "de", "sentence", "tip"], r.split("|"))) for r in raw]
    assert len(out) == 100, len(out)
    return out

def slug(w):
    return re.sub(r"[^a-z0-9]+", "-", w.lower()).strip("-")

def tts(text, voice, dest, spent):
    if dest.exists():
        return
    body = json.dumps({"prompt": text, "voice": voice, "speed": 1}).encode()
    req = urllib.request.Request(ENDPOINT, body, {
        "Authorization": "Key " + os.environ["FAL_KEY"], "Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                url = json.load(r)["audio"]["url"]
            break
        except Exception as e:
            if attempt == 2:
                raise
            print("retry", text[:30], e); time.sleep(4)
    spent[0] += len(text)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        urllib.request.urlretrieve(url, tmp.name)
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp.name, "-ac", "1",
                        "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                               "silenceremove=start_periods=1:start_threshold=-50dB,areverse",
                        "-b:a", "64k", str(dest)], check=True)
    print("ok", dest.relative_to(ROOT))

def main():
    mode = sys.argv[1]
    spent = [0]
    if mode == "samples":
        for v in SAMPLE_VOICES:
            tts(SAMPLE_TEXT, v, ROOT / "audio" / "samples" / f"{v}.mp3", spent)
    elif mode == "all":
        voice = sys.argv[2]
        manifest = {"voice": voice, "words": {}}
        for w in words():
            s = slug(w["word"])
            tts(w["word"], voice, ROOT / "audio" / voice / f"{s}.mp3", spent)
            tts(w["sentence"], voice, ROOT / "audio" / voice / f"{s}-sentence.mp3", spent)
            manifest["words"][w["word"]] = {"word": f"audio/{voice}/{s}.mp3",
                                            "sentence": f"audio/{voice}/{s}-sentence.mp3"}
        (ROOT / "audio" / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"characters billed this run: {spent[0]} (about ${spent[0] * 0.00002:.3f})")

if __name__ == "__main__":
    main()
