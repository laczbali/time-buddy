import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { orderDragSlots, computeGrabPosition, trackPointerGesture } from './interaction/pointer-drag';
import { MOBILE_BREAKPOINT, SLOT_MINUTES } from './model/constants';
import type { Drag, Guide, HoverSlot, TrackedEvent } from './model/types';
import { addManagedListener, entryBoxTopHeight, parseIsoDate, slotIndexAt, toIsoDate } from './model/utils';
import { TimeTrackerEntries } from './services/time-tracker-entries';
import { TimeTrackerSettings } from './services/time-tracker-settings';
import { TimeTrackerTimer } from './services/time-tracker-timer';
import { buildEntriesViewModel, buildLiveViewModel, mergeViewModel } from './view-model/view-model.builder';

/**
 * Orchestrates the time tracker feature: owns week-navigation/pointer-interaction state itself,
 * delegates settings/timer/entries state to their own services, and assembles the `vm` the templates render.
 */
@Injectable()
export class TimeTrackerStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly settingsService = inject(TimeTrackerSettings);
  private readonly timerService = inject(TimeTrackerTimer);
  private readonly entriesService = inject(TimeTrackerEntries);

  private readonly todayDate = new Date();

  readonly selected = signal(toIsoDate(this.todayDate));
  readonly today = signal(toIsoDate(this.todayDate));
  readonly drag = signal<Drag | null>(null);
  readonly hover = signal<HoverSlot | null>(null);
  readonly guide = signal<Guide | null>(null);
  readonly isMobile = signal(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);
  readonly colW = signal(120);

  private tickIntervalId?: ReturnType<typeof setInterval>;

  constructor() {
    addManagedListener(this.destroyRef, window, 'resize', () => this.isMobile.set(window.innerWidth < MOBILE_BREAKPOINT));

    // Drives the "now" line, the running timer's elapsed label, midnight rollover, and auto-finishing an overrunning timer.
    const tick = () => {
      const now = new Date();
      const nowMinuteOfDay = now.getHours() * 60 + now.getMinutes();
      const runningTimer = this.timerService.timer();
      if (runningTimer && this.timerService.hasDayChanged(now)) {
        // The timer's day has ended — close it out at 24:00 for that day, then seamlessly continue tracking
        // the same title into the new day, so time worked across midnight isn't silently discarded.
        this.finishTimer(1440);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        this.timerService.begin({ title: runningTimer.title, startedAt: startOfToday, day: toIsoDate(now) });
      } else if (runningTimer && this.timerService.isPastWindowEnd(nowMinuteOfDay)) {
        this.finishTimer(this.settingsService.endHour() * 60);
      }
      if (runningTimer || nowMinuteOfDay !== this.timerService.now()) {
        this.timerService.setNow(now.getTime());
        this.today.set(toIsoDate(now));
      }
    };
    tick();
    this.tickIntervalId = setInterval(tick, 1000);

    this.destroyRef.onDestroy(() => {
      if (this.tickIntervalId) clearInterval(this.tickIntervalId);
    });
  }

  /** Records the day column's measured width, used to size overlapping entries. Ignores negligible (<1px) changes. */
  reportColumnWidth(width: number): void {
    if (width && Math.abs(width - this.colW()) > 1) this.colW.set(width);
  }

  /** The 5 (or 7, with weekends shown) dates of the week containing the selected day, starting on Monday. */
  weekDays(): Date[] {
    const selectedDate = parseIsoDate(this.selected());
    const daysSinceMonday = (selectedDate.getDay() + 6) % 7;
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - daysSinceMonday);
    return Array.from({ length: this.settingsService.weekends() ? 7 : 5 }, (_, dayOffset) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + dayOffset);
      return day;
    });
  }

  /** Moves the selected day forward/backward by `weekOffset` weeks (negative to go back). */
  shiftWeek(weekOffset: number): void {
    const date = parseIsoDate(this.selected());
    date.setDate(date.getDate() + weekOffset * 7);
    this.selected.set(toIsoDate(date));
    this.hover.set(null);
  }

  /** Starts a timer for `title`, auto-enabling weekends and widening the hour window if needed. No-ops on a blank title. */
  beginTimer(title: string): void {
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) return;
    const now = new Date();
    const dayOfWeek = now.getDay();
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !this.settingsService.weekends()) this.settingsService.setSetting('weekends', true);
    this.settingsService.ensureWindow(now);
    this.timerService.begin({ title: trimmedTitle, startedAt: now.getTime(), day: toIsoDate(now) });
    this.selected.set(toIsoDate(now));
  }

  /** Turns the running timer into an entry. No-ops if no timer is running. */
  finishTimer(endAtMinute?: number): void {
    const range = this.timerService.computeFinishRange(endAtMinute);
    if (!range) return;
    this.entriesService.addTimedEvent(range);
    this.timerService.clear();
  }

  discardTimer(): void {
    this.timerService.clear();
  }

  /** Selects an entry's day and opens it in the edit modal. */
  openEntry(entry: TrackedEvent): void {
    this.selected.set(entry.day);
    this.hover.set(null);
    this.entriesService.beginEdit(entry);
  }

  /** Builds the pointer-down handler for empty space in day column `dayKey` — a drag-to-select gesture that opens the new-entry modal on release. */
  makeDown(dayKey: string) {
    return (downEvent: PointerEvent) => {
      if (downEvent.button === 1 || downEvent.button === 2) return;
      const columnRect = (downEvent.currentTarget as HTMLElement).getBoundingClientRect();
      const anchorSlot = slotIndexAt(columnRect, downEvent.clientY, this.settingsService.span(), SLOT_MINUTES);
      this.selected.set(dayKey);
      this.drag.set({ key: dayKey, startSlot: anchorSlot, endSlot: anchorSlot + 1 });
      this.hover.set(null);

      trackPointerGesture(
        this.destroyRef,
        downEvent,
        (moveEvent) => {
          const currentSlot = slotIndexAt(columnRect, moveEvent.clientY, this.settingsService.span(), SLOT_MINUTES);
          const { startSlot, endSlot } = orderDragSlots(anchorSlot, currentSlot);
          this.drag.set({ key: dayKey, startSlot, endSlot: endSlot + 1 });
        },
        () => {
          const drag = this.drag();
          if (!drag) return;
          const { startSlot, endSlot } = orderDragSlots(drag.startSlot, drag.endSlot);
          const start = this.settingsService.startHour() * 60 + startSlot * SLOT_MINUTES;
          const end = this.settingsService.startHour() * 60 + Math.max(endSlot, startSlot + 1) * SLOT_MINUTES;
          this.drag.set(null);
          this.entriesService.beginCreate(dayKey, start, end);
        },
      );
    };
  }

  /** Builds the pointer-down handler for grabbing an existing entry — moves or resizes it while dragging, or opens it for editing on a plain click. */
  makeGrab(entry: TrackedEvent, mode: 'move' | 'start' | 'end') {
    return (downEvent: PointerEvent) => {
      if (downEvent.button === 1 || downEvent.button === 2) return;
      downEvent.stopPropagation();
      const entryElement = (downEvent.currentTarget as HTMLElement).closest('[data-ev]') as HTMLElement;
      const dayColumnElement = entryElement.closest('[data-day-column]') as HTMLElement;
      const columnRect = dayColumnElement.getBoundingClientRect();
      const startHour = this.settingsService.startHour();
      const span = this.settingsService.span();
      const gridPx = this.settingsService.gridPx();
      const minutesPerPixel = span / columnRect.height;
      const startClientY = downEvent.clientY;
      const originalTiming = { start: entry.start, end: entry.end };
      const bounds = {
        minMinute: startHour * 60,
        maxMinute: this.settingsService.endHour() * 60,
        slotMinutes: SLOT_MINUTES,
      };
      let hasMoved = false;
      // Tracked locally and only committed to the shared entries signal on drop — so dragging doesn't force
      // every visible day's entries to re-filter/re-lane-assign/re-color on every pointer pixel. The box's
      // own position is driven straight via the DOM (below) instead, bypassing Angular entirely mid-drag.
      let liveTiming = originalTiming;
      this.selected.set(entry.day);
      this.hover.set(null);

      trackPointerGesture(
        this.destroyRef,
        downEvent,
        (moveEvent) => {
          const deltaY = moveEvent.clientY - startClientY;
          if (Math.abs(deltaY) > 3) hasMoved = true;
          const deltaMinutes = deltaY * minutesPerPixel;
          liveTiming = computeGrabPosition(mode, originalTiming, deltaMinutes, bounds);
          this.guide.set({ key: entry.day, minuteOfDay: mode === 'end' ? liveTiming.end : liveTiming.start });
          // Direct style update so the box visually follows the cursor without forcing a full entries rebuild
          // per pixel. Angular reasserts these same styles from the real model once, on drop, so there's no jump.
          const { top, height } = entryBoxTopHeight(liveTiming.start, liveTiming.end, startHour, span, gridPx);
          entryElement.style.top = top;
          entryElement.style.height = height;
        },
        () => {
          this.guide.set(null);
          if (hasMoved) {
            this.entriesService.updateEventTiming(entry.id, liveTiming.start, liveTiming.end);
            this.entriesService.persistEvents();
          } else {
            entryElement.style.top = '';
            entryElement.style.height = '';
            this.openEntry(this.entriesService.events().find((existingEntry) => existingEntry.id === entry.id) || entry);
          }
        },
      );
    };
  }

  /** Entries/settings/selection-driven — recomputes only on real data changes, never on a clock tick or gesture pixel. */
  readonly entriesVm = computed(() => buildEntriesViewModel(this, this.settingsService, this.entriesService));
  /** Clock/timer/gesture-driven — deliberately cheap so it can recompute every tick and every drag pixel without cost. */
  readonly liveVm = computed(() => buildLiveViewModel(this, this.settingsService, this.timerService));
  readonly vm = computed(() => mergeViewModel(this.entriesVm(), this.liveVm()));
}
