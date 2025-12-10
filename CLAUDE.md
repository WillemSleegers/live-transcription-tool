# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **privacy-focused live audio transcription web app** built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. All transcription and summarization happens **on-device in the browser** - no data leaves the user's device.

### Core Functionality

- **On-device transcription** using Whisper via Transformers.js (browser-only, privacy-first)
- **Near-real-time** transcription in 5-10 second chunks
- **Seamless text editing** with immediate error correction
- **Manual speaker assignment** with multiple input methods (keyboard, click, cycle)
- **Browser-based AI summarization** using Chrome Summarizer API + WebLLM fallback
- **Session management** via localStorage (save/load transcripts)
- **Export** to TXT, JSON, and formatted documents

### Primary Language

Dutch (with English support)

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Create production build
- `npm start` - Run production server
- `npm run lint` - Run ESLint

## Architecture

### App Router Structure

- Uses Next.js App Router (`app/` directory)
- Root layout: [app/layout.tsx](app/layout.tsx) - Sets up fonts (Geist Sans & Mono) and global metadata
- Main page: [app/page.tsx](app/page.tsx) - Two-column layout with controls and transcription display
- Global styles: [app/globals.css](app/globals.css) - Tailwind CSS v4 with custom theme variables
- Web Worker: [app/worker.js](app/worker.js) - Whisper transcription processing in background thread

### Current Component Structure (Phase 1)

```
components/
├── ui/                        # shadcn components
│   ├── button.tsx             # Installed
│   ├── alert.tsx              # Installed
│   └── (more to be added)
└── AudioWaveform.tsx          # 'use client' - Live waveform visualization with WaveSurfer.js

hooks/
├── useAudioCapture.ts         # Microphone capture with AudioWorklet-based VAD
└── useWhisperTranscription.ts # Whisper model loading and transcription via Web Worker

lib/
├── utils.ts                   # shadcn cn() utility
└── constants.ts               # Audio processing and Whisper configuration

app/
└── worker.js                  # Web Worker for Whisper transcription

public/
└── audio-processor.js         # AudioWorklet processor for VAD (runs in audio thread)
```

### Styling System

- **Tailwind CSS v4** with PostCSS (note: v4 uses different syntax than v3)
- Custom theme uses CSS variables with OKLCH color space
- Dark mode via `.dark` class (configured with `@custom-variant dark`)
- Animations from `tw-animate-css` package
- Theme tokens for: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart colors, and sidebar
- Custom radius variables: `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`

### shadcn/ui Configuration

- Config file: [components.json](components.json)
- Style: "new-york"
- Components dir: `@/components` (not yet created)
- UI components dir: `@/components/ui` (not yet created)
- Utils: `@/lib/utils` (contains `cn()` helper for className merging)
- Icon library: lucide-react
- Add components with: `npx shadcn@latest add <component-name>`

### TypeScript Configuration

- Target: ES2017
- Path alias: `@/*` maps to `./*` (root directory)
- Strict mode enabled
- React JSX transform

### Key Dependencies

- **next**: 16.0.4
- **react**: 19.2.0
- **tailwindcss**: ^4 (major version)
- **lucide-react**: Icon library (Mic, Square, Loader2)
- **class-variance-authority**: Component variant management
- **tailwind-merge + clsx**: Utility for merging Tailwind classes (via `cn()` in [lib/utils.ts](lib/utils.ts))
- **@xenova/transformers**: 2.17.2 - Whisper transcription in browser
- **wavesurfer.js**: 7.8.14 - Audio waveform visualization with RecordPlugin

### Future Dependencies

- **webllm**: Browser-based LLM for summarization fallback (Phase 6)
- Additional shadcn/ui components as needed per phase

## Important Notes

### ⚠️ React Compiler Enabled (CRITICAL - DO NOT IGNORE)

**IMPORTANT**: This project uses the React 19 compiler (`reactCompiler: true` in [next.config.ts](next.config.ts)).

**What this means**:

- The React compiler automatically handles memoization and optimization
- **NEVER** add `React.memo()`, `useMemo()`, or `useCallback()` for performance optimization
- These manual optimizations are **redundant** and can **interfere** with the compiler's automatic optimizations
- The compiler is smarter than manual memoization and handles re-renders automatically

**When manual optimization IS appropriate**:

- Algorithm-level optimizations (e.g., using better data structures)
- Reducing state update frequency (e.g., debouncing)
- Direct DOM/library optimizations (e.g., ProseMirror transactions)
- Web API optimizations (e.g., AudioWorklet)

**When manual optimization is NOT appropriate**:

- Wrapping components with `React.memo()`
- Wrapping callbacks with `useCallback()`
- Wrapping computed values with `useMemo()`

**Summary**: Trust the React compiler. Focus on architectural and algorithmic optimizations, not React-level memoization.

### ⚠️ Webpack vs Turbopack (CRITICAL)

**Current Status**: Using webpack instead of Turbopack due to Transformers.js compatibility issues.

