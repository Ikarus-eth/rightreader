/* Right Reader — configuration. The API key never belongs in this file. */
window.APP_CONFIG = {
  PROVIDER: "openai",

  // High-volume background vocabulary prefetch.
  MODEL_FAST: "gpt-5.6-luna",

  // Live contextual lookup / sense decisions.
  MODEL_GOOD: "gpt-5.6-terra",

  REASONING_EFFORT: "none",

  // USD per million text tokens. Used only for the parent-screen estimate.
  PRICES: {
    "gpt-5.6-luna":  { in: 0.20, out: 1.20 },
    "gpt-5.6-terra": { in: 2.00, out: 12.00 },
    "gpt-5.6-sol":   { in: 4.00, out: 20.00 }
  },

  // Device-side runaway-loop guard.
  DAILY_CALL_CAP: 1200
};
