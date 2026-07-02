export type LanguageCode =
  | "en"
  | "th"
  | "zh"
  | "ja"
  | "ko"
  | "es"
  | "de"
  | "fr";

export type ThemeMode = "light" | "dark" | "system";

export type FrequencyMode = "pure" | "binaural" | "isochronic";

export type SoundscapeType = "white" | "pink" | "brown" | "rain";

export type EvidenceLevel =
  | "Research-supported"
  | "Hypothesis"
  | "Historical spiritual teaching"
  | "User experience";

export type FrequencyPresetGroup =
  | "Solfeggio-style frequencies"
  | "Schumann and Earth resonance"
  | "10 beat-building frequencies"
  | "Bentov-inspired experiment frequencies";

export interface FrequencyChoice {
  id: string;
  group: FrequencyPresetGroup;
  label: string;
  frequency: number;
  target: "carrier" | "beat" | "root" | "layer";
  evidence: EvidenceLevel;
  note: string;
}

export interface FrequencyLayer {
  id: string;
  label: string;
  frequency: number;
  volume: number;
  pan: number;
  waveform: OscillatorType;
  enabled: boolean;
  note: string;
}

export interface BinauralConfig {
  carrier: number;
  beat: number;
  volume: number;
}

export interface IsochronicConfig {
  carrier: number;
  pulse: number;
  volume: number;
}

export interface SoundscapeConfig {
  enabled: boolean;
  type: SoundscapeType;
  volume: number;
}

export interface RelaxMusicConfig {
  enabled: boolean;
  rootFrequency: number;
  volume: number;
  warmth: number;
}

export interface FrequencyPreset {
  id: string;
  title: string;
  createdAt: string;
  mode: FrequencyMode;
  layers: FrequencyLayer[];
  binaural: BinauralConfig;
  isochronic: IsochronicConfig;
  soundscape: SoundscapeConfig;
  relaxMusic: RelaxMusicConfig;
}

export interface SessionProtocol {
  id: string;
  title: string;
  module: string;
  durationMinutes: number;
  breathRate: number;
  intention: string;
  affirmation: string;
  visualization: string;
  mode: FrequencyMode;
}

export interface JournalEntry {
  id: string;
  createdAt: string;
  protocolTitle: string;
  moodBefore: number;
  moodAfter: number;
  focus: number;
  energy: number;
  sleepQuality: number;
  stressPerception: number;
  notes: string;
}

export interface AssistantTraceStep {
  title: string;
  detail: string;
  state: "ready" | "watch" | "stop";
}

export interface AssistantContractItem {
  label: string;
  value: string;
  state: "ready" | "watch" | "stop";
}

export type AssistantMode = "ask" | "analyze";

export interface AssistantGuidanceNote {
  phase: string;
  instruction: string;
  reason: string;
  state: "ready" | "watch" | "stop";
}

export type AssistantDecisionState = "continue" | "soften" | "stop";

export interface AssistantDecisionGate {
  state: AssistantDecisionState;
  title: string;
  rationale: string;
  nextStep: string;
}

export interface AssistantJournalCue {
  label: string;
  prompt: string;
  reason: string;
}

export interface AssistantLoopPrescription {
  state: AssistantDecisionState;
  title: string;
  intention: string;
  fixedVariable: string;
  changedVariable: string;
  audioBoundary: string;
  signalToWatch: string;
  journalFocus: string;
  nextAction: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  assistantMode?: AssistantMode;
  sections?: Record<EvidenceLevel, string>;
  contract?: AssistantContractItem[];
  guidance?: AssistantGuidanceNote[];
  decision?: AssistantDecisionGate;
  journalCues?: AssistantJournalCue[];
  loopPrescription?: AssistantLoopPrescription;
  actions?: string[];
  checks?: string[];
  signals?: string[];
  trace?: AssistantTraceStep[];
  nextPrompt?: string;
}

export interface ResearchItem {
  title: string;
  level: EvidenceLevel;
  summary: string;
  usage: string;
}
