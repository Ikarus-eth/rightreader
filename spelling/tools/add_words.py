#!/usr/bin/env python3
"""Record clips for words that have no audio yet (new words added to the list).

Runs on the GitHub runner with Kokoro (same model and voice, af_heart): no fal.ai cost.
- Sentence: read as is.
- Word: read after a lead-in ("Here is the next word. tough.") and cut at the pause,
  because Kokoro garbles very short input. If the speech recogniser doesn't hear the
  word correctly that way, the plain reading is tried and whichever it hears is kept.
Writes audio/review.json listing the new words the recogniser still wasn't sure about.
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import local_voice as lv
import asr_check as asr
from fix_words import cut_after_pause, LEAD
from faster_whisper import WhisperModel

ROOT = lv.ROOT

def synth(text, speed):
    old = lv.SPEED
    lv.SPEED = speed
    try:
        return lv.synth(text)
    finally:
        lv.SPEED = old

def main():
    man_path = ROOT / "audio" / "manifest.json"
    manifest = json.loads(man_path.read_text())
    todo = [w for w in lv.words() if w["word"] not in manifest["words"]]
    print(f"{len(todo)} words without audio")
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    def heard(path):
        segs, _ = model.transcribe(str(path), language="en", beam_size=5,
                                   condition_on_previous_text=False, without_timestamps=True)
        return " ".join(s.text for s in segs).strip()
    d = ROOT / "audio" / lv.VOICE
    unsure, details = [], []
    for w in todo:
        word, s = w["word"], lv.slug(w["word"])
        sent = d / f"{s}-sentence.mp3"
        lv.to_mp3(synth(w["sentence"], 1.0), sent)
        dest = d / f"{s}-w2.mp3"
        text = word + "."
        clip = cut_after_pause(synth(f"{LEAD} {text}", lv.SPEED))
        tried = []
        if clip is not None:
            lv.to_mp3(clip, dest); h = heard(dest); tried.append(("lead-in", h))
        if clip is None or not asr.same(h, word):
            plain = d / f"{s}-plain.mp3"
            lv.to_mp3(synth(text, lv.SPEED), plain); hp = heard(plain); tried.append(("plain", hp))
            if clip is None or (asr.same(hp, word) and not asr.same(h, word)):
                plain.replace(dest); h = hp
            else:
                plain.unlink()
        sh = heard(sent)
        ok_word, ok_sent = asr.same(h, word), asr.flat(word) in asr.flat(sh)
        if not ok_word or not ok_sent:
            unsure.append(word)
        details.append({"word": word, "tried": tried, "kept_heard": h, "sentence_heard": sh, "word_ok": ok_word, "sentence_ok": ok_sent})
        manifest["words"][word] = {"word": f"audio/{lv.VOICE}/{dest.name}", "sentence": f"audio/{lv.VOICE}/{sent.name}"}
        man_path.write_text(json.dumps(manifest, indent=1))
    review = unsure[:20]
    if len(review) < 10:   # always give a short sample to listen to
        review += [w["word"] for w in todo if w["word"] not in review][: 10 - len(review)]
    (ROOT / "audio" / "review.json").write_text(json.dumps(
        {"title": "Check the new words", "intro": "New recordings. The first ones listed are those the computer was least sure about. Reply in the chat with the numbers that sound wrong.",
         "review": review, "unsure": unsure, "details": details}, indent=1))
    print("recorded:", len(todo), "| recogniser unsure about:", ", ".join(unsure) or "none")
    for x in details:
        if x["word"] in unsure:
            print(f'  {x["word"]}: word heard {x["kept_heard"]!r} (tried {x["tried"]}), sentence heard {x["sentence_heard"]!r}')
    print("fal.ai cost $0")

if __name__ == "__main__":
    main()
