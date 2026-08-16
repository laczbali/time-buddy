import { Injectable, computed, inject, signal } from '@angular/core';
import { END_HOUR_DEFAULT, PPH, START_HOUR_DEFAULT } from '../model/constants';
import type { Settings } from '../model/types';
import { TimeTrackerStorage } from './time-tracker-storage';

/** Owns the visible-hours/weekends settings and the settings-panel open/closed UI state. */
@Injectable()
export class TimeTrackerSettings {
  private readonly storage = inject(TimeTrackerStorage);

  readonly settings = signal<Settings>({ startHour: null, endHour: null, weekends: false });
  readonly panelOpen = signal(false);

  readonly startHour = computed(() => this.settings().startHour ?? START_HOUR_DEFAULT);
  readonly endHour = computed(() => this.settings().endHour ?? END_HOUR_DEFAULT);
  readonly weekends = computed(() => !!this.settings().weekends);
  /** Length of the visible day window, in minutes. */
  readonly span = computed(() => (this.endHour() - this.startHour()) * 60);
  /** Height of the visible day window, in pixels. */
  readonly gridPx = computed(() => (this.endHour() - this.startHour()) * PPH);

  constructor() {
    const savedSettings = this.storage.loadSettings();
    if (savedSettings) this.settings.update((current) => ({ ...current, ...savedSettings }));
  }

  /** Updates one setting and persists the whole settings object. */
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings.update((current) => {
      const next = { ...current, [key]: value };
      this.storage.saveSettings(next);
      return next;
    });
  }

  /** Widens the visible hour window if needed so that `date`'s clock time falls inside it. */
  ensureWindow(date: Date): void {
    const hour = date.getHours();
    if (hour < this.startHour()) this.setSetting('startHour', hour);
    if (hour >= this.endHour()) this.setSetting('endHour', Math.min(24, hour + 1));
  }

  openPanel(): void {
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }
}
