import type { WritableSignal } from '@angular/core';
import { END_HOUR_DEFAULT, PPH, SLOT_MINUTES, START_HOUR_DEFAULT } from '../model/constants';
import type { Drag, Guide, HoverSlot, TrackedEvent } from '../model/types';
import { formatDuration, formatElapsed, formatTime, parseTimeToMinutes, parseIsoDate, sumMinutes, toIsoDate } from '../model/utils';
import type { GroupVals, HourVals, RecentVals, ViewModel } from '../model/view-model';
import type { TimeTrackerEntries } from '../services/time-tracker-entries';
import type { TimeTrackerSettings } from '../services/time-tracker-settings';
import type { TimeTrackerTimer } from '../services/time-tracker-timer';
import { buildDayEntries, buildDayLive } from './day-view.builder';
import type { DayEntriesVals, DayGestureState, DayLiveVals } from './day-view.builder';
import { buildGroups } from './summary-view.builder';

/** The subset of TimeTrackerStore that view-model building needs — satisfied structurally, no import cycle. */
export interface NavContext {
  isMobile: WritableSignal<boolean>;
  colW: WritableSignal<number>;
  selected: WritableSignal<string>;
  today: WritableSignal<string>;
  drag: WritableSignal<Drag | null>;
  hover: WritableSignal<HoverSlot | null>;
  guide: WritableSignal<Guide | null>;
  weekDays(): Date[];
  shiftWeek(weekOffset: number): void;
  reportColumnWidth(width: number): void;
  makeDown(dayKey: string): (event: PointerEvent) => void;
  makeGrab(entry: TrackedEvent, mode: 'move' | 'start' | 'end'): (event: PointerEvent) => void;
  openEntry(entry: TrackedEvent): void;
  beginTimer(title: string): void;
  finishTimer(): void;
  discardTimer(): void;
}

/**
 * The subset of the flat ViewModel that only changes when entries, settings, or the selected/today day change —
 * never on a clock tick or a drag/hover pixel. Kept in its own `computed()` so those frequent, cheap changes
 * don't force a full re-filter/re-lane-assign/re-color of every visible day's entries.
 */
export interface EntriesViewModel {
  weekLabel: string;
  weekRange: string;
  prevWeek: () => void;
  nextWeek: () => void;
  reportColumnWidth: (width: number) => void;
  totalHours: string;
  summaryTitle: string;
  goToday: () => void;
  timerRecents: RecentVals[];
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setStartHour: (event: Event) => void;
  setEndHour: (event: Event) => void;
  setWeekends: (event: Event) => void;
  settingStart: number;
  settingEnd: number;
  settingWeekends: boolean;
  days: DayEntriesVals[];
  hasHiddenBefore: boolean;
  hasHiddenAfter: boolean;
  hiddenWeekendCount: number;
  revealWeekends: () => void;
  hours: HourVals[];
  gutterW: string;
  headOffset: string;
  colMin: string;
  asideW: string;
  bodyDir: string;
  gridH: string;
  pph: string;
  gridLines: string;
  summary: GroupVals[];
  excludedGroups: GroupVals[];
  summaryEmpty: boolean;
  hasExcluded: boolean;
  excludedTotal: string;
  modalOpen: boolean;
  isEditing: boolean;
  modalTitle: string;
  saveLabel: string;
  draftDuration: string;
  draftTitle: string;
  draftNote: string;
  draftStart: string;
  draftEnd: string;
  draftExcluded: boolean;
  onStartInput: (event: Event) => void;
  onEndInput: (event: Event) => void;
  onNoteInput: (event: Event) => void;
  onExcludeToggle: (event: Event) => void;
  onDraftInput: (event: Event) => void;
  onDraftKey: (event: KeyboardEvent) => void;
  saveDraft: () => void;
  deleteEntry: () => void;
  closeModal: () => void;
  stop: (event: Event) => void;
  hasRecents: boolean;
  recents: RecentVals[];
}

