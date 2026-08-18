import {
  entryBoxTopHeight,
  formatElapsed,
  formatTime,
  formatTimeCompact,
  formatTimeRange,
  assignLanes,
  hueForTitle,
  minuteToPercent,
  slotIndexAt,
  sumMinutes,
} from '../model/utils';
import type { Drag, Guide, HoverSlot, Timer, TrackedEvent } from '../model/types';
import type { DayTimerVals, EventVals } from '../model/view-model';

/** Live gesture/hover signals `buildDayEntries`'s event handlers read fresh at invocation time — never a stale render-time snapshot. */
export interface DayGestureState {
  drag(): Drag | null;
  guide(): Guide | null;
  hover(): HoverSlot | null;
}

export interface DayEntriesParams {
  date: Date;
  isMobile: boolean;
  isSel: boolean;
  isToday: boolean;
  past: boolean;
  startHour: number;
  endHour: number;
  span: number;
  gridPx: number;
  slotMinutes: number;
  columnWidth: number;
  key: string;
  dayEvents: TrackedEvent[];
  gesture: DayGestureState;
  onRevealBefore: () => void;
  onRevealAfter: () => void;
  onSelect: () => void;
  onPointerDown: (event: PointerEvent) => void;
  setHover: (hover: HoverSlot | null) => void;
  makeGrab: (entry: TrackedEvent, mode: 'move' | 'start' | 'end') => (event: PointerEvent) => void;
}

/** A day column's entries-layout state — everything that only changes when entries, settings, or the selected/today day change (never on a clock tick or a drag/hover pixel). */
export interface DayEntriesVals {
  key: string;
  display: string;
  label: string;
  dateNum: string;
  hours: string;
  hiddenBefore: number;
  hiddenAfter: number;
  onRevealBefore: () => void;
  onRevealAfter: () => void;
  fg: string;
  dim: string;
  headBg: string;
  headBorder: string;
  bodyBg: string;
  bodyBorder: string;
  onSelect: () => void;
  onPointerDown: (event: PointerEvent) => void;
  onHover: (event: PointerEvent) => void;
  onLeave: () => void;
  events: EventVals[];
}

