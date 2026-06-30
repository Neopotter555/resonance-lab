"use client";

import { useEffect, useRef } from "react";

interface AnalyzerCanvasProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  variant: "waveform" | "spectrum";
}

export function AnalyzerCanvas({ analyser, isPlaying, variant }: AnalyzerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    const timeData = new Uint8Array(analyser?.fftSize ?? 2048);
    const frequencyData = new Uint8Array(analyser?.frequencyBinCount ?? 1024);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawBackground = (width: number, height: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(5, 4, 2, 0.92)";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "rgba(201, 168, 76, 0.12)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 36) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y < height; y += 28) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
    };

    const drawWaveform = (width: number, height: number) => {
      if (analyser && isPlaying) {
        analyser.getByteTimeDomainData(timeData);
      } else {
        const now = Date.now() / 340;
        for (let index = 0; index < timeData.length; index += 1) {
          timeData[index] = 128 + Math.sin(index / 18 + now) * 24 + Math.sin(index / 51) * 10;
        }
      }

      context.lineWidth = 2;
      context.strokeStyle = "#e5c762";
      context.beginPath();

      const slice = width / timeData.length;
      for (let index = 0; index < timeData.length; index += 1) {
        const value = timeData[index] / 128;
        const x = index * slice;
        const y = (value * height) / 2;
        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
    };

    const drawSpectrum = (width: number, height: number) => {
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(frequencyData);
      } else {
        const now = Date.now() / 500;
        for (let index = 0; index < frequencyData.length; index += 1) {
          frequencyData[index] = Math.max(
            0,
            140 - index / 5 + Math.sin(index / 10 + now) * 24,
          );
        }
      }

      const bars = 96;
      const barWidth = width / bars;
      for (let index = 0; index < bars; index += 1) {
        const sample = frequencyData[Math.floor((index / bars) * frequencyData.length)];
        const barHeight = Math.max(2, (sample / 255) * height * 0.92);
        const hueMix = index / bars;
        context.fillStyle =
          hueMix > 0.64 ? "rgba(229, 199, 98, 0.86)" : "rgba(0, 229, 255, 0.52)";
        context.fillRect(index * barWidth, height - barHeight, Math.max(2, barWidth - 2), barHeight);
      }
    };

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      drawBackground(width, height);
      if (variant === "waveform") {
        drawWaveform(width, height);
      } else {
        drawSpectrum(width, height);
      }
      animationFrame = requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [analyser, isPlaying, variant]);

  return (
    <canvas
      ref={canvasRef}
      className="h-36 w-full rounded border border-white/10 bg-slate-950"
      aria-label={variant === "waveform" ? "Real-time waveform" : "Real-time spectrum"}
    />
  );
}
