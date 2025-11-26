# Live Transcription Tool - TODO List

**Last Updated:** 2025-11-26
**Status:** Phase 1 Complete ✅ - Performance optimizations completed

---

## 🔴 Critical Fixes (Before Phase 2)

### Performance ✅ COMPLETED
- [x] **Migrate to AudioWorklet from ScriptProcessorNode** ✅
  - Priority: MEDIUM-HIGH (COMPLETED)
  - Impact: Better performance, removes deprecated API
  - Location: `hooks/useAudioCapture.ts` + `public/audio-processor.js`
  - Completed: AudioWorklet processor with VAD running in separate audio thread
  - Benefits: Non-blocking UI, better performance, modern API

- [x] **Add buffer size limit enforcement** ✅
  - Priority: HIGH (COMPLETED)
  - Impact: Memory leak risk eliminated
  - Location: `public/audio-processor.js:102-106`
  - Implementation: 10MB buffer limit with automatic chunk send

- [x] **Show waveform baseline immediately on page load** ✅
  - Priority: MEDIUM (COMPLETED)
  - Impact: Better UX - waveform visible before recording starts
  - Location: `components/AudioWaveform.tsx:39-40`
  - Implementation: Load silent audio to render baseline

- [x] **Optimistic UI updates for instant feedback** ✅
  - Priority: MEDIUM (COMPLETED)
  - Impact: UI feels instant when starting/stopping recording
  - Location: `hooks/useAudioCapture.ts:45` + `app/page.tsx:53-59`
  - Implementation: Update button state immediately, recording follows

- [x] **Keep AudioContext warm between recordings** ✅
  - Priority: MEDIUM (COMPLETED)
  - Impact: Faster subsequent recordings
  - Location: `hooks/useAudioCapture.ts:151-155`
  - Implementation: Suspend instead of close AudioContext

- [x] **Reduce VAD timing for faster response** ✅
  - Priority: MEDIUM (COMPLETED)
  - Impact: Transcription feels more responsive
  - Location: `lib/constants.ts:29`
  - Changed: SILENCE_DURATION_MS from 1500ms to 500ms

### Technical Reliability
- [ ] **Add retry logic for failed transcriptions**
  - Priority: HIGH
  - Impact: Lost audio chunks with no recovery
  - Location: `app/page.tsx:44-47` - handleAudioChunk
  - Estimated effort: 30 min

---

## 🟡 Important Improvements (Phase 2-3)

### User Experience
- [ ] **Add keyboard shortcuts guide**
  - Priority: MEDIUM
  - Impact: Power users can work faster
  - Location: New component or dialog
  - Estimated effort: 1 hour

- [ ] **Add visual indicator for waveform paused vs stopped**
  - Priority: MEDIUM
  - Impact: Users confused when waveform "freezes"
  - Location: `components/AudioWaveform.tsx:68-70`
  - Estimated effort: 20 min

### Configuration
- [ ] **Make VAD settings configurable via UI**
  - Priority: MEDIUM
  - Impact: Users can tune for their environment
  - Location: Add settings panel in sidebar
  - Estimated effort: 1-2 hours
  - Settings to expose:
    - Speech threshold (currently 0.02)
    - Silence duration (currently 500ms)
    - Min/max chunk duration

- [ ] **Test and tune SPEECH_THRESHOLD for noisy environments**
  - Priority: MEDIUM
  - Impact: May trigger on background noise
  - Location: `lib/constants.ts:18`
  - Estimated effort: 30 min testing

### Data Persistence
- [ ] **Add session auto-save to localStorage**
  - Priority: MEDIUM
  - Impact: Don't lose work on reload
  - Location: `app/page.tsx` - Add useEffect for auto-save
  - Estimated effort: 1 hour

