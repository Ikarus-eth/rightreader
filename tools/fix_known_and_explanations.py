from pathlib import Path
p=Path('src/app-source.jsx')
s=p.read_text()

def repl(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s=s.replace(old,new,1)

repl(
'''const SHAPE='{"span":"...","lemma":"...","sense":"a 1-3 word label for which meaning this is","pron":"kid-friendly British-English pronunciation respelling using normal letters and hyphens; CAPITALISE the stressed syllable; no IPA symbols; example: massacre -> MASS-uh-kuh","also":["0-2 short English phrases naming OTHER common, clearly different meanings; empty array if not ambiguous"],"alsoDe":["German for each phrase in also, same order and count"],"en":"one very simple English sentence, max 14 easy words, explaining what it means HERE","de":"the German translation as used here, 1-3 words","deDesc":"one simple German sentence, max 14 words, explaining it"}';''',
'''const EXPLAIN_VERSION=2;\nconst SHAPE='{"span":"...","lemma":"...","sense":"a 1-3 word label for which meaning this is","pron":"kid-friendly British-English pronunciation respelling using normal letters and hyphens; CAPITALISE the stressed syllable; no IPA symbols; example: massacre -> MASS-uh-kuh","also":["0-2 short English phrases naming OTHER common, clearly different meanings; empty array if not ambiguous"],"alsoDe":["German for each phrase in also, same order and count"],"en":"a direct mini-dictionary definition in one very simple English sentence, max 14 easy words","de":"the German translation as used here, 1-3 words","deDesc":"one simple German sentence, max 14 words, explaining it"}';''',
'shape version')

repl(
'''    `Explain ONLY the meaning it has in THIS sentence, even if that is not its most common meaning. ${LEMMA_RULE}`,\n    `Reply with ONLY one single-line JSON object, no markdown:`,''',
'''    `Explain ONLY the meaning it has in THIS sentence, even if that is not its most common meaning. ${LEMMA_RULE}`,\n    `For "en", write a real child-friendly dictionary definition of the word itself. Do NOT paraphrase the story sentence, do NOT make up a new example sentence, and do NOT mention story characters or objects unless they are essential to the meaning. Use easier words than the tapped word. Good style for "fussy": "not happy unless things are just how you want them."`,\n    `Reply with ONLY one single-line JSON object, no markdown:`,''',
'word prompt quality')

repl(
'''    `Explain that word as simply as you possibly can, simpler than the sentence it came from, using only very easy words. ${LEMMA_RULE}`,\n    `Set "span" to just the word.`,''',
'''    `Explain that word as simply as you possibly can, simpler than the sentence it came from, using only very easy words. ${LEMMA_RULE}`,\n    `For "en", give a direct mini-dictionary definition of the word itself, not another example sentence and not a paraphrase of the explanation.`,\n    `Set "span" to just the word.`,''',
'nested prompt quality')

repl(
'''    `For each give: "word" (exactly as listed), "lemma", "sense" (1-3 word label), "pron" (kid-friendly British-English pronunciation respelling using normal letters and hyphens; CAPITALISE the stressed syllable; no IPA symbols; example: massacre -> MASS-uh-kuh), "also" (0-2 short English phrases naming other common, clearly different meanings; empty array if not ambiguous), "alsoDe" (German for each, same order and count), "en" (one very simple English sentence, max 14 easy words), "de" (German translation, 1-3 words), "deDesc" (one simple German sentence, max 14 words).`,''',
'''    `For each give: "word" (exactly as listed), "lemma", "sense" (1-3 word label), "pron" (kid-friendly British-English pronunciation respelling using normal letters and hyphens; CAPITALISE the stressed syllable; no IPA symbols; example: massacre -> MASS-uh-kuh), "also" (0-2 short English phrases naming other common, clearly different meanings; empty array if not ambiguous), "alsoDe" (German for each, same order and count), "en" (a direct mini-dictionary definition in one very simple English sentence, max 14 easy words; NOT a paraphrase of the story sentence and NOT a new example sentence), "de" (German translation, 1-3 words), "deDesc" (one simple German sentence, max 14 words).`,''',
'batch prompt quality')

repl(
'''                <button className="btn btn-ghost" style={{width:"100%",marginTop:9}}\n                  onClick={onRemove}>Remove underline</button>''',
'''                <button className="btn btn-ghost" style={{width:"100%",marginTop:9}}\n                  onClick={onRemove}>I know this word</button>''',
'button label')

repl(
'''    const missingPron=!!(entry&&entry.senses.some(x=>!String(x.pron||"").trim()));\n    bump(cacheKey);''',
'''    const missingPron=!!(entry&&entry.senses.some(x=>!String(x.pron||"").trim()));\n    const staleExplanation=!!(entry&&entry.senses.some(x=>(x.ev||0)<EXPLAIN_VERSION));\n    bump(cacheKey);''',
'open stale declaration')

repl(
'''    if(!entry||!entry.senses.length||missingPron){''',
'''    if(!entry||!entry.senses.length||missingPron||staleExplanation){''',
'open stale condition')

repl(
'''      const havePron=!!(have&&have.senses.length&&have.senses.every(x=>String(x.pron||"").trim()));\n      if(havePron||knownSet.has(key)) continue;''',
'''      const haveFresh=!!(have&&have.senses.length&&have.senses.every(x=>String(x.pron||"").trim()&&(x.ev||0)>=EXPLAIN_VERSION));\n      if(haveFresh||knownSet.has(key)) continue;''',
'prefetch fresh check')

repl(
'''        if(havePron) continue;''',
'''        if(haveFresh) continue;''',
'prefetch expression fresh')

repl(
'''            add.push([m.key,{span:m.w,lemma:String(r.lemma||m.w),sense:String(r.sense||""),\n              pron:String(r.pron||""),en:String(r.en||""),de:String(r.de||""),deDesc:String(r.deDesc||""),''',
'''            add.push([m.key,{span:m.w,lemma:String(r.lemma||m.w),sense:String(r.sense||""),ev:EXPLAIN_VERSION,\n              pron:String(r.pron||""),en:String(r.en||""),de:String(r.de||""),deDesc:String(r.deDesc||""),''',
'prefetch version')

repl(
'''      const d={span:String(j.span||surface),lemma:String(j.lemma||surface),sense:String(j.sense||""),\n        pron:String(j.pron||""),en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),''',
'''      const d={span:String(j.span||surface),lemma:String(j.lemma||surface),sense:String(j.sense||""),ev:EXPLAIN_VERSION,\n        pron:String(j.pron||""),en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),''',
'live version')

repl(
'''          const d={span:String(j.span||word),lemma:String(j.lemma||word),sense:String(j.sense||""),\n            pron:String(j.pron||""),en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),''',
'''          const d={span:String(j.span||word),lemma:String(j.lemma||word),sense:String(j.sense||""),ev:EXPLAIN_VERSION,\n            pron:String(j.pron||""),en:String(j.en||""),de:String(j.de||""),deDesc:String(j.deDesc||""),''',
'nested version')

# Make the cache refresh text accurate now that quality versioning also triggers it.
repl(
'''    /* Older cache entries are still useful for meaning,\n       but they cannot satisfy the kid-friendly pronunciation UI. Refresh them once on tap;\n       mergeSense updates the existing sense rather than duplicating it. */''',
'''    /* Older cache entries are still useful for meaning, but they may lack the\n       child-friendly pronunciation or use the old weak explanation prompt. Refresh\n       them once on tap; mergeSense updates the existing sense rather than duplicating it. */''',
'cache comment')

p.write_text(s)

sw=Path('sw.js')
t=sw.read_text()
if 'const VERSION = "rr-v9";' not in t:
    raise SystemExit('unexpected service-worker version')
sw.write_text(t.replace('const VERSION = "rr-v9";','const VERSION = "rr-v10";',1))

r=Path('README.md')
text=r.read_text()
text=text.replace('Current service-worker cache for this release: `rr-v9`.','Current service-worker cache for this release: `rr-v10`.')
text += '\n\n### Explanation quality\n\nWord explanations are direct mini-dictionary definitions, not paraphrases of the story sentence. Cached explanations from the older prompt are refreshed once when tapped. The child popup also includes **I know this word**, which clears the seen/saved state for the whole word family.\n'
r.write_text(text)

print('patch applied')