/** Builds one day column's entries-layout state: header colors, tracked totals, and each entry's positioned box (via lane assignment). */
export function buildDayEntries(params: DayEntriesParams): DayEntriesVals {
  const { date, isMobile, isSel, isToday, past, startHour, endHour, span, gridPx, slotMinutes, columnWidth, key, dayEvents, gesture } = params;

  const windowStartMinute = startHour * 60;
  const windowEndMinute = endHour * 60;
  const totalTrackedMinutes = sumMinutes(dayEvents.filter((entry) => !entry.excluded));
  const hiddenBefore = dayEvents.filter((entry) => entry.start < windowStartMinute).length;
  const hiddenAfter = dayEvents.filter((entry) => entry.end > windowEndMinute).length;

  return {
    key,
    display: isMobile && !isSel ? 'none' : 'block',
    label: date.toLocaleDateString(undefined, { weekday: 'short' }),
    dateNum: String(date.getDate()),
    hours: totalTrackedMinutes ? formatTimeCompact(totalTrackedMinutes) : '',
    hiddenBefore,
    hiddenAfter,
    onRevealBefore: params.onRevealBefore,
    onRevealAfter: params.onRevealAfter,
    fg: isSel ? '#f2f3f5' : past ? '#767b85' : '#8b909a',
    dim: isSel ? '#8b909a' : '#5d626b',
    headBg: isToday ? '#151b1b' : 'transparent',
    headBorder: isSel ? '#39504d' : isToday ? '#25332f' : '#1d1f25',
    bodyBg: isToday ? '#0f1214' : '#0e0f13',
    bodyBorder: isSel ? '#2b3a38' : '#181a1f',
    onSelect: params.onSelect,
    onPointerDown: params.onPointerDown,
    // Reads gesture state live (not a snapshot) since this handler is built far less often than it's invoked.
    onHover: (event: PointerEvent) => {
      if (gesture.guide() || gesture.drag()) return;
      const columnRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const slotIndex = slotIndexAt(columnRect, event.clientY, span, slotMinutes);
      const currentHover = gesture.hover();
      if (!currentHover || currentHover.key !== key || currentHover.slotIndex !== slotIndex) params.setHover({ key, slotIndex });
    },
    onLeave: () => {
      const currentHover = gesture.hover();
      if (currentHover && currentHover.key === key) params.setHover(null);
    },
    events: assignLanes(dayEvents).map((entry): EventVals => {
      const hue = hueForTitle(entry.title);
      const opacity = isSel ? 1 : 0.55;
      const laneIndex = entry._lane || 0;
      const laneCount = entry._lanes || 1;
      // Lanes shrink to fit side by side down to a minimum width, then overlap (staggering left offsets) once they'd get too narrow.
      const innerWidth = Math.max(columnWidth - 4, 30);
      const laneWidth = innerWidth / laneCount;
      const lanesFit = laneCount === 1 || laneWidth >= 40;
      const minLaneWidth = Math.min(innerWidth, 40);
      // Floors the stagger itself so lanes stay visually distinguishable (and clickable) even on a column so
      // narrow that innerWidth <= minLaneWidth, where `innerWidth - minLaneWidth` alone would collapse to 0.
      const overlapStep = laneCount > 1 ? Math.max(10, (innerWidth - minLaneWidth) / (laneCount - 1)) : 0;
      const boxLeftPx = lanesFit ? laneIndex * laneWidth : laneIndex * overlapStep;
      const boxWidthPx = lanesFit ? laneWidth - (laneIndex === laneCount - 1 ? 0 : 3) : Math.max(innerWidth - laneIndex * overlapStep, 14);
      const { top, height, heightPx: boxHeightPx } = entryBoxTopHeight(entry.start, entry.end, startHour, span, gridPx);
      const isTiny = boxHeightPx < 30;
      // Cap the resize-grab bands at a third of the box's own height, so even a tiny entry (down to the 14px
      // floor) keeps a reachable move hit-region between them instead of the handles covering the whole box.
      const handleHeightPx = Math.min(6, boxHeightPx / 3);
      const timeRangeLabel = formatTimeRange(entry.start, entry.end);
      return {
        shadow: entry.viaTimer
          ? '0 0 0 1px #0c0d10, inset 0 0 0 1.5px oklch(0.72 ' + 0.11 * opacity + ' ' + hue + ' / .55)'
          : '0 0 0 1px #0c0d10',
        viaTimer: !!entry.viaTimer,
        id: entry.id,
        title: entry.title,
        timeLabel: boxWidthPx < (isTiny ? 62 : 50) ? '' : isTiny || boxWidthPx < 72 ? formatTimeCompact(entry.start) : timeRangeLabel,
        tip:
          entry.title +
          ' · ' +
          timeRangeLabel +
          (entry.viaTimer ? ' · timed' : '') +
          (entry.note ? ' · ' + entry.note : '') +
          (entry.excluded ? ' · excluded' : ''),
        timeSize: '9.5px',
        dir: isTiny ? 'row' : 'column',
        gap: isTiny ? '5px' : '0px',
        align: isTiny ? 'baseline' : 'stretch',
        pad: isTiny
          ? entry.note && entry.note.trim()
            ? '0 9px 0 4px'
            : '0 4px'
          : entry.note && entry.note.trim()
            ? '2px 11px 2px 4px'
            : '2px 4px',
        borderWidth: '2px',
        titleFlex: isTiny ? '1 1 auto' : '0 0 auto',
        borderStyle: entry.excluded ? 'dashed' : 'solid',
        hasNote: !!(entry.note && entry.note.trim()),
        z: 1 + laneIndex,
        top,
        height,
        handleH: handleHeightPx + 'px',
        left: boxLeftPx + 'px',
        width: boxWidthPx + 'px',
        bg: entry.excluded ? 'oklch(0.26 0.012 260)' : 'oklch(0.33 ' + 0.05 * opacity + ' ' + hue + ')',
        accent: entry.excluded ? '#4a4f59' : 'oklch(0.72 ' + 0.11 * opacity + ' ' + hue + ')',
        fg: isSel ? (entry.excluded ? '#a6acb6' : '#eef0f2') : '#9aa0ab',
        onGrab: params.makeGrab(entry, 'move'),
        onGrabStart: params.makeGrab(entry, 'start'),
        onGrabEnd: params.makeGrab(entry, 'end'),
      };
    }),
  };
}

