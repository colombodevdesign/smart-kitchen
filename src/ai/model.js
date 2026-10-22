// Stronger model where quality shows (recipes, receipt photos); Lite for the rest.
export const MODEL_NAME = 'gemini-3.5-flash-lite'
export const MODEL_PRO = 'gemini-3.8-flash'
// Thinking tokens are billed as output: keep it low on the stronger model.
export const PRO_CONFIG = { thinkingConfig: { thinkingLevel: 'LOW' } }
