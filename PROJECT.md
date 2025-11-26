# Project Brief: Privacy-Focused Live Transcription Web App

## Overview

Build a privacy-focused web application for live audio transcription with seamless editing and speaker labeling. All transcription happens **on-device in the browser** using Whisper via Transformers.js. No data leaves the user's device.

## Core Requirements

### Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Transcription**: Transformers.js with Whisper models
- **Summarization**: Chrome Summarizer API + WebLLM (fallback)
- **Primary Language**: Dutch (with English support)
- **Audio**: Web Audio API + MediaRecorder

### Key Features

1. **On-device transcription** using Whisper (browser-only, privacy-first)
2. **Near-real-time** transcription in 5-10 second chunks
3. **Seamless text editing** - users can immediately fix transcription errors
4. **Manual speaker assignment** with multiple input methods
5. **Browser-based AI summarization** - completely private
6. **Session management** - save/load transcripts from localStorage
7. **Export** to TXT, JSON, and formatted documents

## Project Structure

```
transcription-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   ├── dialog.tsx
│   │   ├── textarea.tsx
│   │   └── ... (other shadcn components)
│   ├── AudioRecorder.tsx          # 'use client' - Mic control
│   ├── TranscriptEditor.tsx       # 'use client' - Main transcript view
│   ├── TranscriptSegment.tsx      # Individual editable segment
│   ├── SpeakerBar.tsx             # Persistent speaker selector
│   ├── ControlPanel.tsx           # Start/stop/export controls
│   ├── ModelLoader.tsx            # Whisper model loading UI
│   └── SummaryGenerator.tsx       # AI summarization component
├── hooks/
│   ├── useAudioCapture.ts         # Handle mic and audio chunks
│   ├── useWhisperTranscription.ts # Manage Whisper processing
│   ├── useTranscriptState.ts      # Transcript segments state
│   ├── useKeyboardShortcuts.ts    # Keyboard navigation
│   └── useSummarizer.ts           # Browser LLM summarization
├── types/
│   └── transcript.ts              # TypeScript interfaces
├── utils/
│   ├── audioProcessor.ts          # Audio format conversion
│   └── exportHelpers.ts           # Export to different formats
├── lib/
│   └── utils.ts                   # shadcn utils (cn function)
├── components.json                # shadcn config
└── next.config.js
```

## Configuration

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    }
    return config
  },
}
module.exports = nextConfig
```

### shadcn/ui Setup

Initialize shadcn with:

```bash
npx shadcn-ui@latest init
```

**Components to install:**

- `button` - For all action buttons
- `input` - For text editing in segments
- `textarea` - Alternative for segment editing
- `badge` - For speaker labels and indicators
- `progress` - For model loading progress
- `dialog` - For speaker management, export options
- `tooltip` - For keyboard shortcut hints
- `alert` - For error messages
- `separator` - For visual dividers
- `scroll-area` - For transcript scrolling

## Data Models

### TranscriptSegment

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
  color: string // for visual coding
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

## UI/UX Specifications

### Layout Design

```
┌─────────────────────────────────────────────────┐
│  [●] Recording 00:45  [Pause] [Stop] [Export]   │
│     (shadcn Buttons)                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Speaker Bar (persistent):                      │
│  ● 1 Alice  ● 2 Bob  ● 3 Carol  [+ Add]        │
│  (shadcn Badges)                                │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Transcript Area (shadcn ScrollArea):           │
│                                                 │
│  ┌─ 1 ────────────────────────────┐ [00:12]    │
│  │ Ja, ik denk dat we dat...      │            │
│  │ (shadcn Input/Textarea)        │            │
│  └────────────────────────────────┘            │
│                                                 │
│  ┌─ 2 ────────────────────────────┐ [00:18]    │
│  │ Dat klinkt goed                │            │
│  └────────────────────────────────┘            │
│                                                 │
│  ┌─ ? ────────────────────────────┐ [00:23] 🔴 │
│  │ En wat betreft het budget...   │  ← New!    │
│  └────────────────────────────────┘            │
│                                                 │
│  [Summarize Transcript]  (shadcn Button)       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Segment Visual Design

- **Left border color** indicates speaker (4px solid border)
- **Rounded corners** for modern look (using shadcn defaults)
- **Padding**: Comfortable text editing space
- **Timestamp** shown on right (subtle, gray, small Badge component)
- **"New" indicator**: Red pulse/glow animation on unassigned segments
- **Focus state**: shadcn focus rings

### Speaker Color Palette