**Issue**: Transformers.js (v2.17.2) has compatibility issues with Next.js 16's default Turbopack bundler, causing `Object.keys(obj)` errors where `obj` (process.env) is undefined in Web Workers.

**Current Solution**:

- Development command uses `--webpack` flag: `npm run dev -- --webpack`
- Updated [package.json](package.json:6) to use `next dev --webpack` by default
- Added process.env polyfill in [app/worker.js](app/worker.js:1-4)

**References**:

- [Transformers.js Issue #1026](https://github.com/huggingface/transformers.js/issues/1026) - Reports bugs with Next.js client-side usage
- [Transformers.js Next.js Tutorial](https://huggingface.co/docs/transformers.js/en/tutorials/next) - Official integration guide

**TODO - Future Migration to Turbopack**:
When Transformers.js adds Turbopack support (check issue #1026 for updates):

1. Test with Turbopack by removing `--webpack` flag
2. Remove process.env polyfill from worker.js if no longer needed
3. Update package.json dev script to use default `next dev`
4. Remove this warning section

**Monitoring**: Check Transformers.js releases and issue #1026 for Turbopack compatibility updates.

### Tailwind CSS v4 Differences

- Uses `@theme inline` for theme configuration instead of `tailwind.config.js`
- Theme tokens defined as CSS variables in [globals.css](app/globals.css)
- Custom variants use `@custom-variant` syntax

### Font Configuration

- Geist Sans and Geist Mono loaded via `next/font/google`
- Font variables applied to body: `--font-geist-sans` and `--font-geist-mono`

### ESLint

- Uses flat config format (eslint.config.mjs)
- Next.js core-web-vitals and TypeScript configs applied
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

### Next.js Configuration

When adding Transformers.js, update [next.config.ts](next.config.ts):

```typescript
webpack: (config) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    sharp$: false,
    "onnxruntime-node$": false,
  }
  return config
}
```

## Data Models

### Core Types

```typescript
type TranscriptSegment = {
  id: string
  text: string
  speaker: number | null // null = unassigned
  timestamp: number // seconds from start
  isNew: boolean // for visual indication
  createdAt: number // for animation timing
}

type Speaker = {
  id: number
  name: string // "Speaker 1" or custom name like "Alice"
  color: string // for visual coding (#3B82F6, #10B981, etc.)
}

type TranscriptSession = {
  id: string
  segments: TranscriptSegment[]
  speakers: Speaker[]
  createdAt: Date
  duration: number
  summary?: string // AI-generated summary
}
```

### Speaker Color Palette

```
Speaker 1: Blue (#3B82F6)
Speaker 2: Green (#10B981)
Speaker 3: Orange (#F59E0B)
Speaker 4: Purple (#8B5CF6)
Speaker 5: Pink (#EC4899)
Speaker 6+: Generate from palette
```

## Key Features & Patterns

### Whisper Transcription (Phase 1 - Implemented)

- **Model**: `whisper-base` (74MB) - good balance for Dutch
- **Language**: Dutch (`nl`) by default
- **Sample Rate**: 16kHz
- **Processing**: AudioWorklet-based VAD chunking (3-30 second audio chunks)
  - **AudioWorklet**: [public/audio-processor.js](public/audio-processor.js) - VAD runs in separate audio thread
  - Speech threshold: 0.02 RMS
  - Silence duration: 500ms before chunk boundary (reduced from 1500ms)
  - Min chunk: 3000ms, Max chunk: 30000ms
  - Buffer size limit: 10MB with automatic chunk send
- **Performance**:
  - Web Worker keeps UI responsive during transcription
  - AudioWorklet prevents blocking main thread
  - AudioContext kept warm (suspend instead of close) for faster subsequent recordings
  - Optimistic UI updates for instant button feedback
- **Caching**: Models cached in browser IndexedDB via transformers.js
- **Queue Management**: Serial processing of audio chunks to prevent overlap

### Live Waveform Visualization (Phase 1 - Implemented)

- **Library**: WaveSurfer.js v7.8 with RecordPlugin
- **Style**: Bar-style visualization (barWidth: 10, barGap: 5, barRadius: 10)
- **Behavior**:
  - Baseline visible immediately on page load (before recording starts)
  - Scrolling waveform during recording
  - Pauses (freezes) when recording stops
  - Resumes when recording restarts
- **Integration**: Visualizes the same MediaStream used for transcription (no duplicate mic access)

### Speaker Assignment (Multiple Methods)

1. **Keyboard shortcuts** (primary): Press `1-9` to assign speaker to focused segment
2. **Speaker bar click**: Click speaker badge in persistent top bar
3. **Click to cycle**: Click speaker badge on segment itself (`? → 1 → 2 → 3 → 1...`)

### Smart UX Patterns

- **Conditional auto-focus**: New segments only steal focus if no text field currently focused
- **Smart defaults**: New segments inherit last assigned speaker
- **Navigation**: `Tab` jumps to next unassigned segment, `Shift+Tab` to previous, `↑/↓` for adjacent segments
- **Visual indicators**: "New" pulse animation on unassigned segments
- **Auto-save**: Changes debounced and saved to localStorage

### Browser-Based Summarization

- **Primary**: Chrome Summarizer API (built-in Gemini Nano) for Chrome 128+
- **Fallback**: WebLLM with small models (Phi-2, Llama 3.2 1B) for other browsers
- **Detection**: Check for `self.ai.summarizer` or `navigator.gpu` availability
- **Types**: key-points, tldr, teaser, headline
- **Privacy**: All processing happens locally, zero setup required

## Implementation Phases

See [PROJECT.md](PROJECT.md) for detailed phase breakdown. Summary:

### Phase 1: Core Transcription ✅ COMPLETED

- ✅ Next.js setup with shadcn/ui (`button`, `alert`)
- ✅ Install `@xenova/transformers` and `wavesurfer.js`
- ✅ Implement Whisper model loading with progress UI
- ✅ Capture mic audio with Voice Activity Detection (VAD)
- ✅ Process through Whisper in Web Worker → display text in real-time
- ✅ Live waveform visualization with pause/resume functionality
- ✅ Two-column UI layout (controls sidebar + transcription area)
- ✅ Verify Dutch transcription quality

**Status**: Core transcription working with live audio visualization and real-time transcription display

**Key Implementation Details**:

- **Audio Processing**: VAD-based chunking (1-10 second chunks) using ScriptProcessorNode
- **Transcription**: Whisper-base model via Transformers.js in Web Worker
- **Waveform**: WaveSurfer.js RecordPlugin with bar-style visualization and proper pause/resume
- **UI Layout**: 320px sidebar with controls and waveform, full-width transcription area
- **Language**: Dutch (nl) with 16kHz sample rate

### Phase 2: Basic Segment Display

- Add `input`, `textarea`, `badge`, `scroll-area` components
- Create TranscriptSegment component
- Display transcriptions with timestamps
- Make text editable

### Phase 3: Speaker Assignment

- Add `dialog`, `tooltip` components
- Implement speaker field and SpeakerBar
- Keyboard shortcuts with tooltips
- Speaker colors/borders
- Speaker management dialog

### Phase 4: Smart UX

- Smart focus logic
- "New" segment indicators
- Tab navigation to unassigned segments
- Smart speaker defaults
- Speaker rename

### Phase 5: Persistence & Export

- localStorage auto-save
- Load previous sessions
- Export to TXT/JSON/DOCX
- Export menu with `dropdown-menu`

### Phase 6: Browser-Based Summarization

- Detect Chrome API vs WebLLM
- Implement both summarization methods
- UI for summary generation
- Handle errors gracefully

## Privacy & Security

All processing happens **on-device**:

- ✅ Transcription via browser-based Whisper
- ✅ Summarization via Chrome API or WebLLM
- ✅ No external API calls
- ✅ No tracking
- ✅ Works offline after initial model download
- ✅ Data stored in localStorage (never transmitted)

## Browser Requirements

- **Minimum**: Modern browser with Web Audio API
- **Optimal**: Chrome/Edge/Safari with WebGPU support
- **Chrome Summarizer**: Chrome 128+ on Windows/macOS/Linux
- **WebLLM**: Any browser with WebGPU
- **Hardware**: 8GB+ RAM (16GB recommended), GPU with 4GB+ VRAM for best performance

## Performance Considerations

- Use **Web Workers** for Whisper processing (non-blocking UI)
- Use **Web Workers** for WebLLM summarization
- Debounce text edits before saving
- Virtualize segment list if >100 segments
- Lazy load audio processing

## Keyboard Shortcuts

- `1-9`: Assign speaker to focused segment
- `Tab`: Next unassigned segment
- `Shift+Tab`: Previous unassigned segment
- `↑/↓`: Navigate segments
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+S`: Save (auto-save active)

## Technical Debt & Future Improvements

### TypeScript Type Safety

**Issue**: Transformers.js v3 model instances use `any` type with eslint-disable comments in [app/whisper-worker.ts](app/whisper-worker.ts:23-28)

**Why**: The @huggingface/transformers library has complex return types with unions (e.g., `ModelOutput | Tensor`) that are difficult to type correctly without causing build errors. The runtime behavior is correct.

**Affected Code**:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
static tokenizer: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
static processor: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
static model: any = null;
```

**Future Fix Options**:

1. Wait for @huggingface/transformers to provide better TypeScript definitions
2. Create custom type definitions that properly handle the union types
3. Use type assertions with narrowing guards instead of `any`

**Priority**: Low - Code works correctly at runtime, types are only for development-time safety

**Other Type Safety**:

- ✅ Error handling uses proper `instanceof Error` checks
- ✅ Callbacks use proper `ProgressCallback` type
- ✅ Function parameters use optional `?` instead of nullable defaults

## Reference Documentation

- [PROJECT.md](PROJECT.md) - Complete project specification with detailed requirements
- [Transformers.js Docs](https://huggingface.co/docs/transformers.js)
- [shadcn/ui Components](https://ui.shadcn.com)
- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)
- [Chrome Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api)
