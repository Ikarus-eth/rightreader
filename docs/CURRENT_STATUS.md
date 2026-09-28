# RightReader current status

## Original reader

The default app at `/rightreader/` remains the EPUB vocabulary reader. Its runtime, service worker and save format are unchanged by the Moonflower pilot.

## Moonflower phonics pilot — 28 September 2026

Build `moonflower-20260928-r6` corrects shared sound icons and is ready for deployment. The previous r5 deployment evidence remains in `MOONFLOWER_DEPLOYMENT.json` until the new publication is verified.

The separate `/rightreader/phonics/` reader contains the full user-provided **Artus and Pip: The Thirsty Moonflower** story: 25 illustrations and 587 story words. It uses extracted illustrations and native text; words are not baked into page images. The reflowable EPUB preserves every paragraph and illustration, includes a two-chapter contents list and page navigation, and is downloadable from the book menu.

### Implemented

- Every story word is tappable. A tap plays a word recording when available and shows a small help panel.
- 24 manually authored teaching entries map printed groups to sounds. `through` is `th | r | ough`; `smooth` uses voiced final th. The accent is British English, with an explicit accent note for `path`.
- Picture hints use 24 familiar-word anchors, each with a unique icon and word reserved for one sound. Sun represents /s/; up represents short /ʌ/. The other formerly shared anchors are separated into moon /m/ and boot /uː/, rock /r/ and rain /eɪ/, fox /f/ and fish /ɪ/. Printed spelling variants of the same sound always use that sound’s one anchor. The content check rejects shared icons or anchor words. The picture button plays the whole anchor word, **not** an isolated phoneme. The cue specifies which sound to listen for.
- Related examples prioritise the same spelling and pronunciation. Through uses two fresh sentences instead of presenting unrelated spellings as its spelling family.
- My words records help requests. The optional short review shows a word before any audio, has no timer or score, and makes no mastery claim. Rhyme time uses light/night/bright and an original short line.
- Reading position, text size and help history persist separately under `rrp_moonflower_v1`. The original `rr_` records and IndexedDB books are not read or modified.
- Pilot progress can be exported and restored after validation and confirmation. Offline download saves the book and recordings; the pilot service worker is scoped to `/phonics/` and never deletes other apps' caches.

### Audio limits

126 word/example recordings are packaged: 104 of the 264 distinct story words, including all 24 teaching targets. The other 160 story words use clearly labelled device speech. This is a partial premium-audio release; there is no claim that every word has the requested recorded voice.

Recordings combine existing approved British male clips from BlitzWord and newly generated British female clips. They are not a single consistent narrator. New generated batches were split at inter-word silences, checked for the expected clip count and decoded successfully; final parent listening review remains useful. Provenance and hashes are in `phonics/audio-provenance.json` and `phonics/audio.json`.

The connected Runway workspace's included speech credits were exhausted preparing the target-word set. The GitHub token can deploy code but cannot list repository secret names (HTTP 403); no speech-service key was available locally.

`phonics/prepare-premium-audio.py` can fill the entire bounded story/example vocabulary using an `ELEVENLABS_API_KEY` environment variable. It retains completed clips if quota runs out, does not retry failed speech requests, and uses a fixed British George voice. Run it only after a key and allowance are available, then validate and deploy the changed audio files through the existing Pages route.

The provided GitHub token cannot create or update workflows (GitHub rejected the push for missing workflow scope). Creating a pull request also returned HTTP 403. No new Actions workflows are included; existing Pages publishing remains available. The user-authorized deployment uses a normal fast-forward push to main after checking current main.

### Validation

The local content check verifies the EPUB ZIP structure and XML, exact text matches on all 25 pages, matching illustration bytes, all teaching mappings, and audio file hashes. All recorded clips were decoded with FFmpeg. JavaScript syntax checks pass locally. EPUBCheck 5.4.0 passed locally with zero errors and zero warnings.

All 25 reader pages were traversed in Chrome and checked for text, word targets and horizontal overflow. Recorded MP3 playback was observed in Chrome. The in-app preview browser rejected MP3 sources; it is not evidence that physical Safari playback fails. Portrait tablet and phone layouts were visually inspected. Landscape width and large-text persistence passed. The saved-word review → help → return flow passed with recorded playback. After saving the offline pack and stopping the local web server, the reader reloaded with its illustration, saved page/text size and working recorded audio. The first live audio test caught a service-worker issue with HTTP 206 range responses. Build r5 passes partial network responses through and creates correct byte-range responses from full offline recordings; regression tests cover bounded/open/suffix ranges, invalid ranges and cache quota failures. The public site then played the through recording successfully and displayed its th/r/ough breakdown and moon hint. All 164 public runtime/media files, including the EPUB and unchanged original reader files, match the verified source. Physical iPad/Safari and human listening review remain outstanding.

### Deliberately outside this pilot

Arbitrary PDF/EPUB import into the phonics mode, automatic phonics diagnosis, speech scoring, a complete phonics curriculum, isolated-phoneme recordings, generated song performances and animated illustrations are not implemented. The original reader retains its own EPUB import.
