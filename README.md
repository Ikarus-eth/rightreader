# Right Reader

An EPUB reader for a ten-year-old reading English as a second language,
with German as her first. Tap any word and get a very simple English
explanation; tap a word inside that explanation and get that explained
too; press one button for the German. Words she decides are new go into
a list that is already shaped for spaced repetition.

No server. No Cloudflare Worker. The site is static files on GitHub
Pages and it calls the Anthropic API straight from the browser.

---

## Setup

Three steps, about ten minutes, most of it waiting for Pages to build.

### 1. Turn on GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a
branch** → Branch: **main**, folder: **/ (root)** → Save.

Wait a minute or two, then open
`https://ikarus-eth.github.io/rightreader/` in a browser to check it
loads. It will show an empty library. That is correct.

### 2. Get an API key, and cap it

1. console.anthropic.com → API Keys → Create Key. Copy it now, it is
   shown once.
2. Settings → Billing. Load **$10**. That is many months of reading.
3. **Turn auto-reload OFF.** This is the actual safety net. With
   auto-reload off you cannot spend more than what you loaded, whatever
   happens to the key. Nothing technical protects you as well as this.

Use a key that is only ever used by this app, so you can revoke it
without breaking anything else.

### 3. Put it on the iPad

1. Open the site in **Safari** on her iPad. Must be Safari.
2. Share icon → **Add to Home Screen** → Add.
3. Open it from the home screen. Tap the **⚙︎** (top right) → **Einstellungen**
   → paste the API key → Speichern.

The key lives in that iPad's browser storage and nowhere else. It is
never in this repository.

### 4. Add books

On your Mac, put DRM-free `.epub` files in an iCloud Drive folder. They
will appear in **Files** on her iPad. In the app: **+ Buch hinzufügen**
→ Files → pick the file. Once imported the book is stored on the device
and she never picks it again.

There is no way to share a file *into* a web app on iOS — Web Share
Target is Android only — so importing through the picker is the whole
mechanism. It is two taps, once per book.

---

## How it works

### Word lookup

Two paths, chosen by cost:

- **Prefetch.** When a chapter opens, everything in it worth explaining
  is resolved in the background in batches of twelve on Haiku, so taps
  are instant. Three filters decide what qualifies: not already known,
  not in the commonest 3,500 English words, not a proper noun. On a real
  children's novel this is about 3% of the running text.
- **Live.** Anything the prefetcher missed is fetched on tap with Sonnet,
  which takes two or three seconds.

Explanations are cached across books, so the second book costs
noticeably less than the first.

### Phrasal verbs

Tapping "put" in "put up with" and being told what "put" means is worse
than useless. A bundled list of about 900 phrasal verbs and 130 idioms
(with inflected forms, so "putting up with" matches too) flags candidate
spans as the chapter renders. The list only ever *proposes*: it cannot
tell "look after the cat" from "look at the cat", so the model gets the
sentence and the candidate and decides whether the words are working as
a unit here or just sitting next to each other. Same call, no extra cost.

When the phrase is real, all its words light up in the text for a moment.
That highlight is half the lesson.

### Saving words

She taps **＋ Neues Wort** on the ones she decides are new. Nothing is
saved automatically.

But every lookup is counted quietly. Children over-rate their own recall,
so the words she skips are often the half-known ones that are worth the
most. From the third lookup of the same word the sheet says so, and the
parent screen has a list of everything looked up repeatedly and never
saved, with a button to add it yourself.

Saved words carry FSRS-4.5 fields (stability, difficulty, due date) from
the first moment, so the practice game can be switched on later without
migrating anything.

### Reading time

Elapsed time is not reading time. The clock runs only while the app is
in front and something has been scrolled or tapped in the last 90
seconds, and on top of that a stretch of time can only earn as much
credit as the text that has actually gone past allows:

```
earned   = words scrolled past / floor_wpm  +  time in word popups
credited = min(elapsed, earned)
```

The popup term matters. Six lookups on a page is two minutes of real
work and no scrolling at all, and a plain words-per-minute cap would
punish exactly the behaviour this app exists to encourage. Capped at 45
seconds per lookup so an abandoned popup cannot run the clock either.

