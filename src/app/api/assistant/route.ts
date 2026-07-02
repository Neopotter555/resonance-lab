import type {
  AssistantContractItem,
  AssistantDecisionGate,
  AssistantGuidanceNote,
  AssistantJournalCue,
  AssistantLoopPrescription,
  AssistantMode,
  AssistantTraceStep,
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

const inferAssistantMode = (prompt: string): AssistantMode =>
  /analy[sz]e|journal|entry|entries|pattern|trend|what changed|data:/i.test(prompt) ? "analyze" : "ask";

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

const getLatestNotes = (entries: Partial<JournalEntry>[]) =>
  typeof entries[0]?.notes === "string" ? entries[0].notes.toLowerCase() : "";

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

const buildAnswer = (
  prompt: string,
  context: AssistantContext,
  summary: JournalSummary,
  assistantMode: AssistantMode,
) => {
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
    `What I am doing: I am running ${assistantMode === "analyze" ? "Analyze" : "Ask"} mode and turning your request into a bounded ${duration}-minute ${mode} experiment for ${title}.`,
    "What I am trying to deliver: a safe repeatable loop, not a mystical verdict or medical answer.",
    journalLine,
    "How I will think: I will keep research support, hypothesis, historical teaching, and user experience in separate lanes.",
    "How you use it: set one intention, change one variable, run the timer, journal honestly, then repeat before drawing conclusions.",
    `Prompt received: "${prompt.slice(0, 220)}"`,
  ].join(" ");
};

const buildContract = (
  prompt: string,
  context: AssistantContext,
  summary: JournalSummary,
  assistantMode: AssistantMode,
): AssistantContractItem[] => {
  const activeProtocol = context.activeProtocol;
  const title = typeof activeProtocol?.title === "string" ? activeProtocol.title : "current protocol";
  const duration =
    typeof activeProtocol?.durationMinutes === "number" && Number.isFinite(activeProtocol.durationMinutes)
      ? activeProtocol.durationMinutes
      : 15;
  const mode = context.mode ? modeLabel[context.mode] : "audio";
  const promptState = prompt.length >= 24 ? "ready" : "watch";

  return [
    {
      label: "Assistant mode",
      value:
        assistantMode === "analyze"
          ? "Analyze mode: read the newest journal evidence, separate signals from stories, and choose the next safest loop."
          : "Ask mode: design the session before it runs, make the instructions visible, and keep the claims bounded.",
      state: "ready",
    },
    {
      label: "Objective",
      value: `Build a ${duration}-minute ${mode} loop for ${title}; keep the goal to relaxation, attention, and self-observation.`,
      state: "ready",
    },
    {
      label: "Inputs watched",
      value: `Prompt ${promptState === "ready" ? "is clear enough" : "is short"}; protocol, audio mode, tone settings, journal count, and safety boundary are checked.`,
      state: promptState,
    },
    {
      label: "Safety boundary",
      value: "Low volume, no multitasking, no medical claims, and stop on discomfort, dizziness, panic, or harsh volume.",
      state: "ready",
    },
    {
      label: "Deliverable",
      value: "One next loop, one variable, green/yellow/red signals, journal fields, evidence labels, and a follow-up prompt.",
      state: "ready",
    },
    {
      label: "Loop rule",
      value: summary.count
        ? "Use the newest journal entry as personal evidence only, then repeat before changing another variable."
        : "Create the first baseline journal entry before asking the system to compare patterns.",
      state: summary.count ? "ready" : "watch",
    },
  ];
};

