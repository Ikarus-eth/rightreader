# Moonflower story animation

## R13 — page 20 ElevenLabs film

One authorized website generation used the unchanged original page-20 illustration as its start frame, Seedance 2.5, Auto aspect, 1080p, 12 seconds, audio off and prompt enhancement off. ElevenLabs returned a 1248 × 1664 HEVC source at 24 fps. The site serves an H.264 conversion at the same size/rate (CRF 20, yuv420p, fast start) plus a final-frame WebP. No runtime API calls or additional generations are involved. The website displayed 75,287 credits for this generation. [Full provenance and review](MOONFLOWER_PAGE20_ELEVENLABS.json).

The review inspected full-scene frames, face/head crops and a four-frame-per-second crop of the stone drops. Faces and hair keep coherent shape while Artus and Pip track the crows, lean, blink and react. Crows release two separate stones, splashes/ripples follow, and the water reaches the rim. The camera and background geometry remain fixed, but painted texture/foliage is softened or reinterpreted; this is not a pixel-identical background.

`page20-video.js` preloads the full film and ending still, uses muted inline playback once, then releases the video and holds the ending frame. Skip behaves the same way. Playback failure/stall restores reading, and reduced motion or hidden pages keep the original still. `living-scenes.js` delegates only page 20 to this film. Reader and service-worker versions advance to R13; book/save data and all other animations are preserved. Fourteen playback/cache tests and the full content validator pass. Physical iPad/Safari is not tested.

## R12 — historical, rejected for face/hair deformation

The user rejected synchronized whole-image movement and requested a staged action: crows arrive, Artus and Pip follow them, stones drop, and water rises. Page 20 now uses eight separate painted assets, with a completely fixed background. All were generated with ChatGPT's built-in image editor; full prompts and output IDs are in [the asset manifest](MOONFLOWER_PAGE20_PROMPTS.json). Runtime assets are in `phonics/book/animation/page-20/` (eight WebP files, about 2.6 MiB). No external image/video generation service, runtime generation, or recurring generation fee is used.

`crow-timeline.js` defines a twelve-second action. Crow arrivals are staggered; each bird follows an eased cubic flight path. Separate near and far wings make full strokes with spanwise feather lag and foreshortening. Wing roots and the carried stone share the body transform, so the shoulder attachment and release point cannot drift. Pebbles release at 4.15 and 6.65 seconds, fall with acceleration, and hit at 4.83 and 7.33 seconds. Water rises after each impact, with brief splash droplets and expanding broken rings. The final higher level holds.

`crow-scene.js` composites the scene with WebGL and small local water canvases. Artus and Pip use connected transparent character meshes with feathered head, torso, cape/wing and tail controls. Narrow eye masks blend registered gaze variants when the characters look from birds to falling stones. The jar's unchanged front lip occludes Pip. Only these separated character layers deform; the sky, castle, garden and camera do not move. The water reflects a static patch of the existing painted sky.

On completion or **Read now**, the final scene is copied to one still canvas and all animation callbacks and graphics resources are released. The reading text returns. Forward entry and **Watch scene** start playback; direct page selection/reload stays still. Missing assets, reduced motion, hidden tabs or unavailable graphics keep reading available. Eight images and both new modules are included in offline saving. Original-reader code, book text/audio, page-two poses and the other four living illustrations are unchanged.

Validation: sixteen deterministic tests cover stone release continuity, impact placement, attached wing roots, event-driven water/gaze, completion/skip/hidden/context loss, GPU cleanup, fallbacks and existing reader/audio behavior. The content validator preserves 25 pages, 587 body words, 265 distinct story/title words, 315 recordings/maps and 44 sound anchors. Local reader playback rendered 1,441 frames over 11,996 ms on this 120 Hz browser. Completion, skip, restored text and offline reload/replay were checked. A 1086 × 1448 film was exported; sampled background areas are pixel-identical in the opening and ending frames. GitHub Pages run `36547527913` deployed commit `1acf2ed924fa67780b01bf276b6d27c8b18aa134`. All 19 checked live files match. Live playback completed after 1,441 frames / 11,993 ms, retained the final still and restored reading with no console errors. Page 20 and the existing eight saved words were preserved.

This is layered 2D illustration animation with procedural posing, not a fully drawn character acting performance. Heads stay in the existing camera angle; generated layers have small drawing differences from the original page. Physical iPad/Safari performance remains untested. The EPUB stays static.

## R11 — historical; retained on pages 12, 15, 18 and 24

The user requested continuous animation of Pip, Artus and some background elements on these five pages, published at the existing `/rightreader/phonics/` link. `phonics/living-scenes.js` rigs the existing 1086 × 1448 illustrations; there are **no new generated images, videos, external dependencies, runtime generation calls or extra service fees**. The original artwork is the texture, preserving character identity and composition.

| Page | Character movement | Scene movement |
| --- | --- | --- |
| 12 | Artus and Pip lean; Pip's wing and tail flex; crow dips its head | Expanding water rings, staff glow and leaves |
| 15 | Artus's head and reaching hand; Pip's head, wing and sweeping tail | Loose leaves, foliage, drifting light |
| 18 | Artus's head, carrying hands and cape; Pip's head with pebble, wing and tail | Foliage and distant warm lights |
| 20 | Artus and Pip look up; both flying crows flex their wings; perched crow nods | Water rings, leaves and staff light |
| 24 | Artus and Pip react; Pip's wing and tail; flower petals and leaf flex | Moving highlights in the water stream, moonflower/lantern glow and fireflies |