`floor_wpm` is measured, not guessed. A number for a German ten-year-old
reading English would have been a guess, and she gets faster over a year
anyway. It sits at a permissive 50 until there are three real sessions,
then settles at 40% of her own observed median.

Target is 20 minutes on 5 days a week; the ring in the reading view and
the bars on the parent screen both track it.

### Display and read-aloud

**Aa** in the reading view: font size 16–30, three line spacings, serif or
sans, and paper / light / night backgrounds. All persisted.

**☰** opens the table of contents so she can jump to any chapter instead
of stepping through one at a time.

**Long-press any paragraph to hear it read aloud.** A tap already means
"explain this word", so listening is a press. The paragraph highlights
while it speaks. Being read to is the single most-praised feature of
Epic for second-language readers, and a sentence she can decode word by
word is still a sentence she cannot hear the shape of.

### Her word list

The 📓 on the library screen. Every word she saved, with the German, the
simple English, and the sentence from the book it came from, each with a
speaker button. Without it the ＋ button was a request with no reply.

### Parent screen

The ⚙︎ in the top right. Reading time by day, the 5×20 target, the saved
word list, the looked-up-but-not-saved list, estimated spend for the last
30 days, the API key field, and export/import.

No streaks. A streak converts reading into a number she is servicing,
which is the opposite of the point. Say the word if you disagree and
I'll add one.

---

## Cost

Measured on *The Great Hamster Massacre* (20,172 words, 20 chapters):
**606 words and 137 expressions worth explaining, about $0.45 to
prefetch the whole book.** At 20 minutes a day, five days a week, she
reads roughly one novel a month, so budget **$1–2/month**, falling as
the shared explanation cache fills.

`DAILY_CALL_CAP` in `config.js` is a hard ceiling on requests per day
from the device. A runaway loop stops there rather than at your balance.

---

## Editing it later

- **`config.js`, `manifest.json`, icons** — edit, commit, push. Live
  immediately, no rebuild.
- **App behaviour** — everything is in `src/app-source.jsx`. It has to be
  rebuilt into `app.js`:

  ```
  cd src && npm install
  npx esbuild entry.jsx --bundle --minify --outfile=../app.js \
    --loader:.jsx=jsx --loader:.json=json \
    --define:process.env.NODE_ENV='"production"'
  ```

  Or describe the change and I'll rebuild it.

---

## Storage, and the one real risk

Books live in IndexedDB, everything else in `localStorage` under `rr_`.
Nothing leaves the iPad. A service worker (`sw.js`) caches the app shell,
so reading works with no connection at all; only word lookups need one.
Bump `VERSION` in `sw.js` on any deploy that changes `index.html` or
`app.js`, or the old version keeps being served.

Safari clears script-writable storage more aggressively than other
browsers, and home-screen web apps are treated differently from tabs in
ways I could not verify from here. The app asks for persistent storage
on first run, but support for that request is uneven. **Books can be
re-imported; the word list and reading history cannot.** Export from the
parent screen every few weeks and drop the file in iCloud.

---

## What was tested, and what wasn't

Tested against your actual EPUB in a headless DOM: metadata, spine, NCX
table of contents, cover extraction, all 20 chapters rendered, 20,316
tap targets tokenised, 393 phrasal-verb spans marked, contractions kept
whole, images rewritten to blob URLs, links neutralised, prefetch triage.
The built bundle mounts and renders.

That EPUB writes `<a id="page_1"/>` self-closing. HTML parsing ignores
self-closing syntax on non-void elements, so those anchors stayed open
and the parser's adoption-agency algorithm pulled the following
paragraphs inside them. The chapter still rendered; it had silently lost
a third of its paragraphs. Fixed by closing such tags in the source
string before parsing. Worth knowing about because it will be true of
most published EPUB 2 fiction, and it fails quietly.

Not tested from here, because it needs the real thing: an actual iPad,
an actual API key, Safari's storage behaviour, iOS speech synthesis
voices, and the scroll-position maths against real touch scrolling. The
first real session is the test. Tell me what breaks.