const buildGuidance = (
  context: AssistantContext,
  summary: JournalSummary,
  assistantMode: AssistantMode,
): AssistantGuidanceNote[] => {
  const activeProtocol = context.activeProtocol;
  const duration =
    typeof activeProtocol?.durationMinutes === "number" && Number.isFinite(activeProtocol.durationMinutes)
      ? activeProtocol.durationMinutes
      : 15;
  const intention =
    typeof activeProtocol?.intention === "string" && activeProtocol.intention.trim()
      ? sentenceEnd(activeProtocol.intention)
      : "observe one body or attention signal without forcing a result";

  if (assistantMode === "analyze") {
    return [
      {
        phase: "Analyze newest entry",
        instruction: summary.count
          ? "Start with the newest journal entry before looking at averages."
          : "No journal entries are available, so treat this as a baseline-building loop.",
        reason: summary.count
          ? "The latest entry is the user signal that can change the next run."
          : "Without a saved entry, analysis should not invent a pattern.",
        state: summary.count ? "ready" : "watch",
      },
      {
        phase: "Compare personal pattern",
        instruction: summary.count
          ? `Compare only personal data: mood ${formatAverage(summary.averageMoodDelta)}, focus ${formatAverage(summary.averageFocus, "/10")}, stress ${formatAverage(summary.averageStress, "/10")}.`
          : "Collect mood before/after, focus, energy, sleep quality, stress, and context first.",
        reason: "Personal trend comparison is useful; causal claims about the frequency are not supported.",
        state: summary.count ? "ready" : "watch",
      },
      {
        phase: "Decision rule",
        instruction: "Continue if signals are green, soften if yellow repeats, and stop or reset if any red signal appears.",
        reason: "The system should protect the user before optimizing the experiment.",
        state: "ready",
      },
      {
        phase: "Next variable",
        instruction: "Keep the same setup for one more run unless the notes clearly point to one variable to change.",
        reason: "A clean loop learns from repetition instead of chasing novelty.",
        state: "ready",
      },
    ];
  }

  return [
    {
      phase: "Before session",
      instruction: `Name the intention: ${intention}. Choose one variable and leave the rest alone.`,
      reason: "The user needs a clear target before sound begins.",
      state: "ready",
    },
    {
      phase: "During session",
      instruction: `Run ${duration} minutes at low volume. Watch breath, shoulders, attention, and any red discomfort signal.`,
      reason: "The body signals decide whether the loop continues, softens, or stops.",
      state: "ready",
    },
    {
      phase: "After session",
      instruction: "Save the journal entry before touching frequency, mode, volume, or intention.",
      reason: "Notes written before tweaking the setup create cleaner evidence.",
      state: "ready",
    },
    {
      phase: "Next loop",
      instruction: "Load the next prompt after journaling, then repeat or change one variable only.",
      reason: "Looping turns a single session into a guided experiment.",
      state: "ready",
    },
  ];
};

const buildDecision = (
  entries: Partial<JournalEntry>[],
  summary: JournalSummary,
): AssistantDecisionGate => {
  const latest = entries[0];
  const latestNotes = getLatestNotes(entries);
  const latestMoodBefore = toNumber(latest?.moodBefore);
  const latestMoodAfter = toNumber(latest?.moodAfter);
  const latestStress = toNumber(latest?.stressPerception);
  const latestMoodDelta =
    latestMoodBefore === null || latestMoodAfter === null ? null : latestMoodAfter - latestMoodBefore;
  const redSignalFromNotes =
    /\b(pain|panic|dizz\w*|headache|harsh|pressure|nausea|discomfort|anxiety spike)\b/.test(
      latestNotes,
    ) ||
    (/\bred\b/.test(latestNotes) && !/\b(no|without|none|not)\s+red\b/.test(latestNotes));
  const yellowSignalFromNotes =
    /\b(restless|bored|tired|tense|overwhelm\w*|uneasy|irritat\w*)\b/.test(latestNotes) ||
    (/\byellow\b/.test(latestNotes) && !/\b(no|without|none|not)\s+yellow\b/.test(latestNotes));
  const hasRedSignal =
    redSignalFromNotes ||
    (latestStress !== null && latestStress >= 8) ||
    (latestMoodDelta !== null && latestMoodDelta <= -2);
  const hasYellowSignal =
    yellowSignalFromNotes ||
    (latestStress !== null && latestStress >= 6) ||
    (latestMoodDelta !== null && latestMoodDelta < 0) ||
    (summary.averageStress !== null && summary.averageStress >= 6);

  if (hasRedSignal) {
    return {
      state: "stop",
      title: "Stop or reset",
      rationale:
        "The newest journal signal looks uncomfortable enough that the next loop should not optimize intensity.",
      nextStep:
        "Stop the experiment for now, lower volume next time, shorten the timer, and only restart when the body feels settled.",
    };
  }

  if (hasYellowSignal) {
    return {
      state: "soften",
      title: "Soften the next run",
      rationale:
        "The notes or stress data suggest mild friction. The safest next loop is gentler, not stronger.",
      nextStep:
        "Keep the same intention, reduce one intensity variable, and repeat before changing frequency or mode.",
    };
  }

  if (summary.count > 0) {
    return {
      state: "continue",
      title: "Continue carefully",
      rationale:
        "No red or repeated yellow signal is visible in the latest journal data. Keep the loop clean.",
      nextStep:
        "Repeat the same setup once, keep volume gentle, and change only one variable after another journal entry.",
    };
  }

  return {
    state: "continue",
    title: "Run first baseline",
    rationale: "There is no journal evidence yet, so the system should gather data before judging the loop.",
    nextStep:
      "Run the shortest useful session at low volume, save the first journal entry, then ask Analyze to decide the next loop.",
  };
};

