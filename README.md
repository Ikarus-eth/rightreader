# Right Reader

An EPUB reader for a ten-year-old reading English as a second language,
with German as her first. Tap any word and get a very simple English
explanation; tap a word inside that explanation and get that explained
too; press one button for the German. Words she decides are new go into
a list that is already shaped for spaced repetition.

No server. No Cloudflare Worker. The site is static files on GitHub
Pages and it calls the OpenAI API straight from the browser.

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

1. platform.openai.com → **API keys** → *Create new secret key*. Name it
   `right-reader`. Copy it now, it is shown once. It starts with `sk-`.
2. **Billing** → add a payment method → add **$10** of credit.
3. **Turn auto-recharge OFF.** This is the actual safety net. With it off
   you cannot spend more than what you loaded, whatever happens to the
   key. Nothing technical protects you as well as this does.

Use a key that only this app ever uses, so you can revoke it without
breaking anything else.

### 3. Put it on the iPad

1. Open the site in **Safari** on her iPad. Must be Safari.
2. Share icon → **Add to Home Screen** → Add.
3. Open it from the home screen. Tap **⚙︎** (top right) → **Einstellungen**
   → paste the API key → **Speichern & testen**.

That button does more than save. It calls the API and pulls back the list
of models your account can actually use, then lets you pick the two the
app uses from a dropdown. The names in `config.js` are my best guess at
current model IDs and may well be wrong; this is how you fix them without
guessing again.

The key lives in that iPad's browser storage and nowhere else. It is
never in this repository.

### 4. Add books

On your Mac, make a folder inside **iCloud Drive** called `Junas Bücher`
and put DRM-free `.epub` files in it. It appears in **Files** on her iPad
within a minute or two.

Then, on the iPad, **inside Right Reader**: **+ Buch hinzufügen** →
*Datei auswählen* → iCloud Drive → Junas Bücher → tap the book. Once
imported it lives on the device and is never picked again.

**Do not tap the .epub in the Files app.** iOS hands `.epub` to Apple
Books, Books copies it into a container no other app can read, and the
file is then invisible to this one. Same for AirDrop, and for Mail
attachments. The book has to be *sitting in Files* and *chosen from
inside the app*. There is no way around this: iOS has no mechanism for
sharing a file into a web app, because Web Share Target is Android only.

Any Files provider works, not just iCloud — Dropbox and Google Drive
show up in the same picker if their apps are installed.

### A shared library across devices

The parent screen has **Buch über einen Link laden**. Paste a direct URL
to an `.epub` and it downloads straight into the library, no Files app
involved. The host has to serve the file directly and allow CORS;
`raw.githubusercontent.com` does, iCloud and Dropbox *share links* do
not. Useful if you ever want one list of books that appears on more than
one device — but remember a public repo publishes whatever is in it.

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

### Which meaning

The cache holds a list of senses per word, not one explanation per word,
plus a memo of which sense won for which sentence. Otherwise the first
time "point" appeared the app learned one meaning and every later
"point" got it, right or wrong. What decides:

| on file | what happens |
|---|---|
| nothing yet | full lookup |
| one sense, not ambiguous | served instantly, no call |
| one sense, flagged ambiguous | served instantly, verified behind her, replaced only if wrong |
| two or more senses | short pick call first, then the right one |

The ambiguity flag costs nothing: the explanation already returns the
word's *other* common meanings, and an empty list is the model saying
this word only means one thing. Most words come back empty, which is why
most taps never trigger a check.

Serving first and verifying after is deliberate. A spinner on every
ambiguous word would tax a lot of correct answers to catch a few wrong
ones. When a correction does happen she sees a marked "in this sentence
it means this" rather than a silent swap.

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
**606 words and 137 expressions worth explaining.** On `gpt-5.6-luna`
at $0.20/$1.20 per million tokens that is **about $0.10 to pre-explain
the whole book.**

At 20 minutes a day, five days a week, she reads roughly one novel a
month, so budget well under **$1/month**, falling further as the shared
explanation cache fills across books.

`DAILY_CALL_CAP` in `config.js` is a hard ceiling on requests per day
from the device. A runaway loop stops there rather than at your balance.

### Switching provider

`PROVIDER` in `config.js` takes `"openai"` or `"anthropic"`. Both answer
cross-origin browser requests, which is what keeps this app serverless:
OpenAI echoes the page origin back in `access-control-allow-origin` and
accepts an `Authorization` header, Anthropic does the same behind its
`anthropic-dangerous-direct-browser-access` header. Both verified by
preflight, not assumed. Everything above the adapter — sense resolution,
phrase handling, prefetch triage — is provider-independent.

Newer OpenAI models renamed `max_tokens` to `max_completion_tokens`, and
reasoning models bill hidden thinking tokens against that same budget. The
app does not try to guess which family a model belongs to: if the API
rejects a parameter it drops that parameter for good and retries once, so
a wrong guess costs one rejected call ever rather than one per lookup.

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

Bugs found by testing rather than by reading. All were silent — the app
kept working and did the wrong thing:

**The anti-idling cap stopped working after the first chapter of a book.**
The credit budget was seeded from every chapter she had ever read in that
book, taken from stored progress. Opening chapter five on day two handed
the clock four chapters of credit before she read a word, so `earned` was
instantly over an hour and `min(elapsed, earned)` was just `elapsed`. The
feature you specifically asked for was doing nothing from day two onward.
It now banks words read in the current sitting only. Verified: with 26,400
words of prior progress on file, seven seconds of sitting still credits
zero.

**Credited and elapsed time were the same number.** Both got the credited
delta, so the measured reading speed was a function of the cap that the
speed itself sets, and the parent screen could never show the gap it
exists to show.

**A `visibilitychange` listener was added on every chapter change and
never removed.**

**The long press was cancelled by any pointer movement at all,** so on a
real touchscreen it would almost never fire. Now it tolerates 10px.

**iOS refuses speech synthesis not started from a user gesture,** and the
long press speaks from a timer, which does not count. Her first listen
would have silently done nothing. Now primed on first touch.

**A book with no recognisable chapter names opened on `spine[-1]`,** blank,
because `findIndex` returns `-1` and `-1 || 0` is `-1`.

**Turning the page during a prefetch meant the new chapter never got one,**
so every tap in it fell back to a slow live lookup.

**The word cache had no size limit,** because the trimming lived in a
function nothing called any more, and a failed write was silent. It now
trims by age and, on a quota error, drops the oldest half and retries.

Earlier, and equally silent:

React re-applies `dangerouslySetInnerHTML` on every render, and the
reading clock re-renders once a second. All 31 chapter nodes were being
replaced every second, which detached the span list used to measure
scroll progress. `getBoundingClientRect` on a detached node returns
zeros, so the measurement pinned itself to the end of the chapter and
the anti-idling cap stopped capping. The chapter is now written into the
DOM once per chapter and React is kept out of that subtree.

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
