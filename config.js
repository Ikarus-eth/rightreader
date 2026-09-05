/* ============================================================
   Right Reader — configuration.
   The only file you edit by hand. Changing it never needs a rebuild:
   edit, commit, push.

   The API key is NOT here and must never be. It is typed once into
   the parent screen on the iPad and lives in that device's browser
   storage only.
   ============================================================ */
window.APP_CONFIG = {

  // Bulk word prefetching. Cheap and fast; this is most of the calls.
  MODEL_FAST: "claude-haiku-4-5-20251001",

  // Live taps and phrasal-verb decisions, where she is waiting and the
  // literal-vs-idiomatic judgement actually matters.
  MODEL_GOOD: "claude-sonnet-5",

  // Hard ceiling on API requests per day from this device. A runaway
  // loop stops here rather than at your prepaid balance.
  DAILY_CALL_CAP: 1200

};
