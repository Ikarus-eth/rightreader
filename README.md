# Right Reader

Right Reader is a deliberately simple EPUB reader for a 10-year-old German native speaker reading English at about A2/B1. The product idea is not “study vocabulary”; it is “English books cannot trap you.”

Tap a word and get its British-English IPA plus a very short, contextual explanation in easy English. Tap a harder word inside that explanation and get one more level of explanation. German is available only on request. A word can be saved explicitly for later spaced-repetition work.

## Architecture

- Static GitHub Pages site. No backend or proxy.
- Calls the OpenAI API directly from the browser.
- The API key is entered once in Parent settings and stored only in that iPad's localStorage.
- EPUBs are parsed with JSZip and rendered into native DOM, not an iframe, so word taps stay exact.
- Chapters are laid out as horizontal CSS columns: one screen-sized page at a time, with no vertical reader scrolling.
- Raw EPUB bytes live in IndexedDB. Other state lives under `rr_` keys in localStorage.
- A local list proposes phrasal verbs/idioms; the model decides whether the phrase is actually idiomatic in that sentence.
- Reading time is capped by words on pages actually reached plus time spent in word explanations. Leaving one page open does not keep earning time.

The browser-held API key is a conscious security tradeoff for a single-family prototype. Use a dedicated OpenAI project/key, a small prepaid balance, and no automatic recharge.

## Reading interaction

Right Reader behaves like an e-reader rather than a web page:

- Tap the **right side** to go forward one page.
- Tap the **left side** to go back one page.
- At the end of a chapter, another forward tap opens the first page of the next chapter.
- At the beginning of a chapter, a back tap opens the last page of the previous chapter.
- Tap an actual **word** to explain it. Word taps take priority over page turns.
- Hold a sentence to hear it read aloud.
- The current page is saved and restored when the book is reopened.
- Changing text size or rotating/reflowing preserves approximately the same place in the chapter.

The text column is inset from the screen edges to create clear page-turn gutters, so page taps and vocabulary taps do not fight each other.

## Visual identity

The app uses a warm illustrated-storybook look inspired by the kitten-and-butterfly artwork: parchment/cream backgrounds, deep leafy greens, golden accents, softer cards and controls, and a kitten-reading-a-butterfly-book app icon. The Home Screen, manifest and browser theme colors use the same palette.

## First setup on the iPad

1. Open the GitHub Pages site in Safari and add it to the Home Screen.
2. Open **Parent → Settings**.
3. Paste the dedicated OpenAI API key and tap **Save & test**.
4. The key is saved only if the API test succeeds.
5. Defaults:
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

The file input intentionally has no `accept=.epub` filter because iOS has historically mapped EPUB type identifiers inconsistently. Right Reader validates the extension after selection instead.

## Child experience

The top reading menu is hidden by default and appears when the top of the screen is tapped.

- No live `running / paused` status.
- No exact minute counter while reading.
- The library only shows **Reading done** once the daily target is reached.
- First reading session shows: **Tap a word to explain it. Tap the sides to turn the page. Hold a sentence to hear it.**
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

When a chapter opens, likely-difficult words are explained in background batches with `gpt-5.6-luna`. The app skips common words, known words, most proper nouns, contractions, headings, and front matter. Taps therefore usually feel instant.

## Saving words

Saving is explicit. A lookup does not automatically become homework. Saved entries already contain FSRS-4.5 scheduling fields so spaced repetition can be added later without a migration.

Repeated lookups are still counted quietly and remain visible in Parent settings, but the child is not nudged while reading.

## Reading-time accounting

The clock only advances while the app is visible and there has been activity within 90 seconds.

```text
earned   = words on pages reached / floor_wpm + time in word popups
credited = min(elapsed, earned)
```

A lookup can contribute at most 45 seconds. The starting floor is 50 WPM. Once there are enough real sessions, the floor adapts to 40% of her observed median reading speed.

Calendar keys use the iPad's local date, not UTC. Word counts accumulate across multiple reading sittings in the same day.

Target: 20 minutes on 5 days per week. Exact time history stays in Parent settings rather than in the reading view.

## Parent settings

Parent settings contains reading history, saved words, repeatedly looked-up unsaved words, API-key validation, model selection, estimated API spend, backup/restore, direct-URL EPUB import, and book deletion.

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

Whenever `index.html` or `app.js` changes, bump `VERSION` in `sw.js`; otherwise the Home Screen install can continue serving an older cached bundle.

Current service-worker cache for this release: `rr-v7`.

## OpenAI models and cost table

`config.js` currently uses these text-token prices per 1M tokens (checked 2026-09-06):

- GPT-5.6 Luna: $0.20 input / $1.20 output
- GPT-5.6 Terra: $2 input / $12 output
- GPT-5.6 Sol: $4 input / $20 output

The values are only for the on-device spend estimate; actual billing remains whatever OpenAI charges the project.
