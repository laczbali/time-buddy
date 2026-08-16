export interface TrackedEvent {
  id: string;
  day: string;
  start: number;
  end: number;
  title: string;
  note: string;
  excluded: boolean;
  viaTimer?: boolean;
  /** Which side-by-side column this event was placed in when it overlaps others on the same day (set by `assignLanes`). */
  _lane?: number;
  /** How many columns the overlap cluster this event belongs to was split into (set by `assignLanes`). */
  _lanes?: number;
}

export interface Timer {
  title: string;
  startedAt: number;
  day: string;
}

export interface Settings {
  startHour: number | null;
  endHour: number | null;
  weekends: boolean;
}

/** An in-progress drag-to-select gesture on a day column, in slot-index units (not yet snapped to minutes). */
export interface Drag {
  key: string;
  startSlot: number;
  endSlot: number;
}

/** The slot the pointer is currently hovering over, used to draw the hover guide line. */
export interface HoverSlot {
  key: string;
  slotIndex: number;
}

/** The guide line shown while dragging/resizing an existing entry, positioned by absolute minute-of-day. */
export interface Guide {
  key: string;
  minuteOfDay: number;
}

/** Which entry modal is open: `id: null` means creating a new entry, otherwise editing an existing one. */
export interface Modal {
  key: string;
  id: string | null;
}
