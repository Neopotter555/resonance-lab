"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Download,
  FlaskConical,
  Gauge,
  Globe2,
  Languages,
  Library,
  Moon,
  Plus,
  Radar,
  Save,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnalyzerCanvas } from "@/components/analyzer-canvas";
import { FrequencyField } from "@/components/frequency-field";
import { useAudioLab } from "@/hooks/use-audio-lab";
import {
  ASSISTANT_STARTER,
  DEFAULT_BINAURAL,
  DEFAULT_ISOCHRONIC,
  DEFAULT_LAYERS,
  DEFAULT_PROTOCOLS,
  DEFAULT_RELAX_MUSIC,
  DEFAULT_SOUNDSCAPE,
  EXPLORATION_MODULES,
  FREQUENCY_CHOICES,
  LANGUAGE_PACKS,
  RESEARCH_LIBRARY,
} from "@/lib/resonance-content";
import type {
  AssistantMessage,
  BinauralConfig,
  EvidenceLevel,
  FrequencyChoice,
  FrequencyLayer,
  FrequencyMode,
  FrequencyPreset,
  IsochronicConfig,
  JournalEntry,
  LanguageCode,
  RelaxMusicConfig,
  SessionProtocol,
  SoundscapeType,
  ThemeMode,
} from "@/lib/types";

const languageNames: Record<LanguageCode, string> = {
  en: "English",
  th: "ไทย",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  es: "Espanol",
  de: "Deutsch",
  fr: "Francais",
};

const evidenceTone: Record<EvidenceLevel, string> = {
  "Research-supported": "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  Hypothesis: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  "Historical spiritual teaching": "border-amber-300/30 bg-amber-300/10 text-amber-100",
  "User experience": "border-slate-300/30 bg-slate-300/10 text-slate-100",
};

