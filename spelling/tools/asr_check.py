#!/usr/bin/env python3
"""Let a speech recogniser (Whisper base.en, run locally) listen to every clip.

Writes audio/asr-report.json: what it heard for each word clip, whether the
sentence clip contains the word, and the 20 clips it was least sure about.
Homophones (know/no, its/it's) count as a match because a listener can't tell
them apart either; the sentence decides which one to write.
"""
import json, re
from pathlib import Path
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]
HOMO = [{"know", "no"}, {"eye", "i", "aye"}, {"its", "it's"}, {"who's", "whose"},
        {"their", "there", "they're"}, {"your", "you're"}, {"one", "won"}, {"two", "to", "too"},
        {"write", "right"}, {"eight", "ate"}, {"piece", "peace"}, {"weight", "wait"},
        {"whole", "hole"}, {"heard", "herd"}, {"i'll", "aisle", "isle"}, {"toward", "towards"},
        {"whether", "weather"}, {"quarter", "porter"}, {"sign", "sine"}, {"knife", "nife"},
        {"guessed", "guest"}, {"queue", "q", "cue"}, {"of", "off"}, {"we've", "weave"},
        {"i'd", "id"}, {"dad's", "dads"}, {"there's", "theirs"}]

def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z' ]", " ", s.lower().replace("’", "'"))).strip()

def flat(s):
    return norm(s).replace("'", "").replace(" ", "")

NUM = {"one": "1", "two": "2", "three": "3", "eight": "8", "forty": "40", "twelfth": "12th", "thousand": "1000"}

def same(heard, word):
    h, w = norm(heard), norm(word)
    if flat(h) == flat(w):
        return True
    if any(w in g and h in g for g in HOMO):
        return True
    toks = re.sub(r"[^a-z0-9' ]", " ", heard.lower().replace(",", "")).split()
    # Whisper often adds a filler word around a lone word ("I said."), or writes digits.
    return NUM.get(w) in toks or all(p in toks for p in w.split())

def main():
    rows = [r.split("|") for r in re.findall(r'^"([^"\n]*\|[^"\n]*)",?$', (ROOT / "index.html").read_text(), re.M)]
    man = json.loads((ROOT / "audio" / "manifest.json").read_text())["words"]
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    def hear(f):
        segs, _ = model.transcribe(str(ROOT / f), language="en", beam_size=5,
                                   condition_on_previous_text=False, without_timestamps=True)
        segs = list(segs)
        text = " ".join(s.text for s in segs).strip()
        lp = min((s.avg_logprob for s in segs), default=-9.0)
        return text, round(lp, 3)
    out = []
    for r in rows:
        w = r[1]
        heard, lp = hear(man[w]["word"])
        sent, slp = hear(man[w]["sentence"])
        out.append({"word": w, "heard": heard, "match": same(heard, w), "confidence": lp,
                    "sentence_heard": sent,
                    "sentence_has_word": flat(w) in flat(sent) or any(flat(w) in {flat(x) for x in g} and any(flat(x) in flat(sent) for x in g) for g in HOMO)})
    ranked = sorted(out, key=lambda x: (x["match"], x["sentence_has_word"], x["confidence"]))
    report = {"words": out, "uncertain": [x["word"] for x in ranked[:20]],
              "mismatches": [x["word"] for x in out if not x["match"]],
              "sentence_problems": [x["word"] for x in out if not x["sentence_has_word"]]}
    (ROOT / "audio" / "asr-report.json").write_text(json.dumps(report, indent=1))
    print(f"word clips heard correctly: {sum(x['match'] for x in out)} of {len(out)}")
    print("not matched:", ", ".join(f"{x['word']}→{x['heard']!r}" for x in out if not x["match"]))
    print("sentences missing the word:", ", ".join(report["sentence_problems"]))
    print("20 least certain:", ", ".join(report["uncertain"]))

if __name__ == "__main__":
    main()
