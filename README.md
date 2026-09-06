# Right Reader

Right Reader is a deliberately simple EPUB reader for a 10-year-old German native speaker reading English at about A2/B1. The product idea is not “study vocabulary”; it is “English books cannot trap you.”

Tap a word and get a very short, contextual explanation in easy English. Tap a harder word inside that explanation and get one more level of explanation. German is available only on request. A word can be saved explicitly for later spaced-repetition work.

## Architecture

- Static GitHub Pages site. No backend or proxy.
- Calls the OpenAI API directly from the browser.
- The API key is entered once in Parent settings and stored only in that iPad's localStorage.
- EPUBs are parsed with JSZip and rendered into native DOM, not an iframe, so word taps are exact.
- Raw EPUB bytes live in IndexedDB. Other state lives under `rr_` keys in localStorage.
- A local list proposes phrasal verbs/idioms; the model decides whether the phrase is actually idiomatic in that sentence.
- Reading time is capped by text actually scrolled past plus time spent in word explanations. Sitting on one page does not earn reading time.

The browser-held API key is a conscious security tradeoff for a single-family prototype. Use a dedicated OpenAI project/key, a small prepaid balance, and no automatic recharge. Do not distribute this architecture to other families as a production service.

## First setup on the iPad

1. Open the GitHub Pages site in Safari and add it to the Home Screen.
2. Open **Parent → Settings**.
3. Paste the dedicated OpenAI API key and tap **Save & test**.
4. The key is saved only if the API test succeeds.
5. Keep the default models unless there is a reason to change them:
   - `gpt-5.6-luna` for high-volume background prefetch.
   - `gpt-5.6-terra` for live contextual lookups.

## Mac → iPad book workflow

The clean setup is a shared iCloud Drive folder named **Juna Books**.

### One time

1. On the Mac, create **iCloud Drive/Juna Books**.
2. If Juna's iPad uses a different Apple Account, share that folder with her account.
3. On the iPad, accept the shared folder once and make sure iCloud Drive is enabled.

### For every new book

On the Mac, drag a DRM-free `.epub` into **Juna Books**.

On the iPad, Juna opens Right Reader and taps:

**Add a book → iCloud Drive → Juna Books → book**

Do not open the `.epub` from Files or AirDrop it as the normal workflow. iOS will typically hand it to Apple Books. Right Reader needs the file to be chosen from inside its own document picker. After import, Right Reader keeps its own copy in IndexedDB.

The file input intentionally has no `accept=.epub` filter. iOS has historically mapped EPUB type identifiers inconsistently and can otherwise show the file while greying it out. Right Reader validates the extension after selection instead.

## Child experience

The reading UI is intentionally quiet:

- No live `running / paused` status.
- No exact minute counter while reading.
- The library only shows **Reading done** once the daily target is reached.
- First reading session shows one small hint: **Tap a word to explain it. Hold a sentence to hear it.**
- Normal lookup sheet shows the word, its easy-English explanation, optional German, and **Save word**.
- Model checking/correction machinery and repeated-lookup nudges are hidden from the child.
- **My words** shows the English explanation first. German is collapsed behind a disclosure.

## Word lookup and sense handling

The cache stores multiple senses per word plus a memo of which sense fits which sentence.

| cache state | behavior |
|---|---|
| no sense | full contextual lookup |
| one unambiguous sense | serve immediately, no API call |
| one ambiguous sense | serve immediately, verify in background |
| multiple senses | use a short model call to choose the fitting sense |

The model prompt is explicitly for a 10-year-old German A2/B1 learner and asks for the meaning in the current sentence, using a maximum 14-word easy-English explanation.

## Prefetch

When a chapter opens, likely-difficult words are explained in background batches with `gpt-5.6-luna`. The app skips common words, known words, most proper nouns, contractions, headings, and front matter. Taps usually therefore feel instant.

## Saving words

Saving is explicit. A lookup does not automatically become homework. Saved entries already contain FSRS-4.5 scheduling fields so spaced repetition can be added later without a migration.

Repeated lookups are still counted quietly and remain visible in Parent settings, but the child is no longer nudged while reading.

## Reading-time accounting

The clock only advances while the app is visible and there has been interaction within 90 seconds.

```
earned   = words scrolled past / floor_wpm + time in word popups
credited = min(elapsed, earned)
```

A lookup can contribute at most 45 seconds. The starting floor is 50 WPM. Once there are enough real sessions, the floor adapts to 40% of her observed median reading speed.

Calendar keys use the iPad's **local date**, not UTC. Word counts are accumulated across multiple reading sittings in the same day.

Target: 20 minutes on 5 days per week. Exact time history stays in Parent settings rather than in the reading view.

## Parent settings

Parent settings contains:

- reading history and target progress;
- saved words;
- repeatedly looked-up but unsaved words;
- API key validation;
- model selection;
- estimated API spend;
- backup/restore;
- direct-URL EPUB import for hosts that serve the file with CORS;
- book deletion.

## Offline behavior and storage

The service worker caches the app shell. Imported books can therefore be read offline; word lookups still require network access.

Safari/iPadOS may clear site storage in some circumstances. Parent settings includes JSON export/import for vocabulary and reading history. EPUBs can simply be imported again.

## Build and deploy

App behavior lives in `src/app-source.jsx`. Build it into the root `app.js` with:

```sh
cd src
npm install
npm run build
```

`config.js` does not require rebuilding.

Whenever `index.html` or `app.js` changes, bump `VERSION` in `sw.js`; otherwise the Home Screen install can continue serving the previous cached bundle.

Current service-worker cache for this release: `rr-v5`.

## OpenAI models and cost table

`config.js` currently uses these text-token prices per 1M tokens (checked 2026-09-06):

- GPT-5.6 Luna: $0.20 input / $1.20 output
- GPT-5.6 Terra: $2 input / $12 output
- GPT-5.6 Sol: $4 input / $20 output

The values are only for the on-device spend estimate; actual billing remains whatever OpenAI charges the project.
