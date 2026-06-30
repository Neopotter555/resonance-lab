# Deployment

Resonance Lab can run as a demo-safe static/serverless Next.js app today. Production persistence should add the NestJS/PostgreSQL service described in `docs/ARCHITECTURE.md`.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run validate
```

This runs ESLint and `next build`.

## Netlify

`netlify.toml` is included for Netlify deployments.

```bash
npm run deploy:netlify
```

Recommended Netlify settings:

- Build command: `npm run build`
- Publish directory: `.next`
- Runtime: Netlify Next.js adapter/plugin

Environment variables:

- `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY` optional
- `ANTHROPIC_API_KEY` optional
- `DATABASE_URL` required only for production backend persistence

## Vercel

```bash
npm run deploy:vercel
```

Recommended Vercel settings:

- Framework: Next.js
- Build command: `npm run build`
- Output: managed by Vercel

## Production Backend

Build the NestJS backend:

```bash
npm run api:build
npm run api:start
```

When PostgreSQL is ready:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

Then deploy the API service with:

- `DATABASE_URL`
- AI provider keys
- Auth provider settings
- Rate-limit storage
- Observability endpoint

## Smoke Test Checklist

- Homepage loads on desktop and mobile widths.
- Language switcher changes primary labels without a reload.
- Theme switcher changes `data-theme`.
- Audio start works after a user gesture.
- Frequency library dropdown applies grouped preset values to the active frequency controls.
- Waveform and spectrum canvases animate.
- Three.js visualization is visible and animating.
- Meditation timer starts with the audio session.
- Ambient soundscape controls remain low-volume by default.
- Relax background music starts with the audio session and remains low-volume by default.
- Frequency presets save and reload in local demo mode.
- Biofeedback simulator is clearly labeled as a fallback.
- Scheduler, habit check-in, community protocol, and AI journey controls render on mobile and desktop.
- Journal entries persist after refresh.
- `/api/assistant` returns labeled safety sections.
- `/api/research` returns evidence-labeled records.
- No visible copy claims disease treatment or replacement of professional care.
