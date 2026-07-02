import type {
  BinauralConfig,
  EvidenceLevel,
  FrequencyMode,
  IsochronicConfig,
  JournalEntry,
  SessionProtocol,
} from "@/lib/types";

export const maxDuration = 10;

interface AssistantContext {
  activeProtocol?: Partial<SessionProtocol>;
  mode?: FrequencyMode;
  binaural?: Partial<BinauralConfig>;
  isochronic?: Partial<IsochronicConfig>;
  journalEntries?: unknown[];
}

interface JournalSummary {
  count: number;
  averageMoodDelta: number | null;
  averageFocus: number | null;
  averageStress: number | null;
  latestProtocol: string | null;
}

const modeLabel: Record<FrequencyMode, string> = {
  pure: "pure tone",
  binaural: "binaural beat",
  isochronic: "isochronic pulse",
};

const toNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const formatAverage = (value: number | null, suffix = "") =>
  value === null ? "not enough data" : `${value.toFixed(1)}${suffix}`;

const sentenceEnd = (value: string) => value.trim().replace(/[.!?]+$/, "");

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const getEntries = (entries: unknown[] | undefined): Partial<JournalEntry>[] =>
  Array.isArray(entries)
    ? entries.filter((entry): entry is Partial<JournalEntry> => typeof entry === "object" && entry !== null)
    : [];

const summarizeJournal = (entries: Partial<JournalEntry>[]): JournalSummary => {
  const moodDeltas = entries
    .map((entry) => {
      const before = toNumber(entry.moodBefore);
      const after = toNumber(entry.moodAfter);
      return before === null || after === null ? null : after - before;
    })
    .filter((value): value is number => value !== null);
  const focusValues = entries
    .map((entry) => toNumber(entry.focus))
    .filter((value): value is number => value !== null);
  const stressValues = entries
    .map((entry) => toNumber(entry.stressPerception))
    .filter((value): value is number => value !== null);

  return {
    count: entries.length,
    averageMoodDelta: average(moodDeltas),
    averageFocus: average(focusValues),
    averageStress: average(stressValues),
    latestProtocol:
      typeof entries[0]?.protocolTitle === "string" ? entries[0].protocolTitle ?? null : null,
  };
};

const getToneDescription = (context: AssistantContext) => {
  if (context.mode === "binaural") {
    const carrier = toNumber(context.binaural?.carrier);
    const beat = toNumber(context.binaural?.beat);
    return `current binaural setting${carrier ? `, ${carrier} Hz carrier` : ""}${beat ? ` with ${beat} Hz beat offset` : ""}`;
  }

  if (context.mode === "isochronic") {
    const carrier = toNumber(context.isochronic?.carrier);
    const pulse = toNumber(context.isochronic?.pulse);
    return `current isochronic setting${carrier ? `, ${carrier} Hz carrier` : ""}${pulse ? ` with ${pulse} Hz pulse` : ""}`;
  }

  return context.mode ? `current ${modeLabel[context.mode]} setting` : "current audio setting";
};

const buildSections = (
  prompt: string,
  context: AssistantContext,
  summary: JournalSummary,
): Record<EvidenceLevel, string> => ({
  "Research-supported":
    "Low volume, short sessions, and one-variable experiment design are the strongest guardrails here. Auditory stimulation research is mixed, so this app tracks subjective state instead of promising outcomes.",
  Hypothesis:
    `For this prompt, Bentov-style resonance language is treated as a visualization metaphor. Use the ${getToneDescription(context)} as a design variable, not as established neuroscience.`,
  "Historical spiritual teaching":
    "Solfeggio, Schumann, and sacred-frequency labels can be used as symbolic or contemplative presets only when clearly separated from medical claims.",
  "User experience": summary.count
    ? `Recent journal loop: ${summary.count} entr${summary.count === 1 ? "y" : "ies"}, average mood change ${formatAverage(summary.averageMoodDelta)}, average focus ${formatAverage(summary.averageFocus, "/10")}, average stress ${formatAverage(summary.averageStress, "/10")}. Treat this as personal pattern evidence only.`
    : `No journal baseline yet. After this prompt, record expectation, actual sensation, mood before/after, focus, energy, sleep quality, stress, and context: "${prompt.slice(0, 160)}"`,
});

