/* ============================================================
   Right Reader — configuration.
   Edit, commit, push. No rebuild needed for anything in this file.

   The API key is NOT here and must never be. It is typed once into the
   parent screen on the iPad and lives in that device's browser storage.
   ============================================================ */
window.APP_CONFIG = {

  // "openai" or "anthropic". Both answer cross-origin browser requests,
  // which is what lets this app run with no server of its own.
  PROVIDER: "openai",

  // Bulk pre-explaining of whole chapters in the background. This is most
  // of the calls, so it wants the cheapest model that writes clear,
  // simple English.
  MODEL_FAST: "gpt-5.6-luna",

  // Live taps and the which-meaning-is-it decision. Runs only while she
  // is waiting, so it is worth paying for.
  MODEL_GOOD: "gpt-5.6-terra",

  // These names are a best guess at current model IDs and may be wrong.
  // Don't fix them here by guessing again: open the parent screen,
  // Einstellungen, tap "Speichern & testen", and pick from the real list
  // your account returns.

  // Some models bill hidden reasoning tokens against the output budget,
  // which can empty a short reply. "low" or "minimal" keeps that small.
  // If a model rejects the parameter the app drops it and retries once,
  // so leaving it set is safe.
  REASONING_EFFORT: "low",

  // USD per million tokens, only used for the spend estimate on the
  // parent screen. An unlisted model still gets counted, at a placeholder
  // rate, so the number is never silently zero.
  PRICES: {
    "gpt-5.6-luna":  { in: 0.20, out: 1.20 },
    "gpt-5.6-terra": { in: 2.00, out: 12.00 },
    "gpt-5.6-sol":   { in: 5.00, out: 30.00 },
    "gpt-5-mini":    { in: 0.25, out: 2.00 },
    "gpt-5-nano":    { in: 0.05, out: 0.40 },
    "claude-haiku-4-5-20251001": { in: 1.00, out: 5.00 },
    "claude-sonnet-5":           { in: 3.00, out: 15.00 }
  },

  // Hard ceiling on API requests per day from this device. A runaway loop
  // stops here rather than at your prepaid balance.
  DAILY_CALL_CAP: 1200

};
