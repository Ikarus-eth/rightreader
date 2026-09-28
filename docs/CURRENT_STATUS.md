# RightReader current status

## Original reader

The default app at `/rightreader/` remains the EPUB vocabulary reader. Its runtime, service worker, IndexedDB books and save format are unchanged by the Moonflower pilot.

## Moonflower phonics pilot — 28 September 2026

Build `moonflower-20260928-r8` is implemented and locally tested; production verification is pending. It supersedes r7’s 24-entry teaching set. The existing GitHub Pages route is [the pilot URL](https://ikarus-eth.github.io/rightreader/phonics/).

### Implemented

- All story and chapter-title words are tappable, including **Before the Dark** and **One Small Stone**.
- All **265 distinct story/title words** have sound breakdowns. With anchors and practice examples, all **313 available words** have both authored breakdowns and George recordings.
- **44 unique sound anchors**: 24 consonants and 20 vowels from the traditional British-English inventory. Each has its own icon and anchor word. Existing anchors are preserved: sun is /s/ and up is /ʌ/. Book menu → Sound pictures opens the full guide.
- The story uses **43 of those 44 sounds**. Only traditional /ʊə/ (cure) is absent; cure is included in the guide with an accent-variation note. See [the complete coverage table](PHONICS_COVERAGE.md).
- Silent letters, split vowel spellings and multiple sounds within one spelling group are represented explicitly. Stone has four sounds and linked o…e tiles; would has three sounds with silent l; fox has four sounds with x mapped to /k/ then /s/.
- Artus is ar | t | u | s (/ɑː t ə s/), targeting the current English recording per the user’s decision. Through remains th | r | ough (/θ r uː/), with no extra g or h sounds.
- Related words prioritize matching spellings and sounds. Tapping a related word now opens its own breakdown. Through uses two example sentences rather than unrelated spelling-family examples.
- Picture buttons play the **whole anchor word**, not an isolated phoneme. Cues identify the relevant sound.
- The full book retains 25 illustrations and 587 body-word occurrences. The reflowable EPUB preserves every paragraph and illustration and remains downloadable from the book menu.
- My words saves help requests, with an optional three-word review and no score or mastery claim. Rhyme time uses light/night/bright.
- Reading position, text size and help history keep the existing `rrp_moonflower_v1` save key. Backup and restore remain available. The pilot worker controls only `/phonics/`, and the offline cache advances to v8.

### Audio

All 313 active clips use George (`JBFqnCBsd6RMkjVDRZzb`) and `eleven_multilingual_v2`, with content-hash URLs. Missing audio never switches to another voice. The r8 preparation added 14 missing title/anchor words and one context-guided retake of close, with “Stay” supplied as preceding context for the story’s nearby meaning.

[Audio preparation run 36390990313](https://github.com/Ikarus-eth/rightreader/actions/runs/36390990313) completed successfully, including full content validation and decoding all 313 recordings. This run reported **43 credits**, for a cumulative **948 credits**, including 3 credits for the retired close clip. The original 11 samples remain in use. The credit report and provenance preserve costs; the earlier subscription counter did not independently confirm balance deductions.

The generator saves each completed recording immediately, skips already prepared matching clips, does not retry speech requests automatically and enforces the previously approved 1,100-credit total ceiling. The repository secret `ELEVENLABS_API_KEY1` is exposed only to the generation step in GitHub Actions; it is not shipped to the website. Generation is manual and constrained to the audio staging branch.

### Validation and limits

The content validator checks all 313 mappings and recordings, exact reconstruction of every spelling, valid linked tiles, phoneme counts, all 44 anchors and their distinct icons/words, coverage of every story/title/related word, audio hashes and one voice/model. Regression cases include Artus, before, through, stone, fox, little, one, whole, close, smooth and would. All 313 MP3s decode locally and in Actions. JavaScript syntax and all four existing service-worker range/cache tests pass.

Local Chrome checks cover tappable chapter titles, Artus’s four-sound map and schwa hint, before’s new recording, all 44 unique guide cards, linked o…e in stone and the two x sounds in fox, plus silent l in would. The complete offline pack downloads successfully. Additional browser and public-deployment results are recorded in `MOONFLOWER_DEPLOYMENT.json` after verification.

The EPUB and illustrations are unchanged from the previously verified release: EPUBCheck 5.4.0 passed with zero errors/warnings; all 25 EPUB paragraphs and illustrations match the reader. Physical iPad/Safari and a complete human listening review remain outstanding. Authored British phonemic maps and programmatic checks do not certify every nuance of a generated recording; proper names and accent variants warrant listening review.

### Outside this pilot

Arbitrary PDF/EPUB import into phonics mode, automatic phonics diagnosis, speech scoring, a complete curriculum covering every English spelling, isolated-phoneme recordings, generated song performances and animated illustrations are not implemented. The original reader retains its own EPUB import.
