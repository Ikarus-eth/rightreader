# RightReader current status

## Original reader

The default app at `/rightreader/` remains the EPUB vocabulary reader. Its runtime, service worker, IndexedDB books and save format are unchanged by the Moonflower pilot.

## Moonflower phonics pilot — 29 September 2026

### R11 continuous story scenes — implemented and locally verified

Build `moonflower-20260929-r11` animates the original artwork on **pages 12, 15, 18, 20 and 24**. Continuous connected texture meshes move Artus's and Pip's heads, wings, tails and selected arms/cape; crows, foliage, water and warm light provide scene-specific background motion. Each scene runs for eight seconds on a forward page turn, eases back to the exact original still, and offers **Watch scene** to replay and **Read now** to skip. Direct page selection and reload stay readable. Missing assets, reduced motion or unavailable WebGL leave the original still.

All five pages were checked in the local browser, with tablet portrait, desktop landscape and phone layout checks. One eight-second tablet preview rendered 962 frames on this 120 Hz browser. Skip, automatic page-turn playback, restored word help and offline replay after stopping the server passed. Eleven automated tests and the full content verifier pass. The existing story, all 315 recordings, 44 anchors, EPUB, save key and original reader are unchanged. No image/video generation or paid API calls are used by these scenes. Deployment verification is pending. [Implementation and limitations](MOONFLOWER_ANIMATION.md).

### R10 character animation — deployed and verified (historical)

[Pages run 36410997355](https://github.com/Ikarus-eth/rightreader/actions/runs/36410997355) successfully deployed commit `d3a89648b12e185e22bb3c67e2e2cbe297d74d75`. All **22 checked public files** matched the tested source, including all five generated poses and the unchanged original-reader runtime. Live Chrome confirmed five decoded poses, automatic playback, a still ending and restored tappable text. Existing page-one position and two-word history count were preserved after the check. Offline playback also passed after stopping the local preview server. Seven automated checks and the full content verifier passed.

Build `moonflower-20260928-r10` adds five ChatGPT-generated 2D head poses, playing for four seconds only when Next/ArrowRight advances page 1 → page 2. Pip turns from Artus toward the flower; Artus’s expression changes from happy to concerned. Registered masks keep the original garden and bodies still. The animation settles onto the original page-two illustration and never loops. Text clears briefly to show the characters, then returns; **Read now** skips immediately. Page selection, reload, text resizing and later pages do not trigger it. Menus, navigation, hidden tabs and reduced-motion preference stop or suppress it. Assets preload while page one is read; if they are unavailable or unready at the turn, the still remains readable without a delayed animation. The offline pack includes all five poses.

The existing save key, all 315 recordings/breakdowns, 44 anchors and original reader remain unchanged. No ElevenLabs or Runway generation calls were made for this update. [Animation implementation, checks and limits](MOONFLOWER_ANIMATION.md); [ChatGPT image prompts](MOONFLOWER_ANIMATION_PROMPTS.json).

### R9 verified release (historical)

Build `moonflower-20260928-r9` is deployed and verified. [Pages run 36398484827](https://github.com/Ikarus-eth/rightreader/actions/runs/36398484827) published commit `814a9b2c8fd2a2146dcfc4143c1d4070fdf8290e`. All 13 checked public files match the tested source: changed runtime files, both new recordings and the original-reader runtime. All 315 recordings passed generation-workflow decoding and content validation. It adds the flower/power/shower/tower family and a full-page artwork layout with tappable text over a dark translucent reading area. The r8 details below are historical; `MOONFLOWER_DEPLOYMENT.json` records this release under `immersiveLayoutUpdate`.

### R9 changes (historical)

- Flower, power, shower and tower now share a reciprocal spelling family, with `ower` highlighted and complete sound breakdowns for all four.
- Power and shower were recorded in the existing George voice. All **315 available words** now have recordings and sound maps; the **265 distinct story/title words** and all **44 unique sound anchors** are preserved.
- The reader uses the illustration as the page, with live tappable text overlaid. Portrait artwork is kept intact; soft image extensions fill space on wider screens. A dark text area preserves contrast, and longer text can scroll inside it at larger sizes.
- Header and navigation float over the artwork. The original reader and pilot save key are unchanged. Offline assets advance to cache v9.
- Character animation was pending in r9. The user subsequently chose ChatGPT-only generated image poses for r10; no Runway upgrade or ElevenLabs video generation is required.

Audio preparation [run 36397654292](https://github.com/Ikarus-eth/rightreader/actions/runs/36397654292) succeeded. The two new clips cost **7 request-reported credits**, bringing the cumulative total to **955**, including the previously retired close clip. Existing clips were reused.

Local browser checks traversed all 25 pages at 820×1180, with all 587 body-word buttons and six chapter-title word buttons present and no horizontal overflow. Flower’s new family opens shower’s three-sound breakdown and plays its George recording. The 390×844 page-two layout was visually checked for readable text, visible characters and the flower. Offline reload preserved page two and played the new power recording after the preview server stopped. Live Chrome confirmed r9, full-height artwork with overlaid text, tappable title words and the unchanged existing help-history count. Physical iPad/Safari and a complete human listening review remain unverified.

### R8 verified release (historical)

Build `moonflower-20260928-r8` is deployed and verified. [Pages run 36391697463](https://github.com/Ikarus-eth/rightreader/actions/runs/36391697463) published commit `681a8b7d0fca46dbfb6597df4d913bb409e151d9`. All 353 checked public files match the tested source, including all 313 recordings and the unchanged original-reader runtime. It supersedes r7’s 24-entry teaching set. The existing GitHub Pages route is [the pilot URL](https://ikarus-eth.github.io/rightreader/phonics/).

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

Local Chrome checks cover tappable chapter titles, Artus’s four-sound map and schwa hint, before’s new recording, all 44 unique guide cards, linked o…e in stone and the two x sounds in fox, plus silent l in would. The complete offline pack downloads successfully. With the local server stopped, the reader reloaded at saved page 17 with its illustration and played the new book anchor recording. At 390px, sound hints and the 44-card guide have no horizontal overflow. Live Chrome confirmed r8, all 44 unique guide pictures and successful playback of the new banana clip. The existing two-word help-history count was preserved. `MOONFLOWER_DEPLOYMENT.json` records these results under `soundBreakdownUpdate`; earlier release evidence remains historical.

The EPUB and illustrations are unchanged from the previously verified release: EPUBCheck 5.4.0 passed with zero errors/warnings; all 25 EPUB paragraphs and illustrations match the reader. Physical iPad/Safari and a complete human listening review remain outstanding. Authored British phonemic maps and programmatic checks do not certify every nuance of a generated recording; proper names and accent variants warrant listening review.

### Outside this pilot

Arbitrary PDF/EPUB import into phonics mode, automatic phonics diagnosis, speech scoring, a complete curriculum covering every English spelling, isolated-phoneme recordings, generated song performances and animated illustrations are not implemented. The original reader retains its own EPUB import.
