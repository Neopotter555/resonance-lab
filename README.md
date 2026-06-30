# Resonance Lab

Resonance Lab is a personal frequency, meditation, visualization, journaling, and consciousness experimentation laboratory.

It is for education, self-observation, meditation, relaxation, creativity, and experimentation only. It does not make medical, diagnostic, disease-treatment, or cure claims, and it does not replace professional medical care.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Frequency generator from 1 Hz to 20,000 Hz
- Grouped frequency library dropdown for Solfeggio-style, Schumann, beat-building, and Bentov-inspired presets
- Pure tone layering
- Binaural beat engine
- Isochronic pulse engine
- Generated ambient soundscapes
- Relax background music bed that starts with the audio session
- Real-time waveform and spectrum visualization
- Three.js visualization field
- Breath pacing, meditation timer, and session builder
- Guided visualization and affirmation editor
- Local frequency preset saving/loading
- Research journal with subjective trend tracking
- Analytics dashboard
- Biofeedback simulator fallback
- NestJS API scaffold
- Local scheduler, habit check-ins, community protocol library, and AI journey prompt flow
- AI research assistant route with safety fallback
- Evidence labels for research, hypotheses, spiritual teachings, and user experiences
- Multi-language interface starter
- Light, dark, and system themes
- Demo-safe local browser persistence

## Validation

```bash
npm run validate
```

## Documentation

- Architecture: `docs/ARCHITECTURE.md`
- Deployment: `docs/DEPLOYMENT.md`
- PostgreSQL schema: `database/schema.sql`

## Deployment

```bash
npm run deploy:netlify
npm run deploy:vercel
```

See `docs/DEPLOYMENT.md` for environment variables and smoke-test steps.
