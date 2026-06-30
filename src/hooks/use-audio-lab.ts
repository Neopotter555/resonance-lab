"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BinauralConfig,
  FrequencyLayer,
  FrequencyMode,
  IsochronicConfig,
  RelaxMusicConfig,
  SoundscapeConfig,
} from "@/lib/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const stopAndDisconnect = (node: AudioNode) => {
  try {
    if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
      (node as AudioScheduledSourceNode).stop();
    }
  } catch {
    // Node may already be stopped. Disconnect cleanup still matters.
  }

  try {
    node.disconnect();
  } catch {
    // Disconnected nodes are harmless.
  }
};

export function useAudioLab() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Audio engine standing by.");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);

  const stop = useCallback(() => {
    activeNodesRef.current.forEach(stopAndDisconnect);
    activeNodesRef.current = [];
    analyserRef.current = null;
    setAnalyser(null);

    if (contextRef.current) {
      contextRef.current.close().catch(() => undefined);
      contextRef.current = null;
    }

    setIsPlaying(false);
    setStatus("Audio stopped. Journal any observations before changing variables.");
  }, []);

  const bootToneBridge = useCallback(async () => {
    try {
      const Tone = await import("tone");
      await Tone.start();
      Tone.Transport.stop();
      return "Tone.js bridge ready; Web Audio renderer active.";
    } catch {
      return "Web Audio renderer active; Tone.js bridge could not be initialized in this browser.";
    }
  }, []);

  const createContext = useCallback(async () => {
    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;

    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.82;
    masterGain.connect(analyser);
    analyser.connect(audioContext.destination);

    contextRef.current = audioContext;
    analyserRef.current = analyser;
    setAnalyser(analyser);

    return { audioContext, masterGain };
  }, []);

  const addPureLayer = useCallback(
    (audioContext: AudioContext, masterGain: GainNode, layer: FrequencyLayer) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const pan = audioContext.createStereoPanner();

      oscillator.type = layer.waveform;
      oscillator.frequency.value = clamp(layer.frequency, 1, 20000);
      gain.gain.value = clamp(layer.volume, 0, 0.6);
      pan.pan.value = clamp(layer.pan, -1, 1);

      oscillator.connect(gain);
      gain.connect(pan);
      pan.connect(masterGain);
      oscillator.start();

      activeNodesRef.current.push(oscillator, gain, pan);
    },
    [],
  );

  const addBinauralPair = useCallback(
    (audioContext: AudioContext, masterGain: GainNode, config: BinauralConfig) => {
      const carrier = clamp(config.carrier, 40, 1200);
      const beat = clamp(config.beat, 0.5, 40);
      const leftOscillator = audioContext.createOscillator();
      const rightOscillator = audioContext.createOscillator();
      const leftGain = audioContext.createGain();
      const rightGain = audioContext.createGain();
      const merger = audioContext.createChannelMerger(2);

      leftOscillator.type = "sine";
      rightOscillator.type = "sine";
      leftOscillator.frequency.value = carrier - beat / 2;
      rightOscillator.frequency.value = carrier + beat / 2;
      leftGain.gain.value = clamp(config.volume, 0, 0.45);
      rightGain.gain.value = clamp(config.volume, 0, 0.45);

      leftOscillator.connect(leftGain);
      rightOscillator.connect(rightGain);
      leftGain.connect(merger, 0, 0);
      rightGain.connect(merger, 0, 1);
      merger.connect(masterGain);
      leftOscillator.start();
      rightOscillator.start();

      activeNodesRef.current.push(leftOscillator, rightOscillator, leftGain, rightGain, merger);
    },
    [],
  );

  const addIsochronicPulse = useCallback(
    (audioContext: AudioContext, masterGain: GainNode, config: IsochronicConfig) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const pulseOscillator = audioContext.createOscillator();
      const pulseGain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = clamp(config.carrier, 40, 1200);
      pulseOscillator.type = "square";
      pulseOscillator.frequency.value = clamp(config.pulse, 0.5, 40);

      gain.gain.value = clamp(config.volume, 0, 0.5) * 0.5;
      pulseGain.gain.value = clamp(config.volume, 0, 0.5) * 0.5;

      pulseOscillator.connect(pulseGain);
      pulseGain.connect(gain.gain);
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start();
      pulseOscillator.start();

      activeNodesRef.current.push(oscillator, pulseOscillator, gain, pulseGain);
    },
    [],
  );

  const createNoiseBuffer = useCallback((audioContext: AudioContext, config: SoundscapeConfig) => {
    const frameCount = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    let pink0 = 0;
    let pink1 = 0;
    let pink2 = 0;

    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;

      if (config.type === "white") {
        data[index] = white * 0.5;
      } else if (config.type === "brown") {
        brown = (brown + 0.02 * white) / 1.02;
        data[index] = brown * 3.5;
      } else if (config.type === "rain") {
        const patter = Math.random() > 0.985 ? Math.random() * 1.4 : 0;
        data[index] = white * 0.16 + patter;
      } else {
        pink0 = 0.99765 * pink0 + white * 0.099046;
        pink1 = 0.963 * pink1 + white * 0.2965164;
        pink2 = 0.57 * pink2 + white * 1.0526913;
        data[index] = (pink0 + pink1 + pink2 + white * 0.1848) * 0.05;
      }
    }

    return buffer;
  }, []);

  const addSoundscape = useCallback(
    (audioContext: AudioContext, masterGain: GainNode, config: SoundscapeConfig) => {
      if (!config.enabled || config.volume <= 0) return;

      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      source.buffer = createNoiseBuffer(audioContext, config);
      source.loop = true;
      gain.gain.value = clamp(config.volume, 0, 0.25);
      filter.type = config.type === "rain" ? "highpass" : "lowpass";
      filter.frequency.value = config.type === "rain" ? 1200 : 4200;
      filter.Q.value = 0.6;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start();

      activeNodesRef.current.push(source, filter, gain);
    },
    [createNoiseBuffer],
  );

  const addRelaxMusic = useCallback(
    (audioContext: AudioContext, masterGain: GainNode, config: RelaxMusicConfig) => {
      if (!config.enabled || config.volume <= 0) return;

      const destination = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      const lfo = audioContext.createOscillator();
      const lfoDepth = audioContext.createGain();
      const root = clamp(config.rootFrequency, 80, 528);
      const chordRatios = [1, 1.25, 1.5, 2, 2.5];
      const pans = [-0.38, -0.16, 0.08, 0.28, 0.42];
      const oscillatorNodes: AudioNode[] = [];

      destination.gain.value = clamp(config.volume, 0, 0.28);
      filter.type = "lowpass";
      filter.frequency.value = 900 + clamp(config.warmth, 0, 1) * 2200;
      filter.Q.value = 0.72;

      lfo.type = "sine";
      lfo.frequency.value = 0.045;
      lfoDepth.gain.value = destination.gain.value * 0.28;
      lfo.connect(lfoDepth);
      lfoDepth.connect(destination.gain);
      lfo.start();

      chordRatios.forEach((ratio, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const pan = audioContext.createStereoPanner();
        const detune = index % 2 === 0 ? -4 : 5;

        oscillator.type = index === 0 ? "sine" : "triangle";
        oscillator.frequency.value = root * ratio;
        oscillator.detune.value = detune;
        gain.gain.value = 0.16 / (index + 1);
        pan.pan.value = pans[index];

        oscillator.connect(gain);
        gain.connect(pan);
        pan.connect(filter);
        oscillator.start(audioContext.currentTime + index * 0.08);

        oscillatorNodes.push(oscillator, gain, pan);
      });

      const shimmer = audioContext.createOscillator();
      const shimmerGain = audioContext.createGain();
      const shimmerPan = audioContext.createStereoPanner();
      shimmer.type = "sine";
      shimmer.frequency.value = root * 4;
      shimmer.detune.value = 7;
      shimmerGain.gain.value = destination.gain.value * 0.06;
      shimmerPan.pan.value = 0.22;
      shimmer.connect(shimmerGain);
      shimmerGain.connect(shimmerPan);
      shimmerPan.connect(filter);
      shimmer.start(audioContext.currentTime + 0.4);

      filter.connect(destination);
      destination.connect(masterGain);

      activeNodesRef.current.push(
        ...oscillatorNodes,
        shimmer,
        shimmerGain,
        shimmerPan,
        filter,
        destination,
        lfo,
        lfoDepth,
      );
    },
    [],
  );

  const start = useCallback(
    async (
      layers: FrequencyLayer[],
      mode: FrequencyMode,
      binaural: BinauralConfig,
      isochronic: IsochronicConfig,
      soundscape: SoundscapeConfig,
      relaxMusic: RelaxMusicConfig,
    ) => {
      stop();
      const bridgeStatus = await bootToneBridge();
      const { audioContext, masterGain } = await createContext();
      const enabledLayers = layers.filter((layer) => layer.enabled);

      if (mode === "pure") {
        enabledLayers.forEach((layer) => addPureLayer(audioContext, masterGain, layer));
      }

      if (mode === "binaural") {
        addBinauralPair(audioContext, masterGain, binaural);
      }

      if (mode === "isochronic") {
        addIsochronicPulse(audioContext, masterGain, isochronic);
      }

      addSoundscape(audioContext, masterGain, soundscape);
      addRelaxMusic(audioContext, masterGain, relaxMusic);

      setIsPlaying(true);
      setStatus(
        `${bridgeStatus} Relax background music is layered at low volume for meditation and rest.`,
      );
    },
    [
      addBinauralPair,
      addIsochronicPulse,
      addRelaxMusic,
      addSoundscape,
      addPureLayer,
      bootToneBridge,
      createContext,
      stop,
    ],
  );

  useEffect(() => stop, [stop]);

  return {
    analyser,
    isPlaying,
    start,
    status,
    stop,
  };
}
