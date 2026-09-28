# RightReader current status

## Original reader

The default app at `/rightreader/` remains the EPUB vocabulary reader. Its runtime, service worker and save format are unchanged by the Moonflower pilot.

## Moonflower phonics pilot — 28 September 2026

Build `moonflower-20260928-r7` is prepared and locally validated; live verification is pending. The previous build `moonflower-20260928-r6` was deployed and verified at [the pilot URL](https://ikarus-eth.github.io/rightreader/phonics/). [Pages run 36361543202](https://github.com/Ikarus-eth/rightreader/actions/runs/36361543202) published commit `cc6b16d41687d711a545a16522181e2c67c4daed`. The `anchorUpdate` section of `MOONFLOWER_DEPLOYMENT.json` records the new evidence; the original r5 evidence is preserved. All 24 icons and anchor words are unique. Live browser checks confirmed separate sun and up hints, and recorded up playback.

The separate `/rightreader/phonics/` reader contains the full user-provided **Artus and Pip: The Thirsty Moonflower** story: 25 illustrations and 587 story words. It uses extracted illustrations and native text; words are not baked into page images. The reflowable EPUB preserves every paragraph and illustration, includes a two-chapter contents list and page navigation, and is downloadable from the book menu.

### Implemented

- Every story word is tappable. A tap plays a word recording when available and shows a small help panel.
- 24 manually authored teaching entries map printed groups to sounds. `through` is `th | r | ough`; `smooth` uses voiced final th. The accent is British English, with an explicit accent note for `path`.
- Picture hints use 24 familiar-word anchors, each with a unique icon and word reserved for one sound. Sun represents /s/; up represents short /ʌ/. The other formerly shared anchors are separated into moon /m/ and boot /uː/, rock /r/ and rain /eɪ/, fox /f/ and fish /ɪ/. Printed spelling variants of the same sound always use that sound’s one anchor. The content check rejects shared icons or anchor words. The picture button plays the whole anchor word, **not** an isolated phoneme. The cue specifies which sound to listen for.
- Related examples prioritise the same spelling and pronunciation. Through uses two fresh sentences instead of presenting unrelated spellings as its spelling family.
- My words records help requests. The optional short review shows a word before any audio, has no timer or score, and makes no mastery claim. Rhyme time uses light/night/bright and an original short line.
- Reading position, text size and help history persist separately under `rrp_moonflower_v1`. The original `rr_` records and IndexedDB books are not read or modified.
- Pilot progress can be exported and restored after validation and confirmation. Offline download saves the book and recordings; the pilot service worker is scoped to `/phonics/` and never deletes other apps' caches.

### Audio — r7 validated locally, deployment pending

The r7 audio update replaces the mixed voices with one George voice from ElevenLabs for the entire bounded vocabulary: 264 distinct story words and 35 additional current teaching/example/anchor words. The eleven approved samples are reused. The generator saves each completed recording and its reported credit cost immediately, does not retry speech requests automatically, and stops if the cost exceeds the reviewed one-credit variance or the approved 1,100-credit total budget would be exceeded. Generation completed with 299 recordings: 288 new and 11 reused samples. Total request-reported cost is 905 credits (863 for this completion, 42 for the earlier samples), one credit above the estimate because of the stretched recording. All costs are saved in `ELEVENLABS_AUDIO_GENERATION.json`; the earlier subscription counter did not independently confirm balance deductions.

Audio filenames include a content hash so updated recordings cannot reuse cached older voices. The pilot cache advances to v7; its reading-position and word-history save key remains `rrp_moonflower_v1`. Missing or failed audio produces a retry message, without switching to a different voice. Settings and offline-download messages describe the complete recorded voice pack.

The repository secret `ELEVENLABS_API_KEY1` is available only to the generation step in GitHub Actions. It is not included in the website, recordings or reports. Generation stages changes on the audio branch; production deployment still uses the existing Pages route after review and validation. The earlier limited-token workflow failures are superseded by the connected GitHub integration.

Whole-word audio coverage and phonics-teaching coverage are different. This update completes recordings; the number of manually authored sound breakdowns remains 24. Picture hints still play the whole anchor word rather than an isolated phoneme.

### Validation

R7 local validation confirms exact audio coverage for all 299 expected words, one voice/model throughout, unique content-hash URLs, and matching audio-file hashes. All 299 MP3 files decode with FFmpeg; durations range from 0.51 to 1.16 seconds. The pack is 4,292,880 bytes. JavaScript syntax and all four existing service-worker range/cache tests pass. Browser checks confirmed page-position persistence and recorded playback for through, its boot anchor, and the formerly unrecorded nudged. The complete offline pack downloaded successfully; with the preview server stopped, the reader reloaded at page 17 with its illustration and played the newly recorded would clip from its saved pack. The cloud generation completed; its subsequent audio decode step lacked FFmpeg, so decoding was completed locally and the manual workflow now installs that dependency.

The local content check verifies the EPUB ZIP structure and XML, exact text matches on all 25 pages, matching illustration bytes, all teaching mappings, and audio file hashes. All recorded clips were decoded with FFmpeg. JavaScript syntax checks pass locally. EPUBCheck 5.4.0 passed locally with zero errors and zero warnings.

All 25 reader pages were traversed in Chrome and checked for text, word targets and horizontal overflow. Recorded MP3 playback was observed in Chrome. The in-app preview browser rejected MP3 sources; it is not evidence that physical Safari playback fails. Portrait tablet and phone layouts were visually inspected. Landscape width and large-text persistence passed. The saved-word review → help → return flow passed with recorded playback. After saving the offline pack and stopping the local web server, the reader reloaded with its illustration, saved page/text size and working recorded audio. The first live audio test caught a service-worker issue with HTTP 206 range responses. Build r5 passes partial network responses through and creates correct byte-range responses from full offline recordings; regression tests cover bounded/open/suffix ranges, invalid ranges and cache quota failures. The public site then played the through recording successfully and displayed its th/r/ough breakdown and moon hint. All 164 public runtime/media files, including the EPUB and unchanged original reader files, match the verified source. Physical iPad/Safari and human listening review remain outstanding.

### Deliberately outside this pilot

Arbitrary PDF/EPUB import into the phonics mode, automatic phonics diagnosis, speech scoring, a complete phonics curriculum, isolated-phoneme recordings, generated song performances and animated illustrations are not implemented. The original reader retains its own EPUB import.