const buildJournalCues = (
  assistantMode: AssistantMode,
  decision: AssistantDecisionGate,
): AssistantJournalCue[] => {
  if (assistantMode === "analyze") {
    return [
      {
        label: "Newest change",
        prompt: "What changed most clearly since the previous entry?",
        reason: "Analysis should start with the newest user signal, not a story about the whole system.",
      },
      {
        label: "Stable pattern",
        prompt: "What stayed the same across recent sessions?",
        reason: "Repeated personal patterns are more useful than one dramatic moment.",
      },
      {
        label: "Signal label",
        prompt: "Was the session green, yellow, or red, and what body signal proves it?",
        reason: "The next decision gate depends on observable signals.",
      },
      {
        label: "Next variable",
        prompt: `Decision gate says "${decision.title}". Which single variable should stay, soften, or change?`,
        reason: "The next loop should make one clear move, not several guesses.",
      },
    ];
  }

  return [
    {
      label: "Before play",
      prompt: "What state am I testing, and which one variable am I changing?",
      reason: "A session without a clear starting question is hard to learn from.",
    },
    {
      label: "During play",
      prompt: "What green, yellow, or red body signals appeared while the audio was running?",
      reason: "Signals are the safety language of the loop.",
    },
    {
      label: "After play",
      prompt: "What changed, what stayed the same, and what else was happening today?",
      reason: "Context keeps the journal honest.",
    },
    {
      label: "Decision gate",
      prompt: `After journaling, should the next run continue, soften, or stop? Current gate: ${decision.title}.`,
      reason: "Every loop should end with a simple next action.",
    },
  ];
};

