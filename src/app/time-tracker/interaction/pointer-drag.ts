import type { DestroyRef } from '@angular/core';

export interface GrabBounds {
  minMinute: number;
  maxMinute: number;
  slotMinutes: number;
}

/**
 * Wires up a pointer gesture's move/end lifecycle: `onMove` runs on every `pointermove`, and `onEnd` runs once on
 * whichever of `pointerup`/`pointercancel` fires first — an OS-level interruption (multi-touch takeover, back-swipe,
 * an incoming notification) ends the gesture the same way a normal release does, instead of leaving it stuck open.
 * All listeners (and the Angular destroy hook) are torn down together, exactly once. Events are filtered to
 * `downEvent`'s `pointerId` so a second concurrent pointer (e.g. multi-touch) can't drive this gesture.
 */
export function trackPointerGesture(
  destroyRef: DestroyRef,
  downEvent: PointerEvent,
  onMove: (event: PointerEvent) => void,
  onEnd: (event: PointerEvent) => void,
): void {
  const pointerId = downEvent.pointerId;
  const handleMove = (event: PointerEvent) => {
    if (event.pointerId === pointerId) onMove(event);
  };
  const handleEnd = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    cleanup();
    onEnd(event);
  };
  const cleanup = () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleEnd);
    window.removeEventListener('pointercancel', handleEnd);
    unregisterDestroy();
  };
  const unregisterDestroy = destroyRef.onDestroy(cleanup);
  window.addEventListener('pointermove', handleMove);
  window.addEventListener('pointerup', handleEnd);
  window.addEventListener('pointercancel', handleEnd);
}

/** Rounds a minute value to the nearest slot boundary (e.g. nearest 15 minutes). */
export function snapToSlot(minutes: number, slotMinutes: number): number {
  return Math.round(minutes / slotMinutes) * slotMinutes;
}

/** Orders the two slot indices a drag-to-select gesture spans, regardless of which direction the drag went. */
export function orderDragSlots(anchorSlot: number, currentSlot: number): { startSlot: number; endSlot: number } {
  return { startSlot: Math.min(anchorSlot, currentSlot), endSlot: Math.max(anchorSlot, currentSlot) };
}

/**
 * Computes an entry's new start/end minutes while it's being moved or resized by its edge handles,
 * snapping to the slot grid and clamping to the visible hour window.
 */
export function computeGrabPosition(
  mode: 'move' | 'start' | 'end',
  original: { start: number; end: number },
  deltaMinutes: number,
  bounds: GrabBounds,
): { start: number; end: number } {
  const { minMinute, maxMinute, slotMinutes } = bounds;
  const snap = (minutes: number) => snapToSlot(minutes, slotMinutes);

  if (mode === 'move') {
    const duration = original.end - original.start;
    const snappedDelta = snap(deltaMinutes);
    // Clamps newStart directly against the window in one step, capping how far right it can go by the entry's
    // own duration, so a start-side clamp can never be undone by a subsequent end-side clamp.
    const maxStart = Math.max(minMinute, maxMinute - duration);
    const newStart = Math.min(Math.max(original.start + snappedDelta, minMinute), maxStart);
    return { start: newStart, end: newStart + duration };
  }

  if (mode === 'start') {
    // The entry's own end (minus one slot) is the real upper bound — if the visible window has shrunk since
    // the entry was created, that window's minMinute must never be allowed to push start past it.
    const upperBound = original.end - slotMinutes;
    const lowerBound = Math.min(minMinute, upperBound);
    return { start: Math.max(lowerBound, Math.min(snap(original.start + deltaMinutes), upperBound)), end: original.end };
  }

  // Mirror image: the entry's own start (plus one slot) is the real lower bound for its end.
  const lowerBound = original.start + slotMinutes;
  const upperBound = Math.max(maxMinute, lowerBound);
  return { start: original.start, end: Math.min(upperBound, Math.max(snap(original.end + deltaMinutes), lowerBound)) };
}
