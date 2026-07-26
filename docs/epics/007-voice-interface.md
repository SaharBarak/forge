# Epic: Voice Interface

## Overview

Add voice input and text-to-speech output for hands-free deliberation participation.

## Problem Statement

Users want to:
- **Dictate messages** instead of typing
- **Listen to agent responses** while multitasking
- **Run sessions hands-free** (driving, cooking, etc.)
- **Accessibility** for users with motor impairments

## Proposed Solution

### Voice Input (Speech-to-Text)

1. **Web Speech API** (built into Chromium/Electron)
   - Push-to-talk or voice activation
   - Real-time transcription preview
   - Language detection (Hebrew/English)

2. **Whisper API** (optional, higher accuracy)
   - Fallback for better Hebrew support
   - Configurable in settings

### Voice Output (Text-to-Speech)

1. **Browser TTS** (free, built-in)
   - System voices
   - Different voice per agent persona

2. **ElevenLabs/OpenAI TTS** (optional, premium)
   - Higher quality voices
   - Distinct agent personalities

### Voice Modes

```typescript
interface VoiceSettings {
  input: {
    enabled: boolean;
    mode: 'push-to-talk' | 'voice-activation';
    language: 'auto' | 'en' | 'he';
    provider: 'browser' | 'whisper';
  };
  
  output: {
    enabled: boolean;
    readAgentMessages: boolean;
    readHumanMessages: boolean;
    provider: 'browser' | 'elevenlabs' | 'openai';
    voicePerAgent: Record<string, string>;
    speed: number;  // 0.5 - 2.0
  };
}
```

### UI Components

1. **Voice Control Bar**
   - Microphone button with recording indicator
   - Speaker toggle
   - Voice settings quick access

2. **Transcription Preview**
   - Live transcription as you speak
   - Edit before sending
   - Cancel option

3. **Voice Settings Panel**
   - Input/output toggles
   - Provider selection
   - Voice assignment per agent

## Affected Components

| Component | Changes |
|-----------|---------|
| `src/lib/voice/` | New module for voice I/O |
| `src/lib/voice/SpeechRecognition.ts` | STT handling |
| `src/lib/voice/TextToSpeech.ts` | TTS handling |
| `src/components/voice/` | VoiceBar, TranscriptionPreview |
| `src/stores/voiceStore.ts` | Voice settings state |
| Settings panel | Voice configuration UI |

## Success Criteria

- [ ] Voice input works in Electron
- [ ] Real-time transcription preview
- [ ] TTS reads agent messages aloud
- [ ] Different voices per agent
- [ ] Hebrew/English support
- [ ] Push-to-talk keyboard shortcut
- [ ] Voice settings persist

## Implementation Phases

### Phase 1: Basic STT
- Web Speech API integration
- Push-to-talk button
- Transcription to message input

### Phase 2: Basic TTS
- Browser TTS for agent messages
- Speaker toggle
- Speed control

### Phase 3: Enhanced Features
- Voice activation mode
- Per-agent voice assignment
- Transcription preview/edit

### Phase 4: Premium Providers
- Whisper API integration
- ElevenLabs/OpenAI TTS
- Voice quality settings

## Estimated Effort

- **Backend (BE)**: 2 days
- **Frontend (FE)**: 4 days
- **QA**: 2 days
- **Total**: ~8 days

## Dependencies

- Web Speech API (built into Electron)
- Optional: Whisper API key, ElevenLabs API key

## Risks

| Risk | Mitigation |
|------|------------|
| Hebrew STT quality | Whisper fallback |
| Browser TTS sounds robotic | Premium TTS option |
| Background noise | Voice activation threshold |