```
Speaker 1: Blue (#3B82F6)
Speaker 2: Green (#10B981)
Speaker 3: Orange (#F59E0B)
Speaker 4: Purple (#8B5CF6)
Speaker 5: Pink (#EC4899)
Speaker 6+: Generate from palette
```

## Interaction Patterns

### Speaker Assignment (Multiple Methods)

**Method 1: Keyboard Shortcuts (Primary)**

- Press `1`, `2`, `3`, etc. to assign speaker to focused segment
- Works when focused in text field or on segment
- No modifier keys needed for speed
- Show keyboard hint in Tooltip component

**Method 2: Speaker Bar Click**

- Click speaker Badge in persistent top bar
- Assigns to currently focused/selected segment

**Method 3: Click Badge to Cycle**

- Click speaker badge on segment itself
- Cycles: `? → 1 → 2 → 3 → 1...`

### Smart Focus Behavior

**Conditional Auto-Focus:**

```
When new segment appears:
  IF no text field is currently focused:
    → Focus new segment (ready to edit)
  ELSE:
    → Don't steal focus
    → Add visual "new" indicator
    → Auto-scroll into view
```

**Navigation:**

- `Tab`: Jump to next unassigned segment (speaker = null)
- `Shift+Tab`: Previous unassigned segment
- `↑/↓`: Navigate between adjacent segments
- Visual indicator at top: "3 new segments" with click to scroll

### Smart Defaults

- **New segments default to last assigned speaker**
- Reduces repetitive assignments when one person speaks multiple sentences
- User only changes when speaker actually switches

### Editing Behavior

- Click any segment text to edit
- Changes save automatically (debounced)
- `Cmd/Ctrl+Z`: Undo edits
- Use shadcn Input or Textarea components for text editing

## Whisper Integration

### Model Selection

- **Default**: `whisper-base` (74MB) - good balance for Dutch
- **Alternative**: `whisper-small` (244MB) - better accuracy, offer as option
- **Language**: Set to Dutch (`nl`) by default

### Audio Processing Strategy

1. Capture audio from microphone using MediaRecorder
2. Split into **5-10 second chunks** with slight overlap
3. Queue chunks for processing
4. Process through Whisper in Web Worker (non-blocking)
5. Display results as they complete
6. Continue until user stops recording

### Model Loading

- Show shadcn Progress component with percentage
- Download model on first use
- Cache in browser (IndexedDB via transformers.js)
- Allow user to start only after model is loaded

## Browser-Based Summarization

### Summarization Options

**Primary: Chrome Summarizer API**

- Uses built-in Gemini Nano (if available)
- Multiple summary types: key-points, tldr, teaser, headline
- Formats: markdown or plain-text
- Lengths: short, medium, long
- Zero setup for Chrome users

**Fallback: WebLLM**

- Use small models (Phi-2, Llama 3.2 1B)
- Works across browsers with WebGPU
- Download model on first use
- Completely private, runs locally

### Implementation Strategy

```typescript
// Detect available summarization method
async function detectSummarizationCapability() {
  // Try Chrome's built-in API first
  if ("ai" in self && "summarizer" in self.ai) {
    return "chrome-builtin"
  }

  // Check for WebGPU support for WebLLM
  if (navigator.gpu) {
    return "webllm"
  }

  return "unavailable"
}

// Chrome Summarizer API
const summarizer = await self.ai.summarizer.create({
  type: "key-points",
  format: "markdown",
  length: "medium",
})
const summary = await summarizer.summarize(transcriptText)

// WebLLM fallback
const engine = await CreateMLCEngine("Phi-2-q4f16_1-MLC")
const summary = await engine.chat.completions.create({
  messages: [
    {
      role: "user",
      content: `Summarize this Dutch transcript in Dutch, highlighting key points:\n\n${transcriptText}`,
    },
  ],
})
```

## Implementation Phases

### Phase 1: Core Transcription ✅ COMPLETED

- [x] Next.js project setup with TypeScript + Tailwind CSS v4
- [x] Initialize shadcn/ui (`npx shadcn@latest init`)
- [x] Add shadcn components: `button`, `alert`
- [x] Install `@xenova/transformers` (v2.17.2)
- [x] Install `wavesurfer.js` (v7.8.14) for waveform visualization
- [x] Create two-column layout with controls sidebar and transcription area
- [x] Implement Whisper model loading with inline progress display
- [x] Request microphone permission
- [x] Implement VAD-based audio chunking using AudioWorklet
- [x] Create Web Worker for Whisper transcription processing
- [x] Process audio through Whisper → display transcriptions in real-time
- [x] Add live waveform visualization with pause/resume functionality
- [x] Verify Dutch transcription quality
- [x] Performance optimizations for instant UI feedback