/** The subset of the flat ViewModel that changes on every clock tick or drag/hover/guide pixel — kept cheap on purpose. */
export interface LiveViewModel {
  timerRunning: boolean;
  timerIdle: boolean;
  timerTitle: string;
  timerElapsed: string;
  stopTimer: () => void;
  discardTimer: () => void;
  timerPromptOpen: boolean;
  timerDraft: string;
  timerStartLabel: string;
  openTimer: () => void;
  closeTimerPrompt: () => void;
  onTimerInput: (event: Event) => void;
  onTimerKey: (event: KeyboardEvent) => void;
  beginTimer: () => void;
  days: DayLiveVals[];
}

/** Assembles the entries-layout half of the view model — everything that only changes when entries/settings/selection change. */
export function buildEntriesViewModel(nav: NavContext, settings: TimeTrackerSettings, entries: TimeTrackerEntries): EntriesViewModel {
  const isMobile = nav.isMobile();
  const days = nav.weekDays();
  const selectedKey = nav.selected();
  const todayKey = nav.today();
  const selectedDate = parseIsoDate(selectedKey);
  const allEvents = entries.events();
  const startHour = settings.startHour();
  const endHour = settings.endHour();
  const span = settings.span();
  const gridPx = settings.gridPx();
  const columnWidth = nav.colW();
  const openMap = entries.open();

  const existingTitles = new Set(allEvents.map((entry) => entry.title));
  const liveRecents = entries.recents().filter((title) => existingTitles.has(title));

  // Group entries by day once, rather than re-scanning the full list per day.
  const eventsByDay = new Map<string, TrackedEvent[]>();
  for (const entry of allEvents) {
    const dayEntries = eventsByDay.get(entry.day);
    if (dayEntries) dayEntries.push(entry);
    else eventsByDay.set(entry.day, [entry]);
  }

  // Count entries hidden on the weekend when weekends aren't shown, so the UI can offer to reveal them.
  let hiddenWeekendCount = 0;
  if (!settings.weekends()) {
    const saturday = new Date(days[0]);
    saturday.setDate(days[0].getDate() + 5);
    const sunday = new Date(days[0]);
    sunday.setDate(days[0].getDate() + 6);
    const saturdayKey = toIsoDate(saturday);
    const sundayKey = toIsoDate(sunday);
    hiddenWeekendCount = (eventsByDay.get(saturdayKey)?.length || 0) + (eventsByDay.get(sundayKey)?.length || 0);
  }

  // Passed to each day's entries builder so its hover handler reads gesture state live, never a stale snapshot.
  const gesture: DayGestureState = { drag: () => nav.drag(), guide: () => nav.guide(), hover: () => nav.hover() };

  const dayVals = days.map((day) => {
    const key = toIsoDate(day);
    return buildDayEntries({
      date: day,
      isMobile,
      isSel: key === selectedKey,
      isToday: key === todayKey,
      past: key < todayKey,
      startHour,
      endHour,
      span,
      gridPx,
      slotMinutes: SLOT_MINUTES,
      columnWidth,
      key,
      dayEvents: eventsByDay.get(key) || [],
      gesture,
      onRevealBefore: () => entries.revealBefore(key),
      onRevealAfter: () => entries.revealAfter(key),
      onSelect: () => nav.selected.set(key),
      onPointerDown: nav.makeDown(key),
      setHover: (hover) => nav.hover.set(hover),
      makeGrab: (entry, mode) => nav.makeGrab(entry, mode),
    });
  });

  const selectedDayEvents = eventsByDay.get(selectedKey) || [];
  const groupsCommon = {
    openMap,
    onToggle: (groupKey: string) => entries.toggleGroup(groupKey),
    onOpenEntry: (entry: TrackedEvent) => nav.openEntry(entry),
  };
  const summary = buildGroups({ ...groupsCommon, list: selectedDayEvents.filter((entry) => !entry.excluded), isExcluded: false });
  const excludedGroups = buildGroups({ ...groupsCommon, list: selectedDayEvents.filter((entry) => entry.excluded), isExcluded: true });

  const totalMinutes = sumMinutes(selectedDayEvents.filter((entry) => !entry.excluded));
  const excludedMinutes = sumMinutes(selectedDayEvents.filter((entry) => entry.excluded));
  const hours: HourVals[] = Array.from({ length: endHour - startHour }, (_, hourOffset) => ({
    label: hourOffset === 0 ? '' : String(startHour + hourOffset).padStart(2, '0'),
  }));
  const draftStartMinute = parseTimeToMinutes(entries.draftStart());
  const draftEndMinute = parseTimeToMinutes(entries.draftEnd());
  const modalState = entries.modal();

  const weekStart = days[0];
  const weekEnd = days[days.length - 1];
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear();

  return {
    weekLabel: sameMonth
      ? weekStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : weekStart.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) +
        ' – ' +
        weekEnd.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
    weekRange: sameMonth
      ? weekStart.getDate() + '–' + weekEnd.getDate()
      : weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
        ' – ' +
        weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    prevWeek: () => nav.shiftWeek(-1),
    nextWeek: () => nav.shiftWeek(1),
    reportColumnWidth: (width: number) => nav.reportColumnWidth(width),
    totalHours: formatDuration(totalMinutes),
    summaryTitle:
      selectedKey === todayKey ? 'Today' : selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }),
    goToday: () => nav.selected.set(todayKey),
    timerRecents: liveRecents.map((recentTitle) => ({ title: recentTitle, onPick: () => nav.beginTimer(recentTitle) })),
    settingsOpen: settings.panelOpen(),
    openSettings: () => settings.openPanel(),
    closeSettings: () => settings.closePanel(),
    setStartHour: (event: Event) => {
      const raw = (event.target as HTMLInputElement).value;
      if (raw === '') {
        // Resetting to "use the default" must still respect the other, still-explicit setting — otherwise
        // clearing one field can leave startHour >= endHour once the default kicks in.
        const clamped = Math.min(START_HOUR_DEFAULT, settings.endHour() - 1);
        settings.setSetting('startHour', clamped === START_HOUR_DEFAULT ? null : clamped);
        return;
      }
      const hour = Math.max(0, Math.min(23, Number(raw)));
      settings.setSetting('startHour', Number.isNaN(hour) ? null : Math.min(hour, settings.endHour() - 1));
    },
    setEndHour: (event: Event) => {
      const raw = (event.target as HTMLInputElement).value;
      if (raw === '') {
        const clamped = Math.max(END_HOUR_DEFAULT, settings.startHour() + 1);
        settings.setSetting('endHour', clamped === END_HOUR_DEFAULT ? null : clamped);
        return;
      }
      const hour = Math.max(1, Math.min(24, Number(raw)));
      settings.setSetting('endHour', Number.isNaN(hour) ? null : Math.max(hour, settings.startHour() + 1));
    },
    setWeekends: (event: Event) => settings.setSetting('weekends', (event.target as HTMLInputElement).checked),
    settingStart: startHour,
    settingEnd: endHour,
    settingWeekends: settings.weekends(),
    days: dayVals,
    hasHiddenBefore: dayVals.some((day) => day.hiddenBefore > 0),
    hasHiddenAfter: dayVals.some((day) => day.hiddenAfter > 0),
    hiddenWeekendCount,
    revealWeekends: () => settings.setSetting('weekends', true),
    hours,
    gutterW: isMobile ? '34px' : '44px',
    headOffset: isMobile ? '40px' : '50px',
    colMin: '0',
    asideW: isMobile ? '100%' : '300px',
    bodyDir: isMobile ? 'column' : 'row',
    gridH: (endHour - startHour) * PPH + 'px',
    pph: PPH + 'px',
    gridLines: 'repeating-linear-gradient(to bottom, rgba(255,255,255,.055) 0 1px, transparent 1px ' + PPH + 'px)',
    summary,
    excludedGroups,
    summaryEmpty: summary.length === 0 && excludedGroups.length === 0,
    hasExcluded: excludedGroups.length > 0,
    excludedTotal: formatDuration(excludedMinutes),
    modalOpen: !!modalState,
    isEditing: !!(modalState && modalState.id),
    modalTitle: modalState && modalState.id ? 'Edit entry' : 'What did you work on?',
    saveLabel: modalState && modalState.id ? 'Save' : 'Add',
    draftDuration: draftStartMinute != null && draftEndMinute != null && draftEndMinute > draftStartMinute ? formatDuration(draftEndMinute - draftStartMinute) : '',
    draftTitle: entries.draft(),
    draftNote: entries.draftNote(),
    draftStart: entries.draftStart(),
    draftEnd: entries.draftEnd(),
    draftExcluded: entries.draftExcluded(),
    onStartInput: (event: Event) => entries.draftStart.set((event.target as HTMLInputElement).value),
    onEndInput: (event: Event) => entries.draftEnd.set((event.target as HTMLInputElement).value),
    onNoteInput: (event: Event) => entries.draftNote.set((event.target as HTMLTextAreaElement).value),
    onExcludeToggle: (event: Event) => entries.draftExcluded.set((event.target as HTMLInputElement).checked),
    onDraftInput: (event: Event) => entries.draft.set((event.target as HTMLInputElement).value),
    onDraftKey: (event: KeyboardEvent) => {
      if (event.key === 'Enter') entries.commit();
      // Escape only dismisses the modal — unlike closeModal(), it deliberately leaves draft fields intact.
      if (event.key === 'Escape') entries.modal.set(null);
    },
    saveDraft: () => entries.commit(),
    deleteEntry: () => entries.deleteCurrent(),
    closeModal: () => entries.closeModal(),
    stop: (event: Event) => event.stopPropagation(),
    hasRecents: liveRecents.length > 0,
    recents: liveRecents.map((recentTitle) => ({ title: recentTitle, onPick: () => entries.draft.set(recentTitle) })),
  };
}