const buildAnswer = (prompt: string, context: AssistantContext, summary: JournalSummary) => {
  const activeProtocol = context.activeProtocol;
  const title = typeof activeProtocol?.title === "string" ? activeProtocol.title : "your current protocol";
  const duration =
    typeof activeProtocol?.durationMinutes === "number" && Number.isFinite(activeProtocol.durationMinutes)
      ? activeProtocol.durationMinutes
      : 15;
  const mode = context.mode ? modeLabel[context.mode] : "audio";
  const journalLine = summary.count
    ? `I also checked your recent journal pattern: mood ${formatAverage(summary.averageMoodDelta)}, focus ${formatAverage(summary.averageFocus, "/10")}, stress ${formatAverage(summary.averageStress, "/10")}.`
    : "Because there is no journal baseline yet, the first mission is to collect clean before-and-after notes.";

  return [
    `I am building a bounded ${duration}-minute ${mode} experiment for ${title}. The goal is relaxation, attention, and self-observation, not diagnosis, treatment, or certainty.`,
    journalLine,
    `For your request, I will keep four lanes separate: research support, hypothesis, historical teaching, and user experience. The next best loop is simple: set one intention, change one variable, run the timer, journal honestly, then repeat before drawing conclusions.`,
    `Prompt received: "${prompt.slice(0, 220)}"`,
  ].join(" ");
};

const buildActions = (context: AssistantContext, summary: JournalSummary) => {
  const activeProtocol = context.activeProtocol;
  const duration =
    typeof activeProtocol?.durationMinutes === "number" && Number.isFinite(activeProtocol.durationMinutes)
      ? activeProtocol.durationMinutes
      : 15;
  const intention =
    typeof activeProtocol?.intention === "string" && activeProtocol.intention.trim()
      ? activeProtocol.intention.trim()
      : "observe one body or attention signal without forcing a result";

  return [
    `Name the intention before pressing play: ${sentenceEnd(intention)}.`,
    `Run ${duration} minutes at a comfortable low volume; keep the relax background soft enough to ignore.`,
    "Change one variable only: frequency preset, audio mode, volume, breath pace, or intention.",
    summary.count
      ? "Compare against your own recent entries, then repeat the same setup once before changing the next variable."
      : "Create the first baseline entry immediately after the session, even if nothing dramatic happened.",
  ];
};

const buildChecks = () => [
  "Comfort check: audio should feel easy, spacious, and optional; lower the level if you start tracking the sound too hard.",
  "Boundary check: stop if you feel discomfort, headache, anxiety spike, dizziness, or pressure to push through.",
  "Context check: no driving, machinery, or multitasking during focused audio sessions.",
  "Evidence check: one good personal observation is useful; it is not proof that the frequency caused the result.",
];

const buildSignals = () => [
  "Green signal: breathing settles, shoulders soften, attention returns more easily after distraction.",
  "Yellow signal: boredom, wandering thoughts, or mild restlessness; note it and keep the session gentle.",
  "Red signal: pain, panic, dizziness, harsh volume, or compulsive chasing of an effect; stop and reset.",
];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    language?: string;
    context?: AssistantContext;
  };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const context = body.context ?? {};
  const journalEntries = getEntries(context.journalEntries);
  const summary = summarizeJournal(journalEntries);

  if (!prompt) {
    return Response.json(
      {
        error: "Prompt is required.",
      },
      { status: 400 },
    );
  }

  return Response.json({
    provider:
      process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
        ? "local-guardrail-demo-ready-for-provider"
        : "local-safety-fallback",
    answer: buildAnswer(prompt, context, summary),
    sections: buildSections(prompt, context, summary),
    actions: buildActions(context, summary),
    checks: buildChecks(),
    signals: buildSignals(),
  });
}
