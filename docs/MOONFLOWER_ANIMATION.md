# Moonflower page-two animation

Five selected illustrated poses were generated using ChatGPT's built-in image editor, with the book's first two illustrations as references. No external image/video API or ElevenLabs credits were used. This is a short sequence of authored poses with 140 ms blends, not a skeletal character rig or generated video.

Assets: `phonics/book/animation/page-02/pose-01.jpg` through `pose-05.jpg`, each 1086 × 1448; approximately 3.3 MiB total. The original generated PNGs remain in ChatGPT's local image output directory. [Generation prompts and selected output identifiers](MOONFLOWER_ANIMATION_PROMPTS.json).

On Next or ArrowRight from page 1, the five poses play on page 2 for four seconds. Pip moves from looking happily at Artus to looking down at the flower; Artus's facial expression shifts from happy to concerned. Browser masks restrict the generated images to their heads and upper necks, preserving the original garden, bodies, flower and camera. The original page-two illustration becomes the ending still.

Text clears during the moment, with a **Read now** skip button; it returns automatically. Navigation, menus, hidden tabs, page exit and reduced-motion changes cancel immediately. Direct page selection, reload, text size changes and subsequent pages do not start motion. Assets preload on page 1. Missing or not-yet-decoded poses leave the still readable, rather than delaying navigation or starting an animation later. Offline saving includes all five frames. There is no runtime generation or recurring generation cost.

## Validation

- The three deterministic motion-controller tests cover the four-second stop, skip/navigation/preference cancellation, missing/unready images, hidden tabs and reduced motion.
- Four service-worker tests and the full content verifier preserve 25 pages, 587 body words, 265 distinct story/title words, all 315 sound maps/recordings and 44 unique anchors.
- Local Chrome at 820 × 1180 and 390 × 844 was visually checked during the happy pose and after settling to the original concerned still. All five frames decode. Read now restores tappable text; flower's family and George recording still work. Reloading page two stays still.
- After saving the offline pack, the local preview server was stopped. Reloading preserved the book, then page 1 → page 2 played all five decoded frames from the saved pack.
- GitHub Pages run 36410997355 deployed commit `d3a89648b12e185e22bb3c67e2e2cbe297d74d75`. All 22 checked public files matched local hashes. Live Chrome played all five decoded poses, stopped on the original still and restored the text; page-one position and the existing two-word help count were preserved. Details are in `MOONFLOWER_DEPLOYMENT.json`, under `characterAnimationUpdate`.

Physical iPad/Safari has not been tested. This is an intentionally simple picture-book animation: the generated head poses can show small drawing differences, and Artus's turn is subtler than Pip's.