const buildLoopPrescription = (
  context: AssistantContext,
  summary: JournalSummary,
  decision: AssistantDecisionGate,
): AssistantLoopPrescription => {
  const activeProtocol = context.activeProtocol;
  const title = typeof activeProtocol?.title === "string" ? activeProtocol.title : "current protocol";
  const duration =
    typeof activeProtocol?.durationMinutes === "number" && Number.isFinite(activeProtocol.durationMinutes)
      ? activeProtocol.durationMinutes
      : 15;
  const intention =
    typeof activeProtocol?.intention === "string" && activeProtocol.intention.trim()
      ? sentenceEnd(activeProtocol.intention)
      : "observe one body or attention signal without forcing a result";
  const toneDescription = getToneDescription(context);
  const baseBoundary = `${duration} minutes or less, low comfortable volume, no multitasking, and stop on red signals.`;

  if (decision.state === "stop") {
    return {
      state: decision.state,
      title: "Reset loop",
      intention: "Settle the body before collecting more data.",
      fixedVariable: `Do not optimize ${toneDescription}; keep the experiment paused until the journal signal is settled.`,
      changedVariable:
        "Change the boundary first: stop now, then restart only with a shorter timer and lower level.",
      audioBoundary:
        "No new audio run until discomfort, pressure, dizziness, panic, or harsh-volume sensation is gone.",
      signalToWatch: "Red signal: any pressure to push through, body discomfort, anxiety spike, or headache.",
      journalFocus: "Write the exact red signal, when it appeared, and what stopped it.",
      nextAction: "Rest, reset, and only run Analyze again after a calmer entry exists.",
    };
  }

  if (decision.state === "soften") {
    return {
      state: decision.state,
      title: "Gentle repeat loop",
      intention,
      fixedVariable: `Keep the same intention and ${toneDescription} so the next entry is comparable.`,
      changedVariable:
        "Soften one intensity variable only: lower level, shorten timer, or remove one background layer.",
      audioBoundary: baseBoundary,
      signalToWatch: "Yellow signal: restlessness, tension, tiredness, unease, or stress that does not settle.",
      journalFocus: "Record whether the softer boundary made the same signal easier, unchanged, or worse.",
      nextAction: "Repeat once, save notes immediately, then Analyze before changing frequency or mode.",
    };
  }

  if (summary.count > 0) {
    return {
      state: decision.state,
      title: "Repeat to confirm",
      intention,
      fixedVariable: `Keep ${title}, ${toneDescription}, timer, breath pace, and volume unchanged for one more run.`,
      changedVariable:
        "Change only the observation target: watch one signal from the latest journal more carefully.",
      audioBoundary: baseBoundary,
      signalToWatch: "Green signal: breath settles, shoulders soften, and attention returns without effort.",
      journalFocus:
        "Write what repeated from the last entry, what changed, and whether the signal stayed green.",
      nextAction: "If the repeat stays green, choose one variable to test next; if yellow or red appears, soften or stop.",
    };
  }

  return {
    state: decision.state,
    title: "Baseline loop",
    intention,
    fixedVariable: `Start with ${title} and ${toneDescription}; do not compare against other presets yet.`,
    changedVariable:
      "Change nothing during the first run. The first useful variable is the journal baseline itself.",
    audioBoundary: baseBoundary,
    signalToWatch: "First green, yellow, or red body signal that appears while the audio is running.",
    journalFocus:
      "Save before/after mood, focus, energy, sleep quality, stress, context, and one body signal.",
    nextAction: "After saving the first entry, run Analyze so the next loop uses evidence instead of guessing.",
  };
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

const buildTrace = (
  prompt: string,
  context: AssistantContext,
  summary: JournalSummary,
): AssistantTraceStep[] => {
  const activeProtocol = context.activeProtocol;
  const title = typeof activeProtocol?.title === "string" ? activeProtocol.title : "current protocol";
  const duration =
    typeof activeProtocol?.durationMinutes === "number" && Number.isFinite(activeProtocol.durationMinutes)
      ? activeProtocol.durationMinutes
      : null;

  return [
    {
      title: "Prompt parsed",
      detail:
        prompt.length > 24
          ? `I found a usable request: "${prompt.slice(0, 96)}${prompt.length > 96 ? "..." : ""}"`
          : "The prompt is short, so I will keep the answer conservative and ask the journal loop to do the learning.",
      state: prompt.length > 24 ? "ready" : "watch",
    },
    {
      title: "Protocol matched",
      detail: `${title}${duration ? `, ${duration} minutes` : ""}, using ${getToneDescription(context)}.`,
      state: "ready",
    },
    {
      title: "Journal evidence checked",
      detail: summary.count
        ? `${summary.count} entr${summary.count === 1 ? "y" : "ies"} found. I can compare only your own trend, not claim causation.`
        : "No baseline entries yet. The next session should create the first clean before/after note.",
      state: summary.count ? "ready" : "watch",
    },
    {
      title: "Safety boundary applied",
      detail: "Low volume, short duration, no medical claims, no multitasking, and stop on red body signals.",
      state: "ready",
    },
    {
      title: "Deliverable assembled",
      detail: "Output includes one next loop, evidence lanes, green/yellow/red signals, and journal instructions.",
      state: "ready",
    },
  ];
};

const buildNextPrompt = (context: AssistantContext, summary: JournalSummary) => {
  const activeProtocol = context.activeProtocol;
  const title = typeof activeProtocol?.title === "string" ? activeProtocol.title : "my current protocol";
  const duration =
    typeof activeProtocol?.durationMinutes === "number" && Number.isFinite(activeProtocol.durationMinutes)
      ? activeProtocol.durationMinutes
      : 15;
  const mode = context.mode ? modeLabel[context.mode] : "audio";
  const journalFrame = summary.count
    ? "Use my latest journal entries and compare only my own before/after pattern."
    : "Assume I have just saved my first journal entry after the session.";

  return [
    `After I complete the ${duration}-minute ${mode} session for "${title}", analyze the newest journal entry.`,
    journalFrame,
    "Show what changed, what stayed the same, green/yellow/red signals, one safety note, and the single next variable to keep or change.",
    "Keep research support, hypothesis, historical teaching, and user experience separate.",
  ].join(" ");
};

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
  const assistantMode = inferAssistantMode(prompt);
  const decision = buildDecision(journalEntries, summary);
  const loopPrescription = buildLoopPrescription(context, summary, decision);

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
    assistantMode,
    answer: buildAnswer(prompt, context, summary, assistantMode),
    sections: buildSections(prompt, context, summary),
    contract: buildContract(prompt, context, summary, assistantMode),
    guidance: buildGuidance(context, summary, assistantMode),
    decision,
    journalCues: buildJournalCues(assistantMode, decision),
    loopPrescription,
    actions: buildActions(context, summary),
    checks: buildChecks(),
    signals: buildSignals(),
    trace: buildTrace(prompt, context, summary),
    nextPrompt: buildNextPrompt(context, summary),
  });
}