A shared 96 × 128 WebGL mesh deforms continuously with sinusoidal joint motion and softly feathered attachment regions. Rotations use aspect-correct coordinates about fixed pivots. The mesh is connected, so no cutout seams or detached joints can open. A lightweight canvas draws water/light accents. Motion follows the browser's animation clock rather than stepping through generated poses. An 850 ms ease-in and 1200 ms ease-out return exactly to the original illustration at eight seconds.

This is subtle living-illustration motion. Small surrounding areas deform with each part; it is not a fully separated skeletal character rig, a walk cycle or a new camera angle. The crows flex their existing wings rather than performing a complete flight stroke. Large action changes would require separated layers and painted background restoration. The static EPUB remains static.

Forward Next/ArrowRight entry plays once when the next picture is decoded. A **Watch scene** button replays the moment. **Read now**, navigation, word help, menus, hidden tabs, page exit and reduced-motion changes stop immediately. The text is inert while hidden, then returns with keyboard focus restored after a manual replay. Direct page selection/reload do not auto-play. Unready/failed image loads or an unavailable/lost graphics context keep or restore the original readable still. GPU buffers, texture, shaders and frame callbacks are released on exit. The animation module is included in the offline shell and complete book download.

### R11 checks

- Eleven deterministic tests: all five eight-second sequences, early first-frame timestamps, completion, cancellation, hidden tabs, context loss, unavailable GPU, missing/unready images, reduced motion, continuous poses, the existing page-two controller and audio range caching.
- Full content verifier: 25 illustrated pages, 587 body words, 265 distinct story/title words, all 315 recordings/breakdowns and 44 anchors unchanged.
- Local browser: all five scenes visually inspected; 1280 × 720, 820 × 1180 and 390 × 844 layouts checked. Page 20 rendered 962 frames over 7995 ms on the test browser (approximately 120 Hz; physical device performance varies).
- Automatic page 23 → 24 playback, manual replay, Read now, restored flower word help and its spelling family passed.
- After Save this book for offline reading completed, the preview server was stopped. Reload restored page 24 and its saved word count; replay worked from the offline pack.
- Live deployment: Pages run `36536328833` succeeded for commit `1f5e671b1eaee063666eacbd0d7498d7f40a51dc`; all 16 public-file hash checks matched. All five pages rendered in the live browser. Page 24 finished after 962 frames / 7995 ms, removed both canvases and restored 25 tappable words. The original page-two reading position and eight-word history count were restored. Details: `MOONFLOWER_DEPLOYMENT.json`, `continuousScenesUpdate`.
- Physical iPad/Safari has not been tested.

## R10 — page-two animation (retained)

Five selected illustrated poses were generated using ChatGPT's built-in image editor, with the book's first two illustrations as references. No external image/video API or ElevenLabs credits were used. This is a short sequence of authored poses with 140 ms blends, not a skeletal character rig or generated video.

Assets: `phonics/book/animation/page-02/pose-01.jpg` through `pose-05.jpg`, each 1086 × 1448; approximately 3.3 MiB total. The original generated PNGs remain in ChatGPT's local image output directory. [Generation prompts and selected output identifiers](MOONFLOWER_ANIMATION_PROMPTS.json).

On Next or ArrowRight from page 1, the five poses play on page 2 for four seconds. Pip moves from looking happily at Artus to looking down at the flower; Artus's facial expression shifts from happy to concerned. Browser masks restrict the generated images to their heads and upper necks, preserving the original garden, bodies, flower and camera. The original page-two illustration becomes the ending still.

Text clears during the moment, with a **Read now** skip button; it returns automatically. Navigation, menus, hidden tabs, page exit and reduced-motion changes cancel immediately. Direct page selection, reload, text size changes and subsequent pages do not start motion. Assets preload on page 1. Missing or not-yet-decoded poses leave the still readable, rather than delaying navigation or starting an animation later. Offline saving includes all five frames. There is no runtime generation or recurring generation cost.

### R10 validation

- The three deterministic motion-controller tests cover the four-second stop, skip/navigation/preference cancellation, missing/unready images, hidden tabs and reduced motion.
- Four service-worker tests and the full content verifier preserve 25 pages, 587 body words, 265 distinct story/title words, all 315 sound maps/recordings and 44 unique anchors.
- Local Chrome at 820 × 1180 and 390 × 844 was visually checked during the happy pose and after settling to the original concerned still. All five frames decode. Read now restores tappable text; flower's family and George recording still work. Reloading page two stays still.
- After saving the offline pack, the local preview server was stopped. Reloading preserved the book, then page 1 → page 2 played all five decoded frames from the saved pack.
- GitHub Pages run 36410997355 deployed commit `d3a89648b12e185e22bb3c67e2e2cbe297d74d75`. All 22 checked public files matched local hashes. Live Chrome played all five decoded poses, stopped on the original still and restored the text; page-one position and the existing two-word help count were preserved. Details are in `MOONFLOWER_DEPLOYMENT.json`, under `characterAnimationUpdate`.

Physical iPad/Safari has not been tested. This is an intentionally simple picture-book animation: the generated head poses can show small drawing differences, and Artus's turn is subtler than Pip's.
