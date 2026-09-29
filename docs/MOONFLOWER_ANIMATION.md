# Moonflower continuous story animation

## R11 — pages 12, 15, 18, 20 and 24

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
