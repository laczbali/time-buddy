import { Injectable } from '@angular/core';
import { EVENTS_STORAGE_KEY, RECENTS_STORAGE_KEY, SETTINGS_STORAGE_KEY, TIMER_STORAGE_KEY } from '../model/constants';
import type { Settings, Timer, TrackedEvent } from '../model/types';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore quota errors */
  }
}

/** Guards against a stored entry that isn't shaped like a `TrackedEvent` (corrupt data, or an old/incompatible schema). */
function isTrackedEvent(value: unknown): value is TrackedEvent {
  const entry = value as Partial<TrackedEvent> | null;
  return (
    !!entry &&
    typeof entry.id === 'string' &&
    typeof entry.day === 'string' &&
    typeof entry.start === 'number' &&
    typeof entry.end === 'number' &&
    typeof entry.title === 'string'
  );
}

/** Thin wrapper around localStorage read/write for the time tracker's four persisted slices of state. */
@Injectable()
export class TimeTrackerStorage {
  /** Reads the saved list of tracked entries, dropping any that are missing or corrupt, or an empty list if none is stored. */
  loadEvents(): TrackedEvent[] {
    const events = readJson(EVENTS_STORAGE_KEY, [] as TrackedEvent[]);
    return Array.isArray(events) ? events.filter(isTrackedEvent) : [];
  }

  /** Reads the saved list of recently-used entry titles, or an empty list if none is stored, it's corrupt, or not a list of strings. */
  loadRecents(): string[] {
    const recents = readJson(RECENTS_STORAGE_KEY, [] as string[]);
    return Array.isArray(recents) ? recents.filter((recent) => typeof recent === 'string') : [];
  }

  /** Reads saved user settings (start/end hour, weekends), or null if none is stored or it's corrupt. */
  loadSettings(): Partial<Settings> | null {
    const settings = readJson<Partial<Settings> | null>(SETTINGS_STORAGE_KEY, null);
    return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : null;
  }

  /** Reads a saved in-progress timer, discarding it if it's missing required fields (e.g. corrupt or from an old format). */
  loadTimer(): Timer | null {
    const timer = readJson<Timer | null>(TIMER_STORAGE_KEY, null);
    return timer && timer.title && timer.startedAt && timer.day ? timer : null;
  }

  saveEvents(events: TrackedEvent[]): void {
    writeJson(EVENTS_STORAGE_KEY, events);
  }

  saveRecents(recents: string[]): void {
    writeJson(RECENTS_STORAGE_KEY, recents);
  }

  saveSettings(settings: Settings): void {
    writeJson(SETTINGS_STORAGE_KEY, settings);
  }

  /** Persists the in-progress timer, or clears it from storage when passed null (timer discarded/finished). */
  saveTimer(timer: Timer | null): void {
    if (timer) writeJson(TIMER_STORAGE_KEY, timer);
    else removeStored(TIMER_STORAGE_KEY);
  }
}
