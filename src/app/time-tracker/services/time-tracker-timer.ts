import { Injectable, computed, inject, signal } from '@angular/core';
import { SLOT_MINUTES } from '../model/constants';
import { snapToSlot } from '../interaction/pointer-drag';
import type { Timer } from '../model/types';
import { toIsoDate } from '../model/utils';
import { TimeTrackerSettings } from './time-tracker-settings';
import { TimeTrackerStorage } from './time-tracker-storage';

export interface TimerFinishRange {
  day: string;
  title: string;
  start: number;
  end: number;
}

/** Owns the in-progress timer, the live clock ("now") signals, and the start-timer prompt's UI state. */
@Injectable()
export class TimeTrackerTimer {
  private readonly storage = inject(TimeTrackerStorage);
  private readonly settings = inject(TimeTrackerSettings);

  readonly timers = signal<Timer[]>([]);
  readonly nowMs = signal(Date.now());
  /** Minute-of-day derived from `nowMs` — kept as a single source of truth instead of a second signal set alongside it. */
  readonly now = computed(() => {
    const date = new Date(this.nowMs());
    return date.getHours() * 60 + date.getMinutes();
  });
  readonly promptOpen = signal(false);
  readonly draftTitle = signal('');

  constructor() {
    this.timers.set(this.storage.loadTimers());
  }

  /** Updates the live clock, called once a second by the store's tick loop. */
  setNow(epochMs: number): void {
    this.nowMs.set(epochMs);
  }

  /** Whether the timer `timerId`'s start day differs from `nowDate`'s — i.e. it has crossed midnight. False if it isn't running. */
  hasDayChanged(timerId: string, nowDate: Date): boolean {
    const timer = this.timers().find((t) => t.id === timerId);
    return !!timer && toIsoDate(nowDate) !== toIsoDate(new Date(timer.startedAt));
  }

  /** Whether the timer `timerId` has run past the end of the visible window, on the same day it started. */
  isPastWindowEnd(timerId: string, nowMinuteOfDay: number): boolean {
    return this.timers().some((t) => t.id === timerId) && nowMinuteOfDay >= this.settings.endHour() * 60;
  }

  /** Starts a new timer, appending it to the running set — any number of timers can run concurrently. */
  begin(timer: Timer): void {
    const next = this.timers().concat([timer]);
    this.timers.set(next);
    this.storage.saveTimers(next);
    this.promptOpen.set(false);
    this.draftTitle.set('');
    // Only ever advances the clock, never rewinds it: the store's midnight-rollover path re-begins a timer with
    // startedAt pinned to midnight (a past instant), which must not yank other running timers' elapsed display backwards.
    if (timer.startedAt > this.nowMs()) this.nowMs.set(timer.startedAt);
  }

  /**
   * Computes the snapped start/end minutes the timer `timerId` should become an entry at, or null if it isn't
   * running. Deliberately never clamps against the *visible* settings window — that's just the render range, and
   * entries are allowed to exist outside it (see `revealBefore`/`revealAfter`). Only clamps to the timer's own day:
   * if `now` has rolled past midnight relative to the timer's start, the entry is clipped at 24:00 for that day
   * rather than wrapping into a bogus, much-shorter range.
   */
  computeFinishRange(timerId: string, endAtMinute?: number): TimerFinishRange | null {
    const currentTimer = this.timers().find((t) => t.id === timerId);
    if (!currentTimer) return null;
    const snap = (minutes: number) => snapToSlot(minutes, SLOT_MINUTES);
    const timerStartDate = new Date(currentTimer.startedAt);
    const entryStart = snap(timerStartDate.getHours() * 60 + timerStartDate.getMinutes());

    const now = new Date();
    const sameDay = toIsoDate(now) === toIsoDate(timerStartDate);
    const rawEnd = endAtMinute != null ? endAtMinute : sameDay ? now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 : 1440;
    const entryEnd = Math.min(1440, Math.max(snap(rawEnd), entryStart + SLOT_MINUTES));
    return { day: currentTimer.day, title: currentTimer.title, start: entryStart, end: entryEnd };
  }

  /** Removes one timer by id, used both when finishing it into an entry and when discarding it outright. Other running timers are untouched. */
  clear(timerId: string): void {
    const next = this.timers().filter((t) => t.id !== timerId);
    this.timers.set(next);
    this.storage.saveTimers(next);
  }

  openPrompt(): void {
    this.promptOpen.set(true);
    this.draftTitle.set('');
  }

  closePrompt(): void {
    this.promptOpen.set(false);
    this.draftTitle.set('');
  }

  setDraftTitle(title: string): void {
    this.draftTitle.set(title);
  }
}
