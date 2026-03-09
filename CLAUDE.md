# Phonogram Practice App

## Project Goal
A mobile-first PWA for Spanish-speaking students learning English phonograms via the Spalding method. Designed to feel like a native app — tap a card, hear the sound, track what you know. No auth, no backend, no internet required after the first load.

Mom's voice recordings are the audio source. The admin tool handles trimming them from a single long recording into individual files.

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| UI framework | React 18 + Vite 5 | Fast DX, great PWA plugin ecosystem |
| Styling | Tailwind CSS v3 | Utility-first, easy mobile-first patterns |
| Routing | React Router v6 | Standard, nested routes for admin vs. student layout |
| PWA / Service Worker | vite-plugin-pwa (Workbox) | Handles precaching and SW generation at build time |
| Audio waveform | Custom canvas (Web Audio API) | No external dep needed; full control over rendering |
| Storage | localStorage | No backend needed; progress is per-device |
| Hosting | Vercel (free tier) | Zero config, auto-deploys from GitHub |

---

## Project Structure

```
second-app/
├── index.html                     # PWA meta tags, safe-area viewport
├── vite.config.js                 # Vite + PWA plugin config
├── tailwind.config.js             # Custom colors, animations, font
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── audio/                     # Drop .mp3 files here (named by phonogram id)
│   └── icons/                     # icon-192.png, icon-512.png (needed for installability)
└── src/
    ├── App.jsx                    # Router: student layout + /admin/audio
    ├── main.jsx                   # React root
    ├── index.css                  # Tailwind base + custom utilities
    ├── data/
    │   └── phonograms.js          # All 66 Spalding phonograms with sounds, notes, examples
    ├── utils/
    │   └── storage.js             # localStorage helpers + mastery logic
    ├── hooks/
    │   └── useProgress.js         # React hook: reads/writes progress, computes stats
    ├── components/
    │   ├── BottomNav.jsx          # Fixed bottom tab bar (Browse / Quiz / Progress)
    │   └── PhonogramCard.jsx      # Tappable card: plays audio, shows progress, sound wave animation
    └── pages/
        ├── Browse.jsx             # Scrollable card grid with filter tabs + search
        ├── Quiz.jsx               # Flash-card quiz with self-rating (Got It / Keep Practicing)
        ├── Progress.jsx           # Stats overview + per-phonogram accuracy bars + reset
        └── admin/
            └── AudioTrim.jsx      # Waveform editor: upload → trim → label → export WAV
```

---

## Key Decisions

### No WaveSurfer dependency in admin tool
We built the waveform display using a plain `<canvas>` element and the Web Audio API directly. This avoids a large dependency (WaveSurfer.js) for a page only the app owner visits, and gives full control over the interaction model (drag-to-select regions, handle dragging, playhead animation).

### Offline-first audio caching
vite-plugin-pwa precaches all JS/CSS/HTML at build time. Audio files (`/audio/*.mp3`) are cached at runtime via a Workbox **CacheFirst** strategy — on first play the file downloads and is stored in the `phonogram-audio` cache forever. After that, the app works with no internet.

### Audio file naming convention
Files in `public/audio/` must be named exactly as the phonogram ID in `phonograms.js`:
- `a.mp3`, `sh.mp3`, `ch.mp3`, `igh.mp3`, `wor.mp3`, etc.
- Missing files fail silently in dev (no error thrown to the student)

### Progress storage schema
```js
// localStorage key: "phonogram_progress"
{
  "a":  { attempts: 5, correct: 4, streak: 2, lastPracticed: "2024-01-15" },
  "sh": { attempts: 2, correct: 1, streak: 0, lastPracticed: "2024-01-14" }
}
```
**Mastery threshold**: `correct / attempts >= 0.8` AND `attempts >= 5`. Adjust in `src/utils/storage.js → isMastered()`.

### Admin route is unlinked, not auth-gated
`/admin/audio` is not in the bottom nav and not reachable from the student UI — just navigate there directly. No password (no backend to check one against). The URL itself is the only gatekeeping.

### Quiz self-rating model
The quiz shows the phonogram, lets the student tap to hear it, then shows the answer. The student self-reports "Got It" or "Keep Practicing." This matches how Spalding flashcard drilling works — the teacher/student judges themselves. No automatic right/wrong detection.

---

## Phonogram Data
66 of the 70 Spalding phonograms are defined in `src/data/phonograms.js`, each with:
- `id` — unique key, matches audio filename
- `symbol` — displayed on card (`sh`, `igh`, etc.)
- `sounds` — array of sounds it makes (e.g. `["ĕ", "ē"]`)
- `examples` — example words, parallel to sounds
- `notes` — optional Spalding teaching rule
- `number` — Spalding sequence order (1–70)

---

## Adding Audio Files

### Workflow A — Admin trim tool (recommended for a long recording)
1. Navigate to `/admin/audio`
2. Upload the full recording
3. Drag to select each phonogram's region on the waveform
4. Type the phonogram label (must match its `id` in `phonograms.js`), click Save
5. Click Export on each clip → downloads as `{label}.wav`
6. Optionally convert: `ffmpeg -i sh.wav -b:a 128k sh.mp3`
7. Drop all files into `public/audio/`

### Workflow B — Pre-trimmed individual files
Just drop them directly into `public/audio/` named by phonogram id.

---

## PWA Icons (needed for install prompt)
The app works without icons but won't be installable. To add them:
1. Create a 512×512 PNG → `public/icons/icon-512.png`
2. Create a 192×192 PNG → `public/icons/icon-192.png`
3. Optionally: 180×180 `public/apple-touch-icon.png`

Use https://realfavicongenerator.net or: `magick logo.png -resize 192x192 icon-192.png`

---

## Development

```bash
npm install
npm run dev        # http://localhost:5173 (SW disabled in dev)
npm run build      # Production build — generates sw.js + workbox file
npm run preview    # Preview the production build locally
```

Service worker is intentionally disabled in dev (`devOptions.enabled: false` in `vite.config.js`) to avoid stale cache confusion during development.

---

## Deployment
1. Push to GitHub
2. Connect repo to Vercel (import project → Framework: Vite → Deploy)
3. Every push to `main` auto-deploys. No env vars required.

---

## Current Status

### Completed
- [x] Full project scaffold (React + Vite + Tailwind + PWA)
- [x] `src/data/phonograms.js` — 66 Spalding phonograms with sounds, examples, notes
- [x] `PhonogramCard` component — tappable, plays audio, sound wave animation, progress pip
- [x] `Browse` page — card grid, filter tabs (All / Not Started / Practicing / Mastered), search
- [x] `Quiz` page — three modes (All / Still Learning / New Only), self-rating, session summary
- [x] `Progress` page — stat cards, accuracy bar, mastered/practicing/not-started lists, reset
- [x] `BottomNav` — fixed bottom navigation with active state
- [x] `AudioTrim` admin tool (`/admin/audio`) — canvas waveform, drag-to-select, WAV export, clip list persists in localStorage
- [x] PWA service worker with CacheFirst audio caching
- [x] Offline-first: all assets precached, audio cached on first play
- [x] Production build verified clean

### Not Yet Done
- [ ] Add real phonogram audio files to `public/audio/`
- [ ] Add PWA icons (`public/icons/icon-192.png`, `icon-512.png`)
- [ ] Test on real iOS device (safe-area insets, audio autoplay policy)
- [ ] Consider adding haptic feedback via `navigator.vibrate()` on card tap
- [ ] Spalding phonogram numbers 67–70 not yet in data file