export interface DayLiveParams {
  key: string;
  isToday: boolean;
  startHour: number;
  endHour: number;
  span: number;
  slotMinutes: number;
  nowMs: number;
  nowMinuteOfDay: number | undefined;
  drag: Drag | null;
  hover: HoverSlot | null;
  guide: Guide | null;
  timers: Timer[];
}

/** A day column's live overlay state — the hover/drag/now guide lines and the running-timer blocks, recomputed on every clock tick or gesture pixel. */
export interface DayLiveVals {
  key: string;
  timers: DayTimerVals[];
  hover: boolean;
  hoverTop: string;
  hoverLabel: string;
  showNow: boolean;
  nowTop: string;
  drag: boolean;
  dragTop: string;
  dragHeight: string;
  dragLabel: string;
}

/** Builds one day column's live overlay: the hover/drag guide line, the "now" line, and the running-timer block. Cheap — no entry filtering or lane assignment. */
export function buildDayLive(params: DayLiveParams): DayLiveVals {
  const { key, isToday, startHour, endHour, span, slotMinutes, nowMs, nowMinuteOfDay, drag, hover: hoverState, guide, timers } = params;

  const dragStartSlot = drag ? Math.min(drag.startSlot, drag.endSlot) : 0;
  const dragEndSlot = drag ? Math.max(drag.startSlot, drag.endSlot) : 0;
  const guideMinute = guide ? guide.minuteOfDay : hoverState ? startHour * 60 + hoverState.slotIndex * slotMinutes : null;

  // Position/size each running-timer block for this day, laid out as even-width side-by-side columns (ordered by
  // start time for a stable left-to-right position as timers start/stop) — concurrent timers are always
  // open-ended and effectively overlapping, so full overlap-clustering (as used for TrackedEvents) is unneeded.
  const orderedTimers = timers.slice().sort((a, b) => a.startedAt - b.startedAt);
  const laneCount = orderedTimers.length;
  const dayTimers: DayTimerVals[] = orderedTimers.map((timer, index) => {
    const timerStartDate = new Date(timer.startedAt);
    const nowDate = new Date(nowMs);
    const rawStartMinute = timerStartDate.getHours() * 60 + timerStartDate.getMinutes() + timerStartDate.getSeconds() / 60;
    // Clamp to both edges of the visible window — a ceiling clamp is needed too, since narrowing `endHour`
    // below a running timer's own start would otherwise leave timerStartMinute > timerEndMinute (negative height).
    const timerStartMinute = Math.min(endHour * 60, Math.max(startHour * 60, rawStartMinute));
    const timerEndMinute = Math.min(endHour * 60, Math.max(timerStartMinute, nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60));
    const laneWidthPct = 100 / laneCount;
    return {
      id: timer.id,
      top: minuteToPercent(timerStartMinute, startHour, span),
      height: minuteToPercent(timerEndMinute - timerStartMinute, 0, span),
      left: index * laneWidthPct + '%',
      width: laneWidthPct + '%',
      title: timer.title,
      label: formatTime(Math.round(timerStartMinute)) + ' – ' + formatElapsed(nowMs - timer.startedAt),
    };
  });

  return {
    key,
    timers: dayTimers,
    hover: guideMinute != null && !drag,
    hoverTop: guideMinute != null ? minuteToPercent(guideMinute, startHour, span) : '0%',
    hoverLabel: guideMinute != null ? formatTime(guideMinute) : '',
    showNow: isToday && nowMinuteOfDay != null && nowMinuteOfDay >= startHour * 60 && nowMinuteOfDay <= endHour * 60,
    nowTop: nowMinuteOfDay != null ? minuteToPercent(nowMinuteOfDay, startHour, span) : '0%',
    drag: !!drag,
    dragTop: drag ? minuteToPercent(dragStartSlot * slotMinutes, 0, span) : '0%',
    dragHeight: drag ? minuteToPercent(Math.max(dragEndSlot - dragStartSlot, 1) * slotMinutes, 0, span) : '0%',
    dragLabel: drag
      ? formatTime(startHour * 60 + dragStartSlot * slotMinutes) + ' – ' + formatTime(startHour * 60 + Math.max(dragEndSlot, dragStartSlot + 1) * slotMinutes)
      : '',
  };
}
