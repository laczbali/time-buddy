import type { DestroyRef } from '@angular/core';
import type { TrackedEvent } from './types';

/** Formats a Date as a local 'YYYY-MM-DD' key, used to identify a calendar day. */
export function toIsoDate(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

/** Parses a 'YYYY-MM-DD' day key back into a local Date. */
export function parseIsoDate(dateKey: string): Date {
  const parts = dateKey.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** Splits minutes-since-midnight into its hour and zero-padded minute parts, shared by both time formatters. */
function splitMinutesOfDay(minutesOfDay: number): { hour: number; minutePart: string } {
  return { hour: Math.floor(minutesOfDay / 60), minutePart: String(minutesOfDay % 60).padStart(2, '0') };
}

/** Formats minutes-since-midnight as zero-padded "HH:MM", e.g. 90 -> "01:30". */
export function formatTime(minutesOfDay: number): string {
  const { hour, minutePart } = splitMinutesOfDay(minutesOfDay);
  return String(hour).padStart(2, '0') + ':' + minutePart;
}

/** Formats minutes-since-midnight as "H:MM" (no leading zero on the hour), used where space is tight. */
export function formatTimeCompact(minutesOfDay: number): string {
  const { hour, minutePart } = splitMinutesOfDay(minutesOfDay);
  return hour + ':' + minutePart;
}

/** Formats a start/end minute pair as a compact "H:MM-H:MM" range, e.g. for entry boxes and summary rows. */
export function formatTimeRange(start: number, end: number): string {
  return formatTimeCompact(start) + '-' + formatTimeCompact(end);
}

/** Like `formatTime`, but clamped to 23:59 — `<input type="time">` can't represent minute 1440 ("24:00"). */
export function formatTimeForInput(minutesOfDay: number): string {
  return formatTime(Math.min(minutesOfDay, 1439));
}

/** Parses an "HH:MM" string into minutes-since-midnight, or null if it isn't a valid time. */
export function parseTimeToMinutes(timeString: string): number | null {
  const parts = (timeString || '').split(':').map(Number);
  return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts[0] * 60 + parts[1] : null;
}

/** Generates a unique id for a new tracked entry. */
export function createEntryId(): string {
  return crypto.randomUUID();
}

/** Formats a minute count as a short duration label, e.g. 90 -> "1h 30m". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? (remainingMinutes ? hours + 'h ' + remainingMinutes + 'm' : hours + 'h') : remainingMinutes + 'm';
}

const hueCache = new Map<string, number>();

/** Derives a stable OKLCH hue (0-359) from a title string, so each distinct title keeps a consistent color. Memoized since it's called per visible entry on every render. */
export function hueForTitle(title: string): number {
  const cached = hueCache.get(title);
  if (cached !== undefined) return cached;
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) % 360;
  hueCache.set(title, hash);
  return hash;
}

/** Formats elapsed milliseconds as "MM:SS", or "H:MM:SS" once it passes an hour. */
export function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minutesLabel = String(minutes).padStart(2, '0');
  const secondsLabel = String(seconds).padStart(2, '0');
  return hours ? hours + ':' + minutesLabel + ':' + secondsLabel : minutesLabel + ':' + secondsLabel;
}

/** Converts a minute-of-day into its vertical percent position within a `startHour`-anchored, `span`-tall grid. Pass `startHour: 0` to convert a plain duration (rather than a minute-of-day) into a percent height instead. */
export function minuteToPercent(minute: number, startHour: number, span: number): string {
  return ((minute - startHour * 60) / span) * 100 + '%';
}

/** Computes an entry box's `top`/`height` CSS values (and the raw, unclamped `heightPx`) from its start/end minutes. Shared by the renderer and the live-drag DOM update so they can never drift apart. */
export function entryBoxTopHeight(
  start: number,
  end: number,
  startHour: number,
  span: number,
  gridPx: number,
): { top: string; height: string; heightPx: number } {
  const top = minuteToPercent(start, startHour, span);
  const heightPx = ((end - start) / span) * gridPx;
  return { top, height: Math.max(heightPx, 14) + 'px', heightPx };
}

/** Adds a `window` event listener and tears it down via `destroyRef` — the common shape behind every plain resize/viewport listener in this feature. */
export function addManagedListener<K extends keyof WindowEventMap>(
  destroyRef: DestroyRef,
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
): void {
  target.addEventListener(type, listener);
  destroyRef.onDestroy(() => target.removeEventListener(type, listener));
}

/** Sums the tracked duration (in minutes) of a list of entries. */
export function sumMinutes(events: TrackedEvent[]): number {
  return events.reduce((total, entry) => total + (entry.end - entry.start), 0);
}

/** Converts a pointer's Y position within a day column into a slot index (0-based, `spanMinutes / slotMinutes` slots total). */
export function slotIndexAt(columnRect: DOMRect, clientY: number, spanMinutes: number, slotMinutes: number): number {
  const slotCount = spanMinutes / slotMinutes;
  return Math.max(0, Math.min(slotCount - 1, Math.floor(((clientY - columnRect.top) / columnRect.height) * slotCount)));
}

/**
 * Assigns overlapping events to lanes so they can be rendered side by side.
 * Returns new objects with `_lane` (the event's column within its cluster) and `_lanes` (the cluster's total
 * column count) set — the input events are left untouched, since they're the same live references held by
 * `TimeTrackerEntries.events` and persisted to storage.
 */
export function assignLanes(events: TrackedEvent[]): TrackedEvent[] {
  const sortedEvents = events.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const result: TrackedEvent[] = [];
  let cluster: TrackedEvent[] = [];
  let clusterEndMinute = -1;

  const flushCluster = () => {
    if (!cluster.length) return;
    const laneEndTimes: number[] = [];
    const laneById = new Map<string, number>();
    cluster.forEach((event) => {
      let laneIndex = 0;
      while (laneEndTimes[laneIndex] != null && laneEndTimes[laneIndex] > event.start) laneIndex++;
      laneEndTimes[laneIndex] = event.end;
      laneById.set(event.id, laneIndex);
    });
    cluster.forEach((event) => {
      result.push({ ...event, _lane: laneById.get(event.id), _lanes: laneEndTimes.length });
    });
    cluster = [];
  };

  sortedEvents.forEach((event) => {
    if (cluster.length && event.start >= clusterEndMinute) {
      flushCluster();
      clusterEndMinute = -1;
    }
    cluster.push(event);
    clusterEndMinute = Math.max(clusterEndMinute, event.end);
  });
  flushCluster();
  return result;
}
