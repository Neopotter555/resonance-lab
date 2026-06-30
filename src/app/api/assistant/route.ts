import type { EvidenceLevel } from "@/lib/types";

export const maxDuration = 10;

const buildSections = (prompt: string): Record<EvidenceLevel, string> => ({
  "Research-supported":
    "Use low volume, short sessions, and one-variable experiment design. Auditory stimulation research is mixed and context-dependent, so track subjective outcomes carefully.",
  Hypothesis:
    "Bentov-style resonance language can be useful as a metaphor for visualization and body awareness. It should not be presented as established neuroscience.",
  "Historical spiritual teaching":
    "Solfeggio and sacred-frequency associations can be included as symbolic traditions when clearly labeled as cultural or contemplative material.",
  "User experience": `For this prompt, record what you expected, what you actually noticed, and what else was happening that day: "${prompt.slice(0, 160)}"`,
});

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    language?: string;
    context?: {
      journalEntries?: unknown[];
    };
  };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const journalCount = Array.isArray(body.context?.journalEntries)
    ? body.context.journalEntries.length
    : 0;

  if (!prompt) {
    return Response.json(
      {
        error: "Prompt is required.",
      },
      { status: 400 },
    );
  }

  const sections = buildSections(prompt);

  return Response.json({
    provider: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
      ? "local-guardrail-demo-ready-for-provider"
      : "local-safety-fallback",
    answer: journalCount
      ? `I can analyze ${journalCount} recent journal ${journalCount === 1 ? "entry" : "entries"} as subjective observations. Look for repeated context patterns, avoid causal certainty, and compare one changed variable at a time.`
      : "Here is a cautious experiment design: choose one audio mode, set a comfortable low volume, run a short session, and compare only your own before and after journal entries. The app will keep research, hypotheses, spiritual teachings, and user reports separate.",
    sections,
  });
}
