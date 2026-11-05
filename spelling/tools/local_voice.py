#!/usr/bin/env python3
"""Record the single-word clips with Kokoro-82M on the GitHub runner itself.

Same model and voice as fal.ai's Kokoro endpoint (af_heart), but it runs on the
free GitHub Actions machine, so it costs nothing. Sentences are kept as they are.
Each word is read as its own short sentence ("important.") a little slower, so
the last sound isn't swallowed, and a short pause is kept at the end.
"""
import json, re, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parents[1]
VOICE = "af_heart"
SPEED = 0.9

def words():
    html = (ROOT / "index.html").read_text()
    raw = re.findall(r'^"([^"\n]*\|[^"\n]*)",?$', html, re.M)
    return [dict(zip(["level", "word", "meaning", "de", "sentence", "tip"], r.split("|"))) for r in raw]

def slug(w):
    return re.sub(r"[^a-z0-9]+", "-", w.lower()).strip("-")

pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")

def synth(text):
    parts = []
    for r in pipe(text, voice=VOICE, speed=SPEED):
        a = getattr(r, "audio", None)
        if a is None and isinstance(r, (tuple, list)):
            a = r[2]
        if a is None:
            continue
        parts.append(a.detach().cpu().numpy() if hasattr(a, "detach") else np.asarray(a))
    return np.concatenate(parts)

def to_mp3(audio, dest):
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        sf.write(tmp.name, audio, 24000)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp.name, "-ac", "1",
                        "-af", "silenceremove=start_periods=1:start_threshold=-60dB,areverse,"
                               "silenceremove=start_periods=1:start_threshold=-60dB,areverse,"
                               "apad=pad_dur=0.15",
                        "-b:a", "64k", str(dest)], check=True)

def main():
    d = ROOT / "audio" / VOICE
    man_path = ROOT / "audio" / "manifest.json"
    manifest = json.loads(man_path.read_text())
    ws = words()
    for i, w in enumerate(ws, 1):
        s = slug(w["word"])
        text = w["word"] if w["word"].endswith((".", "!", "?")) else w["word"] + "."
        dest = d / f"{s}-word.mp3"   # new name, so iPads don't replay a cached old clip
        to_mp3(synth(text), dest)
        (d / f"{s}.mp3").unlink(missing_ok=True)
        manifest["words"][w["word"]] = {"word": f"audio/{VOICE}/{dest.name}",
                                        "sentence": f"audio/{VOICE}/{s}-sentence.mp3"}
        if i % 25 == 0:
            print(f"{i}/{len(ws)} words recorded", flush=True)
    man_path.write_text(json.dumps(manifest, indent=1))
    print(f"done: {len(ws)} word clips, fal.ai cost $0")

if __name__ == "__main__":
    main()