**Status**: ✅ COMPLETED - Core transcription working with live visualization and optimized performance

**What Was Built**:
- **UI**: Two-column layout (320px sidebar with controls, full-width transcription area)
- **Model Loading**: One-click model loading with progress percentage display
- **Audio Capture**: [hooks/useAudioCapture.ts](hooks/useAudioCapture.ts) with AudioWorklet-based VAD
  - **AudioWorklet Processor**: [public/audio-processor.js](public/audio-processor.js) - VAD running in separate audio thread
  - RMS-based speech detection (threshold: 0.02)
  - Silence detection (500ms silence triggers chunk boundary - reduced from 1500ms)
  - Min/max chunk duration controls (3s min, 30s max)
  - Serial queue processing to prevent overlapping transcriptions
  - 10MB buffer size limit with automatic chunk sending
  - AudioContext kept warm between recordings (suspend instead of close)
  - Optimistic UI updates for instant button feedback
- **Transcription**: [hooks/useWhisperTranscription.ts](hooks/useWhisperTranscription.ts) managing Web Worker
  - Web Worker: [app/worker.js](app/worker.js) running Whisper-base model
  - Real-time transcription display with typing indicator
- **Waveform**: [components/AudioWaveform.tsx](components/AudioWaveform.tsx)
  - Bar-style visualization using WaveSurfer.js RecordPlugin
  - Baseline visible immediately on page load (before recording starts)
  - Proper pause/resume functionality (freezes on stop, resumes on restart)
  - Shares same MediaStream as transcription (no duplicate mic access)
- **Configuration**: [lib/constants.ts](lib/constants.ts) with all audio processing parameters

**Performance Improvements**:
- ✅ Migrated from deprecated ScriptProcessorNode to AudioWorklet (non-blocking UI)
- ✅ Added 10MB buffer size limit to prevent memory leaks
- ✅ Optimistic UI updates (buttons respond instantly)
- ✅ AudioContext reuse (faster subsequent recordings)
- ✅ Waveform baseline visible on load
- ✅ Reduced SILENCE_DURATION_MS to 500ms for faster response

**Goal**: ✅ Get end-to-end audio → text working with optimal performance - ACHIEVED

### Phase 2: Basic Segment Display

- [ ] Add shadcn components: `input`, `textarea`, `badge`, `scroll-area`
- [ ] Create TranscriptSegment component with shadcn Input/Textarea
- [ ] Display transcriptions as segments with timestamps (shadcn Badges)
- [ ] Make text editable
- [ ] Wrap transcript in shadcn ScrollArea

### Phase 3: Speaker Assignment

- [ ] Add shadcn components: `dialog`, `tooltip`
- [ ] Add speaker field to segments (default null)
- [ ] Create SpeakerBar component with shadcn Badges
- [ ] Implement keyboard shortcuts (1-9) with Tooltips
- [ ] Add speaker colors/borders
- [ ] Implement click-to-cycle on badges
- [ ] Speaker management Dialog for rename/add/remove

### Phase 4: Smart UX

- [ ] Smart focus logic (conditional auto-focus)
- [ ] "New" segment indicators with animation
- [ ] Tab navigation to unassigned segments
- [ ] Smart speaker defaults (inherit last speaker)
- [ ] Speaker rename functionality in Dialog

### Phase 5: Persistence & Export

- [ ] Add shadcn components: `dropdown-menu` for export options
- [ ] Save to localStorage (auto-save)
- [ ] Load previous sessions
- [ ] Export to TXT
- [ ] Export to JSON
- [ ] Export to DOCX
- [ ] Export menu using shadcn DropdownMenu

### Phase 6: Browser-Based Summarization

- [ ] Detect available summarization methods (Chrome API vs WebLLM)
- [ ] Implement Chrome Summarizer API integration
- [ ] Implement WebLLM fallback with Phi-2 or Llama 3.2 1B
- [ ] Add "Summarize" button to ControlPanel
- [ ] Show model loading progress for WebLLM
- [ ] Support multiple summary types (key points, TL;DR, headline)
- [ ] Display summary in Dialog or expandable section
- [ ] Cache WebLLM model for faster subsequent use
- [ ] Handle errors and unsupported browsers gracefully

## Technical Considerations

### Performance

