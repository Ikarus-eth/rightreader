#!/usr/bin/env python3
"""Re-record word clips that came out garbled, giving the voice some context.

Kokoro tends to garble very short inputs (a lone "yellow." came out like
"you tell her"). Here each word is read after a short lead-in sentence,
"Here is the next word. yellow.", and only the word after the pause is kept.

Which words change:
  - every word listed as broken in voice-request.json (heard by a person), and
  - any other word the speech recogniser mishears now but hears correctly in
    the new version.
Everything else keeps its current clip. Runs on the GitHub runner: no fal.ai cost.
"""
import json, re, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
import local_voice as lv          # same Kokoro pipeline, voice and speed
import asr_check as asr

ROOT = lv.ROOT
SR = 24000
LEAD = "Here is the next word."

def cut_after_pause(audio):
    """Keep what follows the longest pause (the gap between lead-in and word)."""
    frame = int(0.01 * SR)
    n = len(audio) // frame
    rms = np.sqrt(np.mean(audio[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms / (rms.max() + 1e-12))
    voiced = db > -40
    idx = np.where(voiced)[0]
    first, last = idx[0], idx[-1]
    best, best_len, run_start = None, 0, None
    for i in range(first, last + 1):
        if not voiced[i]:
            run_start = i if run_start is None else run_start
        elif run_start is not None:
            if i - run_start > best_len:
                best, best_len = i, i - run_start
            run_start = None
    if best is None or best_len < 12:          # no clear pause (<120 ms): give up on this word
        return None
    start = max(0, (best - 3) * frame)         # keep 30 ms before the word starts
    word = audio[start:]
    return word if len(word) > 0.2 * SR else None

def main():
    req = json.loads((ROOT / "voice-request.json").read_text())
    broken = set(req.get("broken", []))
    man_path = ROOT / "audio" / "manifest.json"
    manifest = json.loads(man_path.read_text())
    from faster_whisper import WhisperModel
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    def heard(path):
        segs, _ = model.transcribe(str(path), language="en", beam_size=5,
                                   condition_on_previous_text=False, without_timestamps=True)
        return " ".join(s.text for s in segs).strip()
    changed, kept_broken, results = [], [], []
    d = ROOT / "audio" / lv.VOICE
    for w in lv.words():
        word = w["word"]
        cur = ROOT / manifest["words"][word]["word"]
        cur_heard = heard(cur)
        cur_ok = asr.same(cur_heard, word)
        if cur_ok and word not in broken:
            continue
        text = word if word.endswith((".", "!", "?")) else word + "."
        clip = cut_after_pause(lv.synth(f"{LEAD} {text}"))
        if clip is None:
            if word in broken: kept_broken.append(word)
            continue
        new = d / f"{lv.slug(word)}-w2.mp3"     # new name, so iPads don't replay a cached copy
        lv.to_mp3(clip, new)
        new_heard = heard(new)
        new_ok = asr.same(new_heard, word)
        results.append({"word": word, "before": cur_heard, "after": new_heard, "after_ok": new_ok, "reported_broken": word in broken})
        if word in broken or new_ok:
            if cur.name != new.name:
                cur.unlink(missing_ok=True)
            manifest["words"][word]["word"] = f"audio/{lv.VOICE}/{new.name}"
            changed.append(word)
        else:
            new.unlink()
    man_path.write_text(json.dumps(manifest, indent=1))
    (ROOT / "audio" / "fix-report.json").write_text(json.dumps(
        {"changed": changed, "broken_not_fixed": kept_broken, "details": results}, indent=1))
    print("changed:", ", ".join(changed))
    for r in results:
        print(f'  {r["word"]}: before {r["before"]!r} → after {r["after"]!r}{"  (reported)" if r["reported_broken"] else ""}')
    if kept_broken:
        print("could not cut cleanly:", ", ".join(kept_broken))
    print("fal.ai cost $0")

if __name__ == "__main__":
    main()
