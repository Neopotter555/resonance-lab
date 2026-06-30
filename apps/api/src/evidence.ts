export type EvidenceLevel =
  | "Research-supported"
  | "Hypothesis"
  | "Historical spiritual teaching"
  | "User experience";

export const safetyDisclaimer =
  "Educational and self-observation use only. Not medical advice, diagnosis, treatment, cure, or a substitute for professional care.";

export const researchLibrary = [
  {
    title: "Auditory beat stimulation and subjective state",
    level: "Research-supported" as EvidenceLevel,
    summary:
      "Auditory stimulation research explores correlations with attention, relaxation, and mood measures. Results vary by protocol and person.",
  },
  {
    title: "Bentov-inspired oscillator model",
    level: "Hypothesis" as EvidenceLevel,
    summary:
      "The oscillator frame is treated as a metaphor and experiment-design lens, not established neuroscience.",
  },
  {
    title: "Solfeggio frequency traditions",
    level: "Historical spiritual teaching" as EvidenceLevel,
    summary:
      "Specific frequency values can be used as symbolic sound-practice presets when labeled as tradition.",
  },
  {
    title: "Personal session reports",
    level: "User experience" as EvidenceLevel,
    summary:
      "Journal entries are subjective observations. They support reflection, not universal claims.",
  },
];

export function buildAssistantSections(prompt: string): Record<EvidenceLevel, string> {
  return {
    "Research-supported":
      "Use comfortable low volume, short duration, and one-variable experiment design. Do not infer medical outcomes.",
    Hypothesis:
      "Resonance and oscillator language may guide visualization, but it remains a hypothesis or metaphor in this app.",
    "Historical spiritual teaching":
      "Solfeggio and similar mappings can be included as cultural or contemplative traditions.",
    "User experience": `Record expectations, perceived effects, and context for this prompt: "${prompt.slice(0, 160)}"`,
  };
}