- Use **Web Workers** for Whisper (keeps UI responsive)
- Use **Web Workers** for WebLLM summarization
- Debounce text edits before saving
- Virtualize segment list if >100 segments (consider using shadcn ScrollArea)
- Lazy load audio processing

### Error Handling

- Microphone permission denied → shadcn Alert component with message
- Model load failure → shadcn Alert with retry Button
- Audio processing error → shadcn Alert, continue with next chunk
- Browser compatibility check → shadcn Alert for old browsers
- Summarization unavailable → Show message, suggest Chrome or WebGPU browser

### Accessibility

- Keyboard-first design
- shadcn components have built-in accessibility
- ARIA labels for custom interactive elements
- Focus indicators (shadcn defaults)
- Screen reader support for status updates

## Getting Started - Phase 1 Focus

### Initial Setup

```bash
# Create Next.js app
npx create-next-app@latest transcription-app --typescript --tailwind --app

# Initialize shadcn/ui
cd transcription-app
npx shadcn-ui@latest init

# Add initial components
npx shadcn-ui@latest add button progress alert

# Install transcription library
npm install @xenova/transformers
```

### First Working Version Should Have:

1. shadcn Button to load Whisper model (with Progress component)
2. shadcn Button to start/stop recording
3. Simple display showing transcribed text as it appears
4. Basic error handling with shadcn Alert

### Validation Criteria:

- Can load Whisper model successfully
- Can capture microphone audio
- Can transcribe Dutch speech with reasonable accuracy
- Text appears in near-real-time (5-10 second delay acceptable)
- UI uses shadcn components for consistent design

Once Phase 1 works, you'll have real transcription data to work with while building out the full UI/UX in subsequent phases.

---

## User Experience Flow

### First-Time User

1. Land on page → See "Load Whisper Model" button
2. Click → Progress bar shows download (74MB)
3. Model ready → "Start Recording" button enabled
4. Allow microphone access
5. Recording begins → transcription appears in chunks
6. Tutorial tooltip: "Press 1-9 to assign speakers"
7. After recording → "Summarize" button available

### Regular Session

1. Model already cached → Immediate "Start Recording"
2. Begin recording
3. Text appears → user edits mistakes on-the-fly
4. Assign speakers with keyboard/clicks
5. Stop recording
6. Review/edit full transcript
7. Generate AI summary (optional)
8. Export or save for later

## Privacy & Security

### Data Privacy Guarantees

- ✅ All transcription happens on-device
- ✅ All summarization happens on-device
- ✅ No data sent to external servers
- ✅ No API keys required
- ✅ No user tracking
- ✅ Works completely offline (after initial model download)

### Storage

- Models cached in browser (IndexedDB)
- Transcripts saved in localStorage (never sent anywhere)
- User has full control over their data

## Browser Requirements

### Minimum Requirements

- **Whisper Transcription**: Any modern browser with Web Audio API
- **Optimal Performance**: Chrome, Edge, or Safari with WebGPU support
- **Chrome Summarizer API**: Chrome 128+ on Windows/macOS/Linux
- **WebLLM Summarization**: Any browser with WebGPU support

### Hardware Requirements

- **Minimum**: 8GB RAM, modern CPU
- **Recommended**: 16GB RAM, GPU with 4GB+ VRAM for faster processing
- **Storage**: 500MB-2GB for models (varies by selection)

## Future Enhancements (Post-MVP)

- Multiple language support beyond Dutch/English
- Audio playback synchronized with transcript
- Search within transcripts
- Batch processing of multiple files
- Custom model fine-tuning
- Automatic speaker diarization (if/when browser-based models improve)
- Dark mode
- Collaborative editing (optional cloud sync with encryption)
- Mobile app version
- Integration with note-taking apps

---

## Quick Reference

### Keyboard Shortcuts

- `1-9`: Assign speaker to focused segment
- `Tab`: Next unassigned segment
- `Shift+Tab`: Previous unassigned segment
- `↑/↓`: Navigate segments
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+S`: Save (auto-save active)

### Key Technologies

- **Next.js 14+**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **shadcn/ui**: Component library
- **@xenova/transformers**: Browser Whisper
- **Chrome Summarizer API**: Built-in AI
- **WebLLM**: Browser LLM fallback

### Important Links

- [Transformers.js Docs](https://huggingface.co/docs/transformers.js)
- [shadcn/ui Components](https://ui.shadcn.com)
- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)
- [Chrome Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Ready to start building? Begin with Phase 1 and validate the core transcription functionality first!**