const modeLabels: Record<FrequencyMode, string> = {
  pure: "Pure tones",
  binaural: "Binaural beat",
  isochronic: "Isochronic pulse",
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

interface ScheduledSession {
  id: string;
  protocolTitle: string;
  scheduledFor: string;
  status: "scheduled" | "completed" | "skipped";
}

interface GuideEvent {
  id: string;
  createdAt: string;
  title: string;
  detail: string;
  tone: "gold" | "cyan" | "rose";
}

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeAverage(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ControlButton({
  children,
  disabled = false,
  onClick,
  title,
  variant = "secondary",
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const className =
    variant === "primary"
      ? "bg-emerald-300 text-slate-950 hover:bg-emerald-200"
      : variant === "danger"
        ? "border border-rose-300/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
        : "border border-white/12 bg-white/8 text-slate-100 hover:bg-white/12";

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "gap-3" : "gap-4"}`}>
      <div
        className={`codex-mark shrink-0 ${compact ? "h-11 w-11" : "h-16 w-16"}`}
        aria-hidden="true"
      >
        <Activity size={compact ? 20 : 28} strokeWidth={1.7} />
      </div>
      <div className="min-w-0">
        <div className="codex-wordmark">
          <Sparkles size={compact ? 13 : 15} strokeWidth={1.7} />
          <span>Resonance Codex</span>
        </div>
        {!compact && (
          <p className="mt-1 text-xs text-slate-500">
            Frequency ritual tools for relaxation and self-observation
          </p>
        )}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="w-full min-w-0 max-w-full rounded border border-white/10 bg-white/7 p-4">
      <div className="flex min-w-0 items-center justify-between gap-3 text-slate-300">
        <span className="text-sm">{label}</span>
        <span className="text-emerald-200">{icon}</span>
      </div>
      <div className="mt-4 text-2xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="font-mono text-emerald-200">
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="accent-emerald-300"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span>{label}</span>
      <div className="flex items-center rounded border border-white/10 bg-slate-950/60">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white outline-none"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="px-3 text-xs uppercase text-slate-500">{suffix}</span>
      </div>
    </label>
  );
}

export function ResonanceLabApp() {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [layers, setLayers] = useState<FrequencyLayer[]>(DEFAULT_LAYERS);
  const [mode, setMode] = useState<FrequencyMode>("binaural");
  const [binaural, setBinaural] = useState<BinauralConfig>(DEFAULT_BINAURAL);
  const [isochronic, setIsochronic] = useState<IsochronicConfig>(DEFAULT_ISOCHRONIC);
  const [soundscape, setSoundscape] = useState(DEFAULT_SOUNDSCAPE);
  const [relaxMusic, setRelaxMusic] = useState<RelaxMusicConfig>(DEFAULT_RELAX_MUSIC);
  const [selectedFrequencyChoiceId, setSelectedFrequencyChoiceId] = useState("");
  const [frequencyPresets, setFrequencyPresets] = useState<FrequencyPreset[]>([]);
  const [presetTitle, setPresetTitle] = useState("My resonance preset");
  const [protocols, setProtocols] = useState<SessionProtocol[]>(DEFAULT_PROTOCOLS);
  const [activeProtocolId, setActiveProtocolId] = useState(DEFAULT_PROTOCOLS[0].id);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [scheduleFor, setScheduleFor] = useState("");
  const [habitCheckins, setHabitCheckins] = useState<string[]>([]);
  const [bioSignal, setBioSignal] = useState({
    heartRate: 68,
    hrv: 52,
    coherence: 64,
    breathSync: 58,
  });
  const [assistantPrompt, setAssistantPrompt] = useState(ASSISTANT_STARTER.prompt);
  const [guideEvents, setGuideEvents] = useState<GuideEvent[]>([
    {
      id: "welcome-loop",
      createdAt: "",
      title: "Loop ready",
      detail:
        "Choose one intention, one audio variable, and one journal note. The app will keep each step visible.",
      tone: "gold",
    },
  ]);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "starter",
      role: "assistant",
      content: ASSISTANT_STARTER.response,
      provider: "local-safety-fallback",
      sections: {
        "Research-supported":
          "Comfortable, low-volume audio and structured breathing can be studied as relaxation supports, but individual results vary.",
        Hypothesis:
          "A Bentov-inspired oscillator frame can be used as a visualization metaphor, not as established biology.",
        "Historical spiritual teaching":
          "Solfeggio values can be offered as symbolic sound-practice presets.",
        "User experience":
          "Your journal entries are personal observations. They are useful for reflection, not proof of universal effects.",
      },
      actions: [
        "Choose one intention, one audio mode, and one variable to test.",
        "Run a short low-volume session with the meditation timer.",
        "Journal mood, focus, energy, sleep quality, stress, and context right after.",
      ],
      checks: [
        "Keep volume comfortable and stop if the body gives a red signal.",
        "Do not treat symbolic frequency labels as medical claims.",
        "Compare only your own repeated sessions before changing variables.",
      ],
      signals: [
        "Green: softer breathing and easier return of attention.",
        "Yellow: restlessness or boredom worth noting.",
        "Red: discomfort, dizziness, panic, or harsh volume means stop.",
      ],
    },
  ]);
  const [journalDraft, setJournalDraft] = useState({
    moodBefore: 5,
    moodAfter: 6,
    focus: 6,
    energy: 5,
    sleepQuality: 6,
    stressPerception: 4,
    notes: "",
  });
  const [assistantBusy, setAssistantBusy] = useState(false);

  const copy = LANGUAGE_PACKS[language];
  const activeProtocol = protocols.find((protocol) => protocol.id === activeProtocolId) ?? protocols[0];
  const { analyser, isPlaying, start, status, stop } = useAudioLab();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setJournalEntries(getStoredValue("resonance-journal", []));
      setProtocols(getStoredValue("resonance-protocols", DEFAULT_PROTOCOLS));
      setFrequencyPresets(getStoredValue("resonance-frequency-presets", []));
      setScheduledSessions(getStoredValue("resonance-scheduled-sessions", []));
      setHabitCheckins(getStoredValue("resonance-habit-checkins", []));
      setSoundscape(getStoredValue("resonance-soundscape", DEFAULT_SOUNDSCAPE));
      setRelaxMusic(getStoredValue("resonance-relax-music", DEFAULT_RELAX_MUSIC));
      setLanguage(getStoredValue("resonance-language", "en"));
      setTheme(getStoredValue("resonance-theme", "dark"));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("resonance-journal", JSON.stringify(journalEntries));
  }, [journalEntries]);

  useEffect(() => {
    localStorage.setItem("resonance-protocols", JSON.stringify(protocols));
  }, [protocols]);

  useEffect(() => {
    localStorage.setItem("resonance-frequency-presets", JSON.stringify(frequencyPresets));
  }, [frequencyPresets]);

  useEffect(() => {
    localStorage.setItem("resonance-scheduled-sessions", JSON.stringify(scheduledSessions));
  }, [scheduledSessions]);

  useEffect(() => {
    localStorage.setItem("resonance-habit-checkins", JSON.stringify(habitCheckins));
  }, [habitCheckins]);

  useEffect(() => {
    localStorage.setItem("resonance-soundscape", JSON.stringify(soundscape));
  }, [soundscape]);

  useEffect(() => {
    localStorage.setItem("resonance-relax-music", JSON.stringify(relaxMusic));
  }, [relaxMusic]);

  useEffect(() => {
    localStorage.setItem("resonance-language", JSON.stringify(language));
  }, [language]);

  useEffect(() => {
    localStorage.setItem("resonance-theme", JSON.stringify(theme));
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!timerActive) return undefined;

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.setTimeout(() => {
            setTimerActive(false);
            stop();
          }, 0);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [stop, timerActive]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBioSignal((current) => {
        const direction = isPlaying ? 1 : -0.25;
        const wobble = Math.sin(Date.now() / 2400);
        return {
          heartRate: Math.round(Math.min(84, Math.max(58, current.heartRate + wobble * 0.9 - direction * 0.15))),
          hrv: Math.round(Math.min(78, Math.max(28, current.hrv + direction * 0.9 + wobble * 1.4))),
          coherence: Math.round(
            Math.min(92, Math.max(36, current.coherence + direction * 1.1 + wobble * 1.8)),
          ),
          breathSync: Math.round(
            Math.min(95, Math.max(30, current.breathSync + direction * 1.3 + wobble * 1.2)),
          ),
        };
      });
    }, 1400);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const navItems = [
    { id: "dashboard", label: copy.dashboard, icon: Gauge },
    { id: "frequency", label: copy.frequencyLab, icon: Waves },
    { id: "session", label: copy.sessionBuilder, icon: Settings2 },
    { id: "visual", label: copy.visualization, icon: Radar },
    { id: "journal", label: copy.journal, icon: BookOpen },
    { id: "analytics", label: copy.analytics, icon: BarChart3 },
    { id: "assistant", label: copy.assistant, icon: Bot },
    { id: "research", label: copy.research, icon: Library },
  ];

  const activeLayerCount = layers.filter((layer) => layer.enabled).length;
  const moodDelta = safeAverage(journalEntries.map((entry) => entry.moodAfter - entry.moodBefore));
  const avgFocus = safeAverage(journalEntries.map((entry) => entry.focus));
  const avgStress = safeAverage(journalEntries.map((entry) => entry.stressPerception));
  const visualIntensity = isPlaying ? Math.min(1, 0.38 + activeLayerCount * 0.16) : 0.3;
  const selectedFrequencyChoice = FREQUENCY_CHOICES.find(
    (choice) => choice.id === selectedFrequencyChoiceId,
  );
  const timerTotalSeconds = Math.max(1, activeProtocol.durationMinutes * 60);
  const formattedRemaining = `${Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(remainingSeconds % 60).toString().padStart(2, "0")}`;
  const timerProgress = Math.round(
    Math.min(100, Math.max(0, ((timerTotalSeconds - remainingSeconds) / timerTotalSeconds) * 100)),
  );
  const todayKey = new Date().toISOString().slice(0, 10);
  const habitCheckedToday = habitCheckins.includes(todayKey);
  const recordGuideEvent = (event: Omit<GuideEvent, "id" | "createdAt">) => {
    setGuideEvents((current) => [
      {
        id: createId(),
        createdAt: new Date().toISOString(),
        ...event,
      },
      ...current,
    ].slice(0, 8));
  };
  const assistantGuideCards = [
    {
      title: "1. Intention",
      detail: "Name the state you want to observe, such as calm focus, sleep preparation, or creative reset.",
    },
    {
      title: "2. One variable",
      detail: "Change only one thing: frequency preset, mode, volume, breath pace, or session length.",
    },
    {
      title: "3. Signal check",
      detail: "Watch green, yellow, and red body signals. Comfort matters more than finishing a timer.",
    },
    {
      title: "4. Journal loop",
      detail: "Record before and after state, then repeat before claiming a pattern.",
    },
  ];
  const promptTemplates = [
    {
      label: "Calm focus",
      prompt: `Build a ${activeProtocol.durationMinutes}-minute calm-focus experiment using ${modeLabels[mode]}. Tell me the intention, one variable, green/yellow/red signals, and journal fields.`,
    },
    {
      label: "Sleep wind-down",
      prompt:
        "Create a gentle sleep wind-down session with low-volume audio, breath pacing, clear stop signals, and no medical claims.",
    },
    {
      label: "Evidence check",
      prompt:
        "Review my current frequency idea. Separate research support, hypothesis, historical teaching, and user experience. Tell me what not to claim.",
    },
    {
      label: "Next loop",
      prompt:
        "Use my current protocol and journal data to choose the next safest experiment loop, with one variable and a clear success note.",
    },
  ];

  const beginAudio = async () => {
    await start(layers, mode, binaural, isochronic, soundscape, relaxMusic);
    setRemainingSeconds(activeProtocol.durationMinutes * 60);
    setTimerActive(true);
    recordGuideEvent({
      title: "Audio session started",
      detail: `${activeProtocol.title} is running in ${modeLabels[mode]} mode. Keep volume gentle and watch green/yellow/red body signals.`,
      tone: "gold",
    });
  };

  const stopAudio = () => {
    setTimerActive(false);
    stop();
    recordGuideEvent({
      title: "Audio stopped",
      detail: "Write the journal entry before changing frequency, mode, or intention. Clean notes make the next loop useful.",
      tone: "cyan",
    });
  };

  const updateLayer = (id: string, patch: Partial<FrequencyLayer>) => {
    setLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    );
  };

  const addLayer = () => {
    setLayers((current) => [
      ...current,
      {
        id: createId(),
        label: "Custom tone",
        frequency: 528,
        volume: 0.12,
        pan: 0,
        waveform: "sine",
        enabled: true,
        note: "Custom experiment variable. Record what you changed before comparing sessions.",
      },
    ]);
  };

  const applyFrequencyChoice = (choice: FrequencyChoice) => {
    setSelectedFrequencyChoiceId(choice.id);
    recordGuideEvent({
      title: "Frequency preset applied",
      detail: `${choice.label} is now part of the experiment. Evidence lane: ${choice.evidence}. Treat it as a variable, not a promise.`,
      tone: choice.evidence === "Hypothesis" ? "cyan" : "gold",
    });

    if (choice.target === "beat") {
      setBinaural((current) => ({ ...current, beat: choice.frequency }));
      setIsochronic((current) => ({ ...current, pulse: choice.frequency }));
      if (mode === "pure") {
        setMode("binaural");
      }
    }

    if (choice.target === "carrier") {
      setBinaural((current) => ({ ...current, carrier: choice.frequency }));
      setIsochronic((current) => ({ ...current, carrier: choice.frequency }));
      setRelaxMusic((current) => ({
        ...current,
        rootFrequency: Math.min(528, Math.max(80, choice.frequency)),
      }));
      setLayers((current) => {
        const nextLayer: FrequencyLayer = {
          id: `choice-${choice.id}`,
          label: choice.label,
          frequency: choice.frequency,
          volume: 0.16,
          pan: 0,
          waveform: "sine",
          enabled: true,
          note: choice.note,
        };
        const withoutExisting = current.filter((layer) => layer.id !== nextLayer.id);
        return [nextLayer, ...withoutExisting].slice(0, 8);
      });
    }

    if (choice.target === "root") {
      setRelaxMusic((current) => ({
        ...current,
        rootFrequency: Math.min(528, Math.max(80, choice.frequency)),
        enabled: true,
      }));
    }

    if (choice.target === "layer") {
      setMode("pure");
      setLayers((current) => {
        const nextLayer: FrequencyLayer = {
          id: `choice-${choice.id}`,
          label: choice.label,
          frequency: choice.frequency,
          volume: 0.16,
          pan: 0,
          waveform: "sine",
          enabled: true,
          note: choice.note,
        };
        const withoutExisting = current.filter((layer) => layer.id !== nextLayer.id);
        return [nextLayer, ...withoutExisting].slice(0, 8);
      });
    }
  };

  const removeLayer = (id: string) => {
    setLayers((current) => current.filter((layer) => layer.id !== id));
  };

  const exportSession = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      safety: copy.noMedicalClaims,
      mode,
      layers,
      binaural,
      isochronic,
      soundscape,
      relaxMusic,
      activeProtocol,
      journalEntries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "resonance-lab-session.json";
    anchor.click();
    URL.revokeObjectURL(url);
    recordGuideEvent({
      title: "Session exported",
      detail: "Downloaded a JSON snapshot of the current protocol, audio settings, and journal history.",
      tone: "cyan",
    });
  };

  const saveProtocol = () => {
    const updated: SessionProtocol = {
      ...activeProtocol,
      id: activeProtocol.id,
      mode,
    };
    setProtocols((current) =>
      current.map((protocol) => (protocol.id === activeProtocol.id ? updated : protocol)),
    );
    recordGuideEvent({
      title: "Protocol saved",
      detail: `${activeProtocol.title} now stores the current audio mode. Re-run the same setup once before changing another variable.`,
      tone: "gold",
    });
  };

  const saveFrequencyPreset = () => {
    const preset: FrequencyPreset = {
      id: createId(),
      title: presetTitle.trim() || "Untitled preset",
      createdAt: new Date().toISOString(),
      mode,
      layers,
      binaural,
      isochronic,
      soundscape,
      relaxMusic,
    };
    setFrequencyPresets((current) => [preset, ...current].slice(0, 16));
    recordGuideEvent({
      title: "Frequency preset saved",
      detail: `${preset.title} is saved locally. Load it later to repeat the same conditions.`,
      tone: "gold",
    });
  };

  const loadFrequencyPreset = (preset: FrequencyPreset) => {
    setMode(preset.mode);
    setLayers(preset.layers);
    setBinaural(preset.binaural);
    setIsochronic(preset.isochronic);
    setSoundscape(preset.soundscape ?? DEFAULT_SOUNDSCAPE);
    setRelaxMusic(preset.relaxMusic ?? DEFAULT_RELAX_MUSIC);
    setPresetTitle(preset.title);
    recordGuideEvent({
      title: "Frequency preset loaded",
      detail: `${preset.title} restored mode, tones, soundscape, and relax music settings.`,
      tone: "cyan",
    });
  };

  const deleteFrequencyPreset = (id: string, title: string) => {
    setFrequencyPresets((current) => current.filter((item) => item.id !== id));
    recordGuideEvent({
      title: "Frequency preset deleted",
      detail: `${title} was removed from local presets. Current audio settings stayed unchanged.`,
      tone: "rose",
    });
  };

  const scheduleActiveProtocol = () => {
    if (!scheduleFor) {
      recordGuideEvent({
        title: "Schedule needs a time",
        detail: "Pick a date and time first, then schedule the active protocol.",
        tone: "rose",
      });
      return;
    }
    const next: ScheduledSession = {
      id: createId(),
      protocolTitle: activeProtocol.title,
      scheduledFor: scheduleFor,
      status: "scheduled",
    };
    setScheduledSessions((current) => [next, ...current].slice(0, 8));
    recordGuideEvent({
      title: "Session scheduled",
      detail: `${activeProtocol.title} is scheduled for ${new Date(scheduleFor).toLocaleString()}. Keep the setup unchanged if you want comparable notes.`,
      tone: "gold",
    });
  };

  const toggleHabitToday = () => {
    const willCheckIn = !habitCheckedToday;
    setHabitCheckins((current) =>
      current.includes(todayKey)
        ? current.filter((item) => item !== todayKey)
        : [todayKey, ...current].slice(0, 90),
    );
    recordGuideEvent({
      title: willCheckIn ? "Habit checked in" : "Habit check-in removed",
      detail: willCheckIn
        ? "Today is marked complete. Consistency is tracked as a rhythm, not a score."
        : "Today is no longer marked complete. The history remains honest.",
      tone: willCheckIn ? "gold" : "cyan",
    });
  };

  const requestJournalAnalysis = () => {
    const latest = journalEntries.slice(0, 3);
    const summary =
      latest.length === 0
        ? "I do not have journal entries yet. Build my first baseline loop and tell me exactly what to track after the session."
        : latest
            .map(
              (entry) =>
                `${entry.protocolTitle}: mood ${entry.moodBefore}->${entry.moodAfter}, focus ${entry.focus}, energy ${entry.energy}, sleep ${entry.sleepQuality}, stress ${entry.stressPerception}, notes "${entry.notes || "none"}"`,
            )
            .join("; ");
    const analysisPrompt = `Analyze my recent journal entries cautiously. Show the loop, signals, safety checks, and one next experiment. Data: ${summary}`;
    setAssistantPrompt(analysisPrompt);
    void submitAssistantPrompt(analysisPrompt);
  };

  const createProtocol = () => {
    const next: SessionProtocol = {
      id: createId(),
      title: "Custom Experiment",
      module: "Self-reflection",
      durationMinutes: 10,
      breathRate: 6,
      intention: "Observe one variable with patience.",
      affirmation: "I can experiment carefully and record honestly.",
      visualization: "Picture a clean lab notebook filling with clear observations.",
      mode,
    };
    setProtocols((current) => [...current, next]);
    setActiveProtocolId(next.id);
    recordGuideEvent({
      title: "Custom protocol created",
      detail: "A new experiment shell is ready. Edit intention, duration, breath pace, and visualization before saving.",
      tone: "gold",
    });
  };

  const updateActiveProtocol = (patch: Partial<SessionProtocol>) => {
    setProtocols((current) =>
      current.map((protocol) =>
        protocol.id === activeProtocol.id ? { ...protocol, ...patch } : protocol,
      ),
    );
  };

  const submitJournal = () => {
    const entry: JournalEntry = {
      id: createId(),
      createdAt: new Date().toISOString(),
      protocolTitle: activeProtocol.title,
      ...journalDraft,
    };
    setJournalEntries((current) => [entry, ...current].slice(0, 80));
    setJournalDraft((current) => ({ ...current, notes: "" }));
    recordGuideEvent({
      title: "Journal entry saved",
      detail: `${entry.protocolTitle}: mood ${entry.moodBefore} to ${entry.moodAfter}, focus ${entry.focus}/10, stress ${entry.stressPerception}/10.`,
      tone: "gold",
    });
  };

  const submitAssistantPrompt = async (promptOverride?: string) => {
    const trimmedPrompt = (promptOverride ?? assistantPrompt).trim();
    if (!trimmedPrompt) return;

    const userMessage: AssistantMessage = {
      id: createId(),
      role: "user",
      content: trimmedPrompt,
    };

    setAssistantMessages((current) => [...current, userMessage]);
    setAssistantBusy(true);
    recordGuideEvent({
      title: "Assistant loop started",
      detail: "Checking prompt, protocol, audio settings, journal data, safety boundaries, and evidence labels.",
      tone: "cyan",
    });

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          language,
          context: {
            activeProtocol,
            mode,
            binaural,
            isochronic,
            journalEntries: journalEntries.slice(0, 5),
          },
        }),
      });
      const payload = (await response.json()) as {
        answer: string;
        provider: string;
        sections: Record<EvidenceLevel, string>;
        actions?: string[];
        checks?: string[];
        signals?: string[];
      };

      if (!response.ok) {
        throw new Error(payload.answer || "Assistant request failed.");
      }

      setAssistantMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: payload.answer,
          provider: payload.provider,
          sections: payload.sections,
          actions: payload.actions,
          checks: payload.checks,
          signals: payload.signals,
        },
      ]);
      recordGuideEvent({
        title: "Assistant loop completed",
        detail: "Read the next actions, safety checks, session signals, and evidence lanes before running the next experiment.",
        tone: "gold",
      });
    } catch {
      setAssistantMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            "The assistant service is offline, so this local fallback is keeping the safety protocol active: change one variable, use low volume, and record subjective observations.",
          provider: "local-error-fallback",
        },
      ]);
      recordGuideEvent({
        title: "Assistant fallback used",
        detail: "The route did not return a full response, so the local safety fallback kept the loop cautious.",
        tone: "rose",
      });
    } finally {
      setAssistantBusy(false);
    }
  };

  const askAssistant = () => {
    void submitAssistantPrompt();
  };

  const renderModeControls = () => {
    if (mode === "binaural") {
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Carrier"
            value={binaural.carrier}
            min={40}
            max={1200}
            onChange={(carrier) => setBinaural((current) => ({ ...current, carrier }))}
            suffix="Hz"
          />
          <NumberField
            label="Beat offset"
            value={binaural.beat}
            min={0.5}
            max={40}
            step={0.5}
            onChange={(beat) => setBinaural((current) => ({ ...current, beat }))}
            suffix="Hz"
          />
          <SliderField
            label="Level"
            value={Math.round(binaural.volume * 100)}
            min={0}
            max={45}
            onChange={(volume) => setBinaural((current) => ({ ...current, volume: volume / 100 }))}
            suffix="%"
          />
        </div>
      );
    }

    if (mode === "isochronic") {
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Carrier"
            value={isochronic.carrier}
            min={40}
            max={1200}
            onChange={(carrier) => setIsochronic((current) => ({ ...current, carrier }))}
            suffix="Hz"
          />
          <NumberField
            label="Pulse"
            value={isochronic.pulse}
            min={0.5}
            max={40}
            step={0.5}
            onChange={(pulse) => setIsochronic((current) => ({ ...current, pulse }))}
            suffix="Hz"
          />
          <SliderField
            label="Level"
            value={Math.round(isochronic.volume * 100)}
            min={0}
            max={45}
            onChange={(volume) =>
              setIsochronic((current) => ({ ...current, volume: volume / 100 }))
            }
            suffix="%"
          />
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className="grid gap-4 rounded border border-white/10 bg-slate-950/50 p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]"
          >
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Layer</span>
              <input
                className="rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                value={layer.label}
                onChange={(event) => updateLayer(layer.id, { label: event.target.value })}
              />
              <span className="text-xs text-slate-500">{layer.note}</span>
            </label>
            <NumberField
              label="Frequency"
              value={layer.frequency}
              min={1}
              max={20000}
              onChange={(frequency) => updateLayer(layer.id, { frequency })}
              suffix="Hz"
            />
            <div className="grid gap-3">
              <SliderField
                label="Volume"
                value={Math.round(layer.volume * 100)}
                min={0}
                max={45}
                onChange={(volume) => updateLayer(layer.id, { volume: volume / 100 })}
                suffix="%"
              />
              <SliderField
                label="Pan"
                value={Math.round(layer.pan * 100)}
                min={-100}
                max={100}
                onChange={(pan) => updateLayer(layer.id, { pan: pan / 100 })}
              />
            </div>
            <div className="flex items-center gap-2 lg:flex-col lg:items-end">
              <button
                type="button"
                title={layer.enabled ? "Disable layer" : "Enable layer"}
                onClick={() => updateLayer(layer.id, { enabled: !layer.enabled })}
                className={`inline-flex h-10 w-10 items-center justify-center rounded border ${
                  layer.enabled
                    ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
                    : "border-white/10 bg-white/5 text-slate-400"
                }`}
              >
                <Check size={18} />
              </button>
              <button
                type="button"
                title="Remove layer"
                onClick={() => removeLayer(layer.id)}
                className="inline-flex h-10 w-10 items-center justify-center rounded border border-rose-300/25 bg-rose-400/10 text-rose-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="resonance-shell min-h-screen w-full max-w-full overflow-x-hidden text-[var(--text-primary)]">
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/70 px-4 py-5 xl:block">
          <BrandMark />

          <nav className="mt-8 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-3 rounded px-3 py-2 text-sm text-slate-300 transition hover:bg-white/8 hover:text-white"
                >
                  <Icon size={17} />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-8 rounded border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-50">
            <div className="flex items-center gap-2 font-medium">
              <FlaskConical size={16} />
              {copy.safety}
            </div>
            <p className="mt-2 text-emerald-100/80">{copy.noMedicalClaims}</p>
          </div>
        </aside>

        <section className="flex w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-20 min-w-0 border-b border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="hidden sm:block">
                  <BrandMark compact />
                </div>
                <div>
                  <div className="section-kicker flex items-center gap-2">
                    <Sparkles size={14} />
                    {copy.demoMode}
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold text-white">{copy.appName}</h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-200">
                  <Languages size={16} />
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                    className="bg-transparent text-sm outline-none"
                    aria-label="Language"
                  >
                    {Object.entries(languageNames).map(([code, label]) => (
                      <option key={code} className="bg-slate-950 text-white" value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="inline-flex rounded border border-white/10 bg-white/8 p-1">
                  {(["light", "dark", "system"] as ThemeMode[]).map((option) => {
                    const Icon = option === "light" ? Sun : option === "dark" ? Moon : Globe2;
                    return (
                      <button
                        key={option}
                        type="button"
                        title={`${option} theme`}
                        onClick={() => setTheme(option)}
                        className={`grid h-9 w-9 place-items-center rounded ${
                          theme === option ? "bg-emerald-300 text-slate-950" : "text-slate-300"
                        }`}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>

                <ControlButton title="Export session" onClick={exportSession}>
                  <Download size={16} />
                  {copy.export}
                </ControlButton>
              </div>
            </div>

            <nav className="mt-3 grid max-w-full grid-cols-2 gap-2 pb-1 sm:grid-cols-4 xl:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="inline-flex min-w-0 items-center gap-2 rounded border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-200"
                  >
                    <Icon className="shrink-0" size={16} />
                    <span className="truncate">{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </header>

          <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-8 px-4 py-6 lg:px-8">
            <motion.section
              id="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
            >
              <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] content-start gap-5">
                <div className="w-full min-w-0 max-w-full rounded border border-white/10 bg-[var(--panel-bg)] p-6 sm:p-8">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-6">
                    <div className="min-w-0 max-w-3xl">
                      <p className="section-kicker">The relaxation frequency codex</p>
                      <h2 className="mt-3 text-3xl font-semibold text-white sm:text-5xl">
                        {copy.appName}
                      </h2>
                      <div className="ornament-divider justify-start" aria-hidden="true">
                        <span>432 Hz</span>
                      </div>
                      <p className="mt-3 text-xl italic text-slate-300">
                        {copy.tagline}
                      </p>
                      <p className="mt-4 max-w-3xl text-slate-300">
                        Inspired by frequency ritual aesthetics and Bentov-style oscillator ideas,
                        rebuilt as a careful experimentation tool for sound, breath, visualization,
                        journaling, and transparent evidence labels.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isPlaying ? (
                        <ControlButton title={copy.stop} onClick={stopAudio} variant="danger">
                          <CirclePause size={18} />
                          {copy.stop}
                        </ControlButton>
                      ) : (
                        <ControlButton
                          title={copy.start}
                          onClick={beginAudio}
                          variant="primary"
                        >
                          <CirclePlay size={18} />
                          {copy.start}
                        </ControlButton>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 rounded border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">
                    {copy.noMedicalClaims}
                  </div>
                </div>

                <div className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricTile
                    label="Active variables"
                    value={`${activeLayerCount}`}
                    detail={`${modeLabels[mode]} configured`}
                    icon={<Waves size={18} />}
                  />
                  <MetricTile
                    label="Journal entries"
                    value={`${journalEntries.length}`}
                    detail="Local demo persistence"
                    icon={<BookOpen size={18} />}
                  />
                  <MetricTile
                    label="Mood delta"
                    value={moodDelta ? moodDelta.toFixed(1) : "0.0"}
                    detail="Subjective average"
                    icon={<Brain size={18} />}
                  />
                  <MetricTile
                    label="API safety"
                    value="10s"
                    detail="Assistant route limit"
                    icon={<Bot size={18} />}
                  />
                </div>

                <div className="rounded border border-white/10 bg-[var(--panel-bg)] p-4" aria-live="polite">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="section-kicker">Live guidance log</p>
                      <h3 className="mt-1 font-medium text-white">What just happened and what to do next</h3>
                    </div>
                    <span className="rounded border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs uppercase text-amber-100">
                      Loop memory
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {guideEvents.slice(0, 5).map((event) => {
                      const toneClass =
                        event.tone === "rose"
                          ? "border-rose-300/30 bg-rose-400/10 text-rose-100"
                          : event.tone === "cyan"
                            ? "border-sky-300/30 bg-sky-300/10 text-sky-100"
                            : "border-amber-300/25 bg-amber-300/10 text-amber-100";
                      return (
                        <div key={event.id} className={`rounded border p-3 ${toneClass}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium text-white">{event.title}</span>
                            <span className="text-xs opacity-70">
                              {event.createdAt
                                ? new Date(event.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "ready"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{event.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <FrequencyField intensity={visualIntensity} modeLabel={modeLabels[mode]} />
            </motion.section>

            <section id="frequency" className="grid gap-5 rounded border border-white/10 bg-[var(--panel-bg)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase text-emerald-200">{copy.frequencyLab}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Generator, binaural engine, and analyzer
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["pure", "binaural", "isochronic"] as FrequencyMode[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMode(option)}
                      className={`rounded border px-3 py-2 text-sm transition ${
                        mode === option
                          ? "border-emerald-300 bg-emerald-300 text-slate-950"
                          : "border-white/10 bg-white/8 text-slate-200 hover:bg-white/12"
                      }`}
                    >
                      {modeLabels[option]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded border border-emerald-300/20 bg-emerald-300/8 p-4">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <label className="grid gap-2 text-sm text-slate-300">
                    <span>Frequency library</span>
                    <select
                      value={selectedFrequencyChoiceId}
                      onChange={(event) => {
                        const choice = FREQUENCY_CHOICES.find(
                          (item) => item.id === event.target.value,
                        );
                        if (choice) applyFrequencyChoice(choice);
                      }}
                      className="min-h-12 rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                    >
                      <option value="">Choose Solfeggio, Schumann, beat, or Bentov frequency</option>
                      {[
                        "Solfeggio-style frequencies",
                        "Schumann and Earth resonance",
                        "10 beat-building frequencies",
                        "Bentov-inspired experiment frequencies",
                      ].map((group) => (
                        <optgroup key={group} label={group}>
                          {FREQUENCY_CHOICES.filter((choice) => choice.group === group).map(
                            (choice) => (
                              <option key={choice.id} value={choice.id}>
                                {choice.label}
                              </option>
                            ),
                          )}
                        </optgroup>
                      ))}
                    </select>
                  </label>

                  <div className="rounded border border-white/10 bg-slate-950/40 p-3">
                    {selectedFrequencyChoice ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-white">
                            {selectedFrequencyChoice.frequency} Hz
                          </span>
                          <span
                            className={`rounded border px-2 py-1 text-xs ${
                              evidenceTone[selectedFrequencyChoice.evidence]
                            }`}
                          >
                            {selectedFrequencyChoice.evidence}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          {selectedFrequencyChoice.note}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Applies to{" "}
                          {selectedFrequencyChoice.target === "beat"
                            ? "binaural beat offset and isochronic pulse"
                            : selectedFrequencyChoice.target === "carrier"
                              ? "carrier tone, relax music root, and a pure-tone layer"
                              : selectedFrequencyChoice.target === "root"
                                ? "relax music root"
                                : "pure-tone layer"}
                          .
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Pick one grouped preset to fill the current frequency fields. These are
                        experiment variables for relaxation and self-observation, not treatment
                        claims.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {renderModeControls()}

              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                <div className="rounded border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">Meditation timer</div>
                      <p className="text-xs text-slate-500">Linked to the active protocol</p>
                    </div>
                    <div className="font-mono text-2xl text-emerald-200">
                      {remainingSeconds ? formattedRemaining : `${activeProtocol.durationMinutes}:00`}
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded bg-slate-800">
                    <div
                      className="h-2 rounded bg-emerald-300"
                      style={{ width: `${timerActive ? timerProgress : 0}%` }}
                    />
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Timer ends the audio session automatically and keeps the experiment boundary
                    clean.
                  </div>
                </div>

                <div className="rounded border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">Relax music background</div>
                      <p className="text-xs text-slate-500">Starts when you press play</p>
                    </div>
                    <button
                      type="button"
                      title="Toggle relax music"
                      onClick={() =>
                        setRelaxMusic((current) => ({ ...current, enabled: !current.enabled }))
                      }
                      className={`rounded px-3 py-2 text-sm ${
                        relaxMusic.enabled
                          ? "bg-emerald-300 text-slate-950"
                          : "border border-white/10 text-slate-300"
                      }`}
                    >
                      {relaxMusic.enabled ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <NumberField
                      label="Root tone"
                      value={relaxMusic.rootFrequency}
                      min={80}
                      max={528}
                      step={1}
                      onChange={(rootFrequency) =>
                        setRelaxMusic((current) => ({ ...current, rootFrequency }))
                      }
                      suffix="Hz"
                    />
                    <SliderField
                      label="Music level"
                      value={Math.round(relaxMusic.volume * 100)}
                      min={0}
                      max={24}
                      onChange={(volume) =>
                        setRelaxMusic((current) => ({ ...current, volume: volume / 100 }))
                      }
                      suffix="%"
                    />
                    <SliderField
                      label="Warmth"
                      value={Math.round(relaxMusic.warmth * 100)}
                      min={0}
                      max={100}
                      onChange={(warmth) =>
                        setRelaxMusic((current) => ({ ...current, warmth: warmth / 100 }))
                      }
                      suffix="%"
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Frequency-inspired ambience for relaxation, not treatment.
                  </p>
                </div>

                <div className="rounded border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">Ambient soundscape</div>
                      <p className="text-xs text-slate-500">Generated locally in the browser</p>
                    </div>
                    <button
                      type="button"
                      title="Toggle soundscape"
                      onClick={() =>
                        setSoundscape((current) => ({ ...current, enabled: !current.enabled }))
                      }
                      className={`rounded px-3 py-2 text-sm ${
                        soundscape.enabled
                          ? "bg-emerald-300 text-slate-950"
                          : "border border-white/10 text-slate-300"
                      }`}
                    >
                      {soundscape.enabled ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2 text-sm text-slate-300">
                      <span>Texture</span>
                      <select
                        value={soundscape.type}
                        onChange={(event) =>
                          setSoundscape((current) => ({
                            ...current,
                            type: event.target.value as SoundscapeType,
                          }))
                        }
                        className="rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                      >
                        <option value="pink">Pink noise</option>
                        <option value="white">White noise</option>
                        <option value="brown">Brown noise</option>
                        <option value="rain">Rain texture</option>
                      </select>
                    </label>
                    <SliderField
                      label="Ambience level"
                      value={Math.round(soundscape.volume * 100)}
                      min={0}
                      max={25}
                      onChange={(volume) =>
                        setSoundscape((current) => ({ ...current, volume: volume / 100 }))
                      }
                      suffix="%"
                    />
                  </div>
                </div>

                <div className="rounded border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-sm font-medium text-white">Frequency presets</div>
                  <p className="text-xs text-slate-500">Save and reload local experiments</p>
                  <div className="mt-4 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                      value={presetTitle}
                      onChange={(event) => setPresetTitle(event.target.value)}
                    />
                    <button
                      type="button"
                      title="Save current frequency preset"
                      onClick={saveFrequencyPreset}
                      className="grid h-10 w-10 place-items-center rounded bg-emerald-300 text-slate-950"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                  <div className="mt-3 grid max-h-32 gap-2 overflow-auto">
                    {frequencyPresets.length === 0 ? (
                      <div className="rounded border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-400">
                        No saved presets yet.
                      </div>
                    ) : (
                      frequencyPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between gap-2 rounded border border-white/10 bg-white/6 px-3 py-2"
                        >
                          <button
                            type="button"
                            onClick={() => loadFrequencyPreset(preset)}
                            className="min-w-0 text-left text-xs text-slate-200"
                          >
                            <span className="block truncate">{preset.title}</span>
                            <span className="text-slate-500">{modeLabels[preset.mode]}</span>
                          </button>
                          <button
                            type="button"
                            title="Delete preset"
                            onClick={() => deleteFrequencyPreset(preset.id, preset.title)}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded text-rose-100 hover:bg-rose-400/15"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {mode === "pure" && (
                  <ControlButton title="Add tone layer" onClick={addLayer}>
                    <Plus size={16} />
                    Add layer
                  </ControlButton>
                )}
                <ControlButton title="Save protocol" onClick={saveProtocol}>
                  <Save size={16} />
                  {copy.save}
                </ControlButton>
                {isPlaying ? (
                  <ControlButton title={copy.stop} onClick={stopAudio} variant="danger">
                    <CirclePause size={16} />
                    {copy.stop}
                  </ControlButton>
                ) : (
                  <ControlButton
                    title={copy.start}
                    onClick={beginAudio}
                    variant="primary"
                  >
                    <CirclePlay size={16} />
                    {copy.start}
                  </ControlButton>
                )}
              </div>

              <p className="text-sm text-slate-400">{status}</p>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm text-slate-300">Waveform display</div>
                  <AnalyzerCanvas analyser={analyser} isPlaying={isPlaying} variant="waveform" />
                </div>
                <div>
                  <div className="mb-2 text-sm text-slate-300">Spectrum analyzer</div>
                  <AnalyzerCanvas analyser={analyser} isPlaying={isPlaying} variant="spectrum" />
                </div>
              </div>
            </section>

            <section id="session" className="grid gap-5 rounded border border-white/10 bg-[var(--panel-bg)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase text-emerald-200">{copy.sessionBuilder}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Meditation, breath pacing, visualization, and intention design
                  </h2>
                </div>
                <ControlButton title="Create custom protocol" onClick={createProtocol}>
                  <Plus size={16} />
                  New protocol
                </ControlButton>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="grid content-start gap-2">
                  {protocols.map((protocol) => (
                    <button
                      key={protocol.id}
                      type="button"
                      onClick={() => {
                        setActiveProtocolId(protocol.id);
                        setMode(protocol.mode);
                      }}
                      className={`flex items-center justify-between rounded border px-4 py-3 text-left transition ${
                        activeProtocol.id === protocol.id
                          ? "border-emerald-300/50 bg-emerald-300/12 text-white"
                          : "border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <span>
                        <span className="block font-medium">{protocol.title}</span>
                        <span className="text-sm text-slate-400">
                          {protocol.module} - {protocol.durationMinutes} min
                        </span>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 rounded border border-white/10 bg-slate-950/40 p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                      <span>Protocol title</span>
                      <input
                        className="rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                        value={activeProtocol.title}
                        onChange={(event) => updateActiveProtocol({ title: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-300">
                      <span>Module</span>
                      <select
                        value={activeProtocol.module}
                        onChange={(event) => updateActiveProtocol({ module: event.target.value })}
                        className="rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                      >
                        {EXPLORATION_MODULES.map((module) => (
                          <option key={module}>{module}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <SliderField
                      label="Duration"
                      value={activeProtocol.durationMinutes}
                      min={3}
                      max={60}
                      onChange={(durationMinutes) => updateActiveProtocol({ durationMinutes })}
                      suffix="m"
                    />
                    <SliderField
                      label="Breath pace"
                      value={activeProtocol.breathRate}
                      min={3}
                      max={10}
                      onChange={(breathRate) => updateActiveProtocol({ breathRate })}
                      suffix="/m"
                    />
                  </div>

                  <label className="grid gap-2 text-sm text-slate-300">
                    <span>Intention</span>
                    <textarea
                      className="min-h-20 rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                      value={activeProtocol.intention}
                      onChange={(event) => updateActiveProtocol({ intention: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-300">
                    <span>Affirmation</span>
                    <input
                      className="rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                      value={activeProtocol.affirmation}
                      onChange={(event) => updateActiveProtocol({ affirmation: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-300">
                    <span>Visualization script</span>
                    <textarea
                      className="min-h-24 rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                      value={activeProtocol.visualization}
                      onChange={(event) =>
                        updateActiveProtocol({ visualization: event.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            </section>

            <section id="visual" className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded border border-white/10 bg-[var(--panel-bg)] p-5">
                <p className="text-sm uppercase text-emerald-200">{copy.visualization}</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Breath pacing and attention field
                </h2>
                <p className="mt-3 text-slate-300">
                  The visual system reacts to session mode and audio state. It is designed as an
                  attentional anchor, not as evidence of brain activity.
                </p>
                <div className="mt-6 grid place-items-center">
                  <div
                    className="breath-circle"
                    style={{ animationDuration: `${Math.max(4, 60 / activeProtocol.breathRate)}s` }}
                  >
                    <span>Inhale</span>
                    <span>Exhale</span>
                  </div>
                </div>
              </div>
              <FrequencyField intensity={visualIntensity + 0.12} modeLabel="Secondary" />
            </section>

            <section id="journal" className="grid gap-5 rounded border border-white/10 bg-[var(--panel-bg)] p-5">
              <div>
                <p className="text-sm uppercase text-emerald-200">{copy.journal}</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Experiment tracker and subjective notes
                </h2>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="grid gap-4 rounded border border-white/10 bg-slate-950/40 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <SliderField
                      label={copy.moodBefore}
                      value={journalDraft.moodBefore}
                      min={1}
                      max={10}
                      onChange={(moodBefore) =>
                        setJournalDraft((current) => ({ ...current, moodBefore }))
                      }
                    />
                    <SliderField
                      label={copy.moodAfter}
                      value={journalDraft.moodAfter}
                      min={1}
                      max={10}
                      onChange={(moodAfter) =>
                        setJournalDraft((current) => ({ ...current, moodAfter }))
                      }
                    />
                    <SliderField
                      label="Focus"
                      value={journalDraft.focus}
                      min={1}
                      max={10}
                      onChange={(focus) => setJournalDraft((current) => ({ ...current, focus }))}
                    />
                    <SliderField
                      label="Energy"
                      value={journalDraft.energy}
                      min={1}
                      max={10}
                      onChange={(energy) => setJournalDraft((current) => ({ ...current, energy }))}
                    />
                    <SliderField
                      label="Sleep quality"
                      value={journalDraft.sleepQuality}
                      min={1}
                      max={10}
                      onChange={(sleepQuality) =>
                        setJournalDraft((current) => ({ ...current, sleepQuality }))
                      }
                    />
                    <SliderField
                      label="Stress perception"
                      value={journalDraft.stressPerception}
                      min={1}
                      max={10}
                      onChange={(stressPerception) =>
                        setJournalDraft((current) => ({ ...current, stressPerception }))
                      }
                    />
                  </div>
                  <label className="grid gap-2 text-sm text-slate-300">
                    <span>{copy.notes}</span>
                    <textarea
                      className="min-h-28 rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                      value={journalDraft.notes}
                      onChange={(event) =>
                        setJournalDraft((current) => ({ ...current, notes: event.target.value }))
                      }
                      placeholder="What changed, what stayed the same, and what else was happening today?"
                    />
                  </label>
                  <ControlButton title="Save journal entry" onClick={submitJournal} variant="primary">
                    <Save size={16} />
                    Save entry
                  </ControlButton>
                </div>

                <div className="grid max-h-[520px] gap-3 overflow-auto pr-1">
                  {journalEntries.length === 0 ? (
                    <div className="rounded border border-white/10 bg-white/6 p-5 text-slate-300">
                      No entries yet. Run a session, record your state, then compare only your own
                      trends over time.
                    </div>
                  ) : (
                    journalEntries.map((entry) => (
                      <article key={entry.id} className="rounded border border-white/10 bg-white/6 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-medium text-white">{entry.protocolTitle}</h3>
                          <time className="text-xs text-slate-500">
                            {new Date(entry.createdAt).toLocaleString()}
                          </time>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                          <span>Mood {entry.moodBefore} to {entry.moodAfter}</span>
                          <span>Focus {entry.focus}/10</span>
                          <span>Stress {entry.stressPerception}/10</span>
                        </div>
                        {entry.notes && <p className="mt-3 text-sm text-slate-400">{entry.notes}</p>}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section id="analytics" className="grid gap-5 rounded border border-white/10 bg-[var(--panel-bg)] p-5">
              <div>
                <p className="text-sm uppercase text-emerald-200">{copy.analytics}</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Long-term trend analysis and progress reports
                </h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MetricTile
                  label="Average focus"
                  value={avgFocus ? avgFocus.toFixed(1) : "0.0"}
                  detail="Self-reported scale"
                  icon={<Gauge size={18} />}
                />
                <MetricTile
                  label="Average stress"
                  value={avgStress ? avgStress.toFixed(1) : "0.0"}
                  detail="Lower may feel better, but context matters"
                  icon={<Activity size={18} />}
                />
                <MetricTile
                  label="Habit streak"
                  value={journalEntries.length ? `${Math.min(7, journalEntries.length)}d` : "0d"}
                  detail="Demo habit tracker"
                  icon={<CalendarDays size={18} />}
                />
              </div>
              <div className="rounded border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-white">Biofeedback simulator</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Demo signal for HR, HRV, coherence, and breath synchrony. Production hardware
                      data should be stored as raw samples and never converted into diagnoses.
                    </p>
                  </div>
                  <span className="rounded border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs uppercase text-amber-100">
                    Simulator fallback
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {[
                    ["Heart rate", bioSignal.heartRate, "bpm", 120],
                    ["HRV", bioSignal.hrv, "ms", 100],
                    ["Coherence", bioSignal.coherence, "%", 100],
                    ["Breath sync", bioSignal.breathSync, "%", 100],
                  ].map(([label, value, unit, max]) => (
                    <div key={label} className="rounded border border-white/10 bg-white/6 p-3">
                      <div className="flex items-center justify-between gap-2 text-sm text-slate-300">
                        <span>{label}</span>
                        <span className="font-mono text-emerald-200">
                          {value}
                          {unit}
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded bg-slate-800">
                        <div
                          className="h-2 rounded bg-emerald-300"
                          style={{ width: `${Math.min(100, (Number(value) / Number(max)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                {journalEntries.slice(0, 12).map((entry) => (
                  <div key={entry.id} className="grid gap-2 rounded border border-white/10 bg-white/6 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      <span>{entry.protocolTitle}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["Mood", entry.moodAfter],
                        ["Focus", entry.focus],
                        ["Energy", entry.energy],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="w-14 text-xs text-slate-500">{label}</span>
                          <div className="h-2 flex-1 rounded bg-slate-800">
                            <div
                              className="h-2 rounded bg-emerald-300"
                              style={{ width: `${Number(value) * 10}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="assistant" className="grid gap-5 rounded border border-white/10 bg-[var(--panel-bg)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase text-emerald-200">{copy.assistant}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Ask, analyze, and design safer experiment loops
                  </h2>
                  <p className="mt-3 max-w-3xl text-slate-300">
                    This assistant acts like a calm lab guide: it names the intention, checks the
                    evidence lane, gives body-signal notes, and turns every answer into a repeatable
                    session loop.
                  </p>
                </div>
                <span className="rounded border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs uppercase text-amber-100">
                  Guidance, not treatment
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {assistantGuideCards.map((card) => (
                  <div key={card.title} className="rounded border border-white/10 bg-white/6 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Check size={15} />
                      {card.title}
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{card.detail}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="grid content-start gap-4">
                  <label className="grid gap-2 text-sm text-slate-300">
                    <span className="flex items-center justify-between gap-3">
                      <span>Prompt</span>
                      <span className="text-xs text-slate-500">Ask for a loop, not a miracle.</span>
                    </span>
                    <textarea
                      className="min-h-44 rounded border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                      value={assistantPrompt}
                      onChange={(event) => setAssistantPrompt(event.target.value)}
                    />
                  </label>

                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-white">Prompt templates</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {promptTemplates.map((template) => (
                        <button
                          key={template.label}
                          type="button"
                          onClick={() => setAssistantPrompt(template.prompt)}
                          className="rounded border border-white/10 bg-white/6 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
                        >
                          <span className="block font-medium text-white">{template.label}</span>
                          <span className="text-xs text-slate-500">Load guided prompt</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <ControlButton
                      title="Ask assistant"
                      onClick={askAssistant}
                      variant="primary"
                      disabled={assistantBusy}
                    >
                      <Bot size={16} />
                      {assistantBusy ? "Building loop..." : "Ask"}
                    </ControlButton>
                    <ControlButton
                      title="Analyze journal entries"
                      onClick={requestJournalAnalysis}
                      disabled={assistantBusy}
                    >
                      <BookOpen size={16} />
                      Analyze journal
                    </ControlButton>
                  </div>

                  <div className="rounded border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <FlaskConical size={16} />
                      What the assistant will deliver
                    </div>
                    <div className="mt-3 grid gap-2">
                      {[
                        "A bounded session plan with one changed variable.",
                        "A clear separation between research, hypothesis, tradition, and personal report.",
                        "Green, yellow, and red signals for deciding whether to continue, soften, or stop.",
                        "A journal loop that a first-time user can follow without guessing.",
                      ].map((item) => (
                        <div key={item} className="flex gap-2">
                          <Check className="mt-0.5 shrink-0 text-emerald-200" size={14} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid max-h-[760px] gap-3 overflow-auto pr-1" aria-live="polite">
                  {assistantBusy && (
                    <div className="rounded border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
                      Checking the prompt, active protocol, audio settings, journal data, safety
                      boundaries, and evidence labels.
                    </div>
                  )}
                  {assistantMessages.map((message) => (
                    <article
                      key={message.id}
                      className={`rounded border p-4 ${
                        message.role === "user"
                          ? "border-slate-300/20 bg-slate-300/8"
                          : "border-emerald-300/20 bg-emerald-300/8"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-white">
                          {message.role === "user" ? "You" : "Assistant"}
                        </span>
                        {message.provider && (
                          <span className="text-xs text-slate-500">{message.provider}</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{message.content}</p>

                      {message.role === "assistant" && (
                        <div className="mt-4 grid gap-3">
                          {[
                            { title: "Next actions", items: message.actions, Icon: Check },
                            { title: "Safety checks", items: message.checks, Icon: FlaskConical },
                            { title: "Session signals", items: message.signals, Icon: Waves },
                          ].map(({ title, items, Icon }) =>
                            Array.isArray(items) && items.length > 0 ? (
                              <div key={title} className="rounded border border-white/10 bg-white/6 p-3">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
                                  <Icon size={14} />
                                  {title}
                                </div>
                                <div className="mt-2 grid gap-2 text-sm text-slate-300">
                                  {items.map((item) => (
                                    <div key={item} className="flex gap-2">
                                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null,
                          )}
                        </div>
                      )}

                      {message.sections && (
                        <div className="mt-4 grid gap-2">
                          {(Object.entries(message.sections) as [EvidenceLevel, string][]).map(
                            ([level, text]) => (
                              <div key={level} className={`rounded border p-3 ${evidenceTone[level]}`}>
                                <div className="text-xs font-semibold uppercase">{level}</div>
                                <p className="mt-1 text-sm">{text}</p>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section id="research" className="grid gap-5 rounded border border-white/10 bg-[var(--panel-bg)] p-5">
              <div>
                <p className="text-sm uppercase text-emerald-200">{copy.research}</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Clear labels for evidence, tradition, and personal reports
                </h2>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {RESEARCH_LIBRARY.map((item) => (
                  <article key={item.title} className={`rounded border p-4 ${evidenceTone[item.level]}`}>
                    <div className="text-xs font-semibold uppercase">{item.level}</div>
                    <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm">{item.summary}</p>
                    <p className="mt-3 text-sm opacity-85">{item.usage}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-4 rounded border border-white/10 bg-[var(--panel-bg)] p-5">
              <div>
                <p className="text-sm uppercase text-emerald-200">Advanced SaaS modules</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Scheduler, habit tracking, community library, and custom protocols
                </h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded border border-white/10 bg-white/6 p-4">
                  <h3 className="font-medium text-white">Session scheduler</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Schedule the active protocol locally. Production reminders should run through
                    the Nest scheduler.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <input
                      type="datetime-local"
                      value={scheduleFor}
                      onChange={(event) => setScheduleFor(event.target.value)}
                      className="min-h-10 min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                    />
                    <ControlButton title="Schedule active protocol" onClick={scheduleActiveProtocol}>
                      <CalendarDays size={16} />
                      Schedule
                    </ControlButton>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {scheduledSessions.length === 0 ? (
                      <div className="rounded border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-500">
                        No scheduled sessions yet.
                      </div>
                    ) : (
                      scheduledSessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between gap-3 rounded border border-white/10 bg-slate-950/50 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 truncate text-slate-200">
                            {session.protocolTitle}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {new Date(session.scheduledFor).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded border border-white/10 bg-white/6 p-4">
                  <h3 className="font-medium text-white">Habit tracking</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Track consistency without ranking yourself. This is a check-in, not a score.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <ControlButton
                      title="Toggle today's habit check-in"
                      onClick={toggleHabitToday}
                      variant={habitCheckedToday ? "primary" : "secondary"}
                    >
                      <Check size={16} />
                      {habitCheckedToday ? "Checked in today" : "Check in today"}
                    </ControlButton>
                    <span className="text-sm text-slate-400">
                      {habitCheckins.length} total check-ins
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-1">
                    {Array.from({ length: 14 }).map((_, index) => {
                      const day = new Date();
                      day.setDate(day.getDate() - index);
                      const key = day.toISOString().slice(0, 10);
                      return (
                        <div
                          key={key}
                          title={key}
                          className={`h-8 rounded border ${
                            habitCheckins.includes(key)
                              ? "border-emerald-300 bg-emerald-300"
                              : "border-white/10 bg-slate-950/50"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="rounded border border-white/10 bg-white/6 p-4">
                  <h3 className="font-medium text-white">Community protocol library</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Demo library uses local protocols with moderation-ready evidence language.
                  </p>
                  <div className="mt-4 grid gap-2">
                    {protocols.slice(0, 4).map((protocol) => (
                      <button
                        key={protocol.id}
                        type="button"
                        onClick={() => setActiveProtocolId(protocol.id)}
                        className="rounded border border-white/10 bg-slate-950/50 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/8"
                      >
                        <span className="block font-medium text-white">{protocol.title}</span>
                        <span className="text-xs text-slate-500">
                          {protocol.module} - evidence labels required before publishing
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded border border-white/10 bg-white/6 p-4">
                  <h3 className="font-medium text-white">AI-generated meditation journeys</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Send the assistant a journey request that keeps uncertainty labels intact.
                  </p>
                  <div className="mt-4 grid gap-2">
                    <ControlButton
                      title="Draft AI journey prompt"
                      onClick={() =>
                        setAssistantPrompt(
                          `Generate a ${activeProtocol.durationMinutes}-minute ${activeProtocol.module.toLowerCase()} meditation journey using my intention: ${activeProtocol.intention}. Separate research, hypothesis, historical teaching, and user experience.`,
                        )
                      }
                      variant="primary"
                    >
                      <Sparkles size={16} />
                      Draft journey prompt
                    </ControlButton>
                    <a
                      href="#assistant"
                      className="inline-flex min-h-10 items-center justify-center rounded border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 hover:bg-white/8"
                    >
                      Open assistant
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
