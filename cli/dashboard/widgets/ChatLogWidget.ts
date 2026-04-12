/**
 * ChatLogWidget — uses contrib.log to display messages
 * Wraps the contrib.log widget with message formatting
 */

import type { Message } from '../../../src/types';
import { formatMessage, formatTypingIndicator } from '../formatters/messageFormatter';
import { SPINNER_FRAMES } from '../theme';

// contrib.log has a .log(text) method that appends and auto-scrolls
interface ContribLog {
  log(text: string): void;
  setContent(text: string): void;
  getContent(): string;
}

let lastLoggedCount = 0;
let typingInterval: ReturnType<typeof setInterval> | null = null;
let lastTypingLine: string | null = null;

/**
 * Append new messages to the chat log since last update
 */
export function appendMessages(widget: ContribLog, messages: Message[]): void {
  // Only log messages that are new since last call
  const newMessages = messages.slice(lastLoggedCount);
  for (const msg of newMessages) {
    const lines = formatMessage(msg);
    for (const line of lines) {
      widget.log(line);
    }
  }
  lastLoggedCount = messages.length;
}

/**
 * Start or update the typing indicator for the current speaker
 */
export function updateTypingIndicator(
  widget: ContribLog,
  currentSpeaker: string | null,
  screen: { render(): void },
): void {
  // Clear existing typing animation
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }

  if (!currentSpeaker) return;

  let frameIdx = 0;
  typingInterval = setInterval(() => {
    const frame = SPINNER_FRAMES[frameIdx % SPINNER_FRAMES.length];
    const line = formatTypingIndicator(currentSpeaker, frame);
    // We log each frame as a new line — contrib.log auto-scrolls
    // To avoid flooding, we only log on the first frame, then stop
    if (frameIdx === 0) {
      widget.log(line);
    }
    frameIdx++;
    if (frameIdx >= SPINNER_FRAMES.length) {
      frameIdx = 0;
    }
  }, 100);

  // Auto-stop after 500ms to avoid flooding the log
  setTimeout(() => {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  }, 500);
}

/**
 * Reset the log state (e.g. when starting a new session)
 */
export function resetChatLog(): void {
  lastLoggedCount = 0;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
}
