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

  readonly timer = signal<Timer | null>(null);
  readonly nowMs = signal(Date.now());
  /** Minute-of-day derived from `nowMs` — kept as a single source of truth instead of a second signal set alongside it. */
  readonly now = computed(() => {
    const date = new Date(this.nowMs());
    return date.getHours() * 60 + date.getMinutes();
  });
  readonly promptOpen = signal(false);
  readonly draftTitle = signal('');

  constructor() {
    this.timer.set(this.storage.loadTimer());
  }

  /** Updates the live clock, called once a second by the store's tick loop. */
  setNow(epochMs: number): void {
    this.nowMs.set(epochMs);
  }

  /** Whether the running timer's start day differs from `nowDate`'s — i.e. it has crossed midnight. */
  hasDayChanged(nowDate: Date): boolean {
    const currentTimer = this.timer();
    return !!currentTimer && toIsoDate(nowDate) !== toIsoDate(new Date(currentTimer.startedAt));
  }

  /** Whether the running timer has run past the end of the visible window, on the same day it started. */
  isPastWindowEnd(nowMinuteOfDay: number): boolean {
    return !!this.timer() && nowMinuteOfDay >= this.settings.endHour() * 60;
  }

  /** Starts a new timer and resets the start-timer prompt. No-ops if a timer is already running, so a stray call
   *  can never overwrite one and silently discard whatever time it had already accrued. */
  begin(timer: Timer): void {
    if (this.timer()) return;
    this.timer.set(timer);
    this.storage.saveTimer(timer);
    this.promptOpen.set(false);
    this.draftTitle.set('');
    this.nowMs.set(timer.startedAt);
  }

  /**
   * Computes the snapped start/end minutes the running timer should become an entry at, or null if no timer is
   * running. Deliberately never clamps against the *visible* settings window — that's just the render range, and
   * entries are allowed to exist outside it (see `revealBefore`/`revealAfter`). Only clamps to the timer's own day:
   * if `now` has rolled past midnight relative to the timer's start, the entry is clipped at 24:00 for that day
   * rather than wrapping into a bogus, much-shorter range.
   */
  computeFinishRange(endAtMinute?: number): TimerFinishRange | null {
    const currentTimer = this.timer();
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

  /** Clears the timer, used both when finishing it into an entry and when discarding it outright. */
  clear(): void {
    this.timer.set(null);
    this.storage.saveTimer(null);
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
