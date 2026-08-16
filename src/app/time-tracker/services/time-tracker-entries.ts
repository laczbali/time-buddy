import { Injectable, inject, signal } from '@angular/core';
import { SLOT_MINUTES } from '../model/constants';
import type { Modal, TrackedEvent } from '../model/types';
import { createEntryId, formatTimeForInput, parseTimeToMinutes } from '../model/utils';
import { TimeTrackerSettings } from './time-tracker-settings';
import { TimeTrackerStorage } from './time-tracker-storage';
import type { TimerFinishRange } from './time-tracker-timer';

/** Owns tracked entries and recent titles, plus the entry-modal's draft/editing UI state. */
@Injectable()
export class TimeTrackerEntries {
  private readonly storage = inject(TimeTrackerStorage);
  private readonly settings = inject(TimeTrackerSettings);

  readonly events = signal<TrackedEvent[]>([]);
  readonly recents = signal<string[]>([]);
  readonly modal = signal<Modal | null>(null);
  readonly draft = signal('');
  readonly draftNote = signal('');
  readonly draftStart = signal('');
  readonly draftEnd = signal('');
  readonly draftExcluded = signal(false);
  /** The draft's true end minute, unclamped — lets `commit()` tell an untouched 24:00 end apart from a genuine 23:59 one. */
  private draftEndRaw = 0;
  /** Which summary groups (by group key) are expanded in the sidebar. */
  readonly open = signal<Record<string, boolean>>({});

  constructor() {
    this.events.set(this.storage.loadEvents());
    this.recents.set(this.storage.loadRecents());
  }

  /** Expands/collapses a sidebar summary group. */
  toggleGroup(groupKey: string): void {
    this.open.update((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  }

  /** Widens the visible hour window backward far enough to show the earliest entry hidden before it on `dayKey`. */
  revealBefore(dayKey: string): void {
    const windowStartMinute = this.settings.startHour() * 60;
    const hiddenEntries = this.events().filter((entry) => entry.day === dayKey && entry.start < windowStartMinute);
    if (!hiddenEntries.length) return;
    const earliestStart = Math.min(...hiddenEntries.map((entry) => entry.start));
    this.settings.setSetting('startHour', Math.max(0, Math.floor(earliestStart / 60)));
  }

  /** Widens the visible hour window forward far enough to show the latest entry hidden after it on `dayKey`. */
  revealAfter(dayKey: string): void {
    const windowEndMinute = this.settings.endHour() * 60;
    const hiddenEntries = this.events().filter((entry) => entry.day === dayKey && entry.end > windowEndMinute);
    if (!hiddenEntries.length) return;
    const latestEnd = Math.max(...hiddenEntries.map((entry) => entry.end));
    this.settings.setSetting('endHour', Math.min(24, Math.ceil(latestEnd / 60)));
  }

  /** Moves `title` to the front of the recent-titles list, capped at 8 entries. */
  addRecent(title: string): void {
    const recents = [title].concat(this.recents().filter((recent) => recent !== title)).slice(0, 8);
    this.recents.set(recents);
    this.storage.saveRecents(recents);
  }

  /** Adds a new entry created from a finished timer. */
  addTimedEvent(range: TimerFinishRange): void {
    const events = this.events().concat([
      {
        id: createEntryId(),
        day: range.day,
        start: range.start,
        end: range.end,
        title: range.title,
        note: '',
        excluded: false,
        viaTimer: true,
      },
    ]);
    this.events.set(events);
    this.addRecent(range.title);
    this.storage.saveEvents(events);
  }

  /** Updates an entry's start/end in memory only (no persist) — used while a drag/resize is still in progress. */
  updateEventTiming(id: string, start: number, end: number): void {
    this.events.update((events) => events.map((entry) => (entry.id === id ? { ...entry, start, end } : entry)));
  }

  /** Persists the current entries — called once a drag/resize gesture ends. */
  persistEvents(): void {
    this.storage.saveEvents(this.events());
  }

  /** Opens the entry modal pre-filled for creating a new entry from a drag-to-select gesture. */
  beginCreate(dayKey: string, start: number, end: number): void {
    this.modal.set({ key: dayKey, id: null });
    this.draft.set('');
    this.draftNote.set('');
    this.draftExcluded.set(false);
    this.draftStart.set(formatTimeForInput(start));
    this.draftEnd.set(formatTimeForInput(end));
    this.draftEndRaw = end;
  }

  /** Opens the entry modal pre-filled with an existing entry's fields for editing. */
  beginEdit(entry: TrackedEvent): void {
    this.modal.set({ key: entry.day, id: entry.id });
    this.draft.set(entry.title);
    this.draftNote.set(entry.note || '');
    this.draftExcluded.set(!!entry.excluded);
    this.draftStart.set(formatTimeForInput(entry.start));
    this.draftEnd.set(formatTimeForInput(entry.end));
    this.draftEndRaw = entry.end;
  }

  /** Closes the entry modal and clears its draft fields. */
  closeModal(): void {
    this.modal.set(null);
    this.draft.set('');
    this.draftNote.set('');
    this.draftExcluded.set(false);
  }

  /** Saves the entry modal's draft fields as a new or updated entry. No-ops if the title or times are invalid. */
  commit(): void {
    const title = (this.draft() || '').trim();
    const modal = this.modal();
    if (!title || !modal) return;
    const start = parseTimeToMinutes(this.draftStart());
    let end = parseTimeToMinutes(this.draftEnd());
    if (start == null || end == null) return;
    // The End field can't display 24:00, so it was shown as 23:59; if the user never touched it, restore the
    // real end instead of reparsing "23:59" back and shrinking the entry by a minute on every re-save.
    if (this.draftEnd() === formatTimeForInput(this.draftEndRaw)) end = this.draftEndRaw;
    if (end <= start) end = start + SLOT_MINUTES;
    end = Math.min(end, 1440);
    const note = (this.draftNote() || '').trim();
    const excluded = !!this.draftExcluded();

    let events: TrackedEvent[];
    if (modal.id) {
      events = this.events().map((entry) => (entry.id === modal.id ? { ...entry, title, start, end, note, excluded } : entry));
    } else {
      events = this.events().concat([{ id: createEntryId(), day: modal.key, start, end, title, note, excluded }]);
    }
    this.events.set(events);
    this.addRecent(title);
    this.storage.saveEvents(events);
    this.closeModal();
  }

  /** Deletes the entry currently open in the edit modal. No-ops if the modal is closed or creating a new entry. */
  deleteCurrent(): void {
    const modal = this.modal();
    if (!modal || !modal.id) return;
    const events = this.events().filter((entry) => entry.id !== modal.id);
    this.events.set(events);
    this.storage.saveEvents(events);
    this.modal.set(null);
    this.draft.set('');
  }
}