/** Assembles the live-overlay half of the view model — the clock, running timer, and drag/hover/guide state. Deliberately cheap: no entry filtering or lane assignment. */
export function buildLiveViewModel(nav: NavContext, settings: TimeTrackerSettings, timer: TimeTrackerTimer): LiveViewModel {
  const days = nav.weekDays();
  const todayKey = nav.today();
  const startHour = settings.startHour();
  const endHour = settings.endHour();
  const span = settings.span();
  const dragState = nav.drag();
  const hoverState = nav.hover();
  const guideState = nav.guide();
  const timerState = timer.timer();
  const nowMs = timer.nowMs();
  const nowMinuteOfDay = timer.now();

  const dayVals = days.map((day) => {
    const key = toIsoDate(day);
    return buildDayLive({
      key,
      isToday: key === todayKey,
      startHour,
      endHour,
      span,
      slotMinutes: SLOT_MINUTES,
      nowMs,
      nowMinuteOfDay,
      drag: dragState && dragState.key === key ? dragState : null,
      guide: guideState && guideState.key === key ? guideState : null,
      hover: !guideState && hoverState && hoverState.key === key ? hoverState : null,
      timer: timerState && timerState.day === key ? timerState : null,
    });
  });

  return {
    timerRunning: !!timerState,
    timerIdle: !timerState,
    timerTitle: timerState ? timerState.title : '',
    timerElapsed: timerState ? formatElapsed(nowMs - timerState.startedAt) : '',
    stopTimer: () => nav.finishTimer(),
    discardTimer: () => nav.discardTimer(),
    timerPromptOpen: timer.promptOpen(),
    timerDraft: timer.draftTitle(),
    timerStartLabel: nowMinuteOfDay != null ? 'from ' + formatTime(nowMinuteOfDay) : '',
    openTimer: () => timer.openPrompt(),
    closeTimerPrompt: () => timer.closePrompt(),
    onTimerInput: (event: Event) => timer.setDraftTitle((event.target as HTMLInputElement).value),
    onTimerKey: (event: KeyboardEvent) => {
      if (event.key === 'Enter') nav.beginTimer(timer.draftTitle());
      if (event.key === 'Escape') timer.closePrompt();
    },
    beginTimer: () => nav.beginTimer(timer.draftTitle()),
    days: dayVals,
  };
}

/** Cheaply merges the two view-model halves — no filtering/sorting/formatting, just object/array spreads. */
export function mergeViewModel(entriesVm: EntriesViewModel, liveVm: LiveViewModel): ViewModel {
  const liveByKey = new Map(liveVm.days.map((day) => [day.key, day]));
  const days = entriesVm.days.map((day) => ({ ...day, ...liveByKey.get(day.key)! }));
  return { ...entriesVm, ...liveVm, days };
}