### Accessibility
- [ ] **Add accessibility improvements (ARIA, focus management)**
  - Priority: MEDIUM
  - Impact: Screen reader support, keyboard navigation
  - Location: Multiple components
  - Estimated effort: 2-3 hours
  - Include:
    - ARIA labels for buttons
    - Focus management
    - Keyboard shortcuts
    - Screen reader announcements

---

## 🟢 Nice to Have (Phase 4+)

- [ ] **Add dark mode toggle**
  - Priority: LOW
  - Impact: User preference
  - Location: Add theme switcher component
  - Notes: CSS already supports dark mode

- [ ] **Add help/tutorial modal**
  - Priority: LOW
  - Impact: Onboarding for new users
  - Estimated effort: 2 hours

- [ ] **Add export functionality preview**
  - Priority: LOW (Phase 5 feature)
  - Impact: Users want to save transcripts

- [ ] **Show total duration counter**
  - Priority: LOW
  - Impact: Nice visual feedback
  - Location: Sidebar
  - Estimated effort: 15 min

---

## 🔧 Technical Debt

- [ ] **Check for Transformers.js Turbopack compatibility updates**
  - Priority: LOW
  - Impact: Could remove webpack workaround
  - Location: `package.json:6` - Remove `--webpack` flag if compatible
  - Action: Check https://github.com/huggingface/transformers.js/issues/1026
  - Estimated effort: 30 min research + testing

---

## 📦 Phase 2 Prerequisites (Required for Next Phase)

- [ ] **Add timestamps to transcription segments**
  - Priority: HIGH (for Phase 2)
  - Impact: Required for segment display
  - Location: `app/page.tsx` - Modify transcriptions state
  - Change from: `string[]` to `TranscriptSegment[]`
  - Estimated effort: 1 hour

- [ ] **Implement text editing capability**
  - Priority: HIGH (for Phase 2)
  - Impact: Core Phase 2 feature
  - Location: New TranscriptSegment component
  - Estimated effort: 2-3 hours

---

## 🎯 Quick Wins (Easy, High Impact)

These can be done in < 30 minutes each:

1. **Status text below waveform** (15 min)
   ```tsx
   {isRecording && !isProcessing && "Listening..."}
   {isProcessing && "Transcribing..."}
   ```

2. **Show segment count** (10 min)
   ```tsx
   {transcriptions.length > 0 && `Segments: ${transcriptions.length}`}
   ```

3. **Add Cmd/Ctrl+R keyboard shortcut** (20 min)
   - Start/stop recording with keyboard

---

## 📝 Notes & Decisions

### What to Skip (For Now)
- Dark mode toggle - CSS already works, just needs UI control
- Tutorial modal - Can wait until more features exist
- Export preview - Phase 5 feature
- Turbopack migration - Wait for upstream fix

### What to Prioritize
1. Reliability (retry logic for transcription failures)
2. Phase 2 preparation (timestamps, editing)
3. User feedback (status indicators)

### Open Questions
- [ ] Should VAD settings be exposed in UI or keep hidden for simplicity?
- [x] SILENCE_DURATION_MS reduced to 500ms - test for quality impact ✅

### Completed Performance Improvements
- ✅ AudioWorklet migration (non-blocking UI)
- ✅ Buffer size limits (10MB max)
- ✅ Optimistic UI updates (instant button feedback)
- ✅ AudioContext reuse (faster subsequent recordings)
- ✅ Waveform baseline visible on load
- ✅ Reduced VAD silence duration (500ms)

---

## 🚀 Recommended Order

**Next Steps - Polish Phase 1:**
1. Add retry logic for failed transcriptions
2. Add status indicators (Quick Win #1)
3. Add segment count display (Quick Win #2)
4. Add keyboard shortcuts (Quick Win #3)

**Week 2 - Prepare Phase 2:**
1. Add timestamps to segments
2. Implement text editing

**Later:**
- Accessibility improvements (ongoing)
- VAD UI configuration (Phase 4?)

---

**Edit this file to check off items, add notes, or skip tasks!**
