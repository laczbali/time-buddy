/** Render state + inline styles for a single positioned entry box within a day column. */
export interface EventVals {
  shadow: string;
  viaTimer: boolean;
  id: string;
  title: string;
  timeLabel: string;
  tip: string;
  timeSize: string;
  dir: string;
  gap: string;
  align: string;
  pad: string;
  borderWidth: string;
  titleFlex: string;
  borderStyle: string;
  hasNote: boolean;
  z: number;
  top: string;
  height: string;
  left: string;
  width: string;
  bg: string;
  accent: string;
  fg: string;
  /** Height of the top/bottom resize-grab bands, capped so they can never together swallow the box's whole move hit-region. */
  handleH: string;
  onGrab: (event: PointerEvent) => void;
  onGrabStart: (event: PointerEvent) => void;
  onGrabEnd: (event: PointerEvent) => void;
}

/** One running timer's positioned block within a day column's live overlay. */
export interface DayTimerVals {
  id: string;
  top: string;
  height: string;
  left: string;
  width: string;
  title: string;
  label: string;
}

/** Render state for one day column: header colors, guide lines, the running-timer blocks, and its entries. */
export interface DayVals {
  timers: DayTimerVals[];
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
  hover: boolean;
  hoverTop: string;
  hoverLabel: string;
  showNow: boolean;
  nowTop: string;
  drag: boolean;
  dragTop: string;
  dragHeight: string;
  dragLabel: string;
  events: EventVals[];
}

/** One entry row within a sidebar summary group. */
export interface EntryVals {
  id: string;
  viaTimer: boolean;
  time: string;
  note: string;
  noteColor: string;
  dur: string;
  durColor: string;
  onOpen: () => void;
}

/** A collapsible sidebar group of same-titled entries for the selected day. */
export interface GroupVals {
  title: string;
  sortKey: number;
  open: boolean;
  caret: string;
  onToggle: () => void;
  accent: string;
  fg: string;
  dur: string;
  durColor: string;
  hasNote: boolean;
  border: string;
  entries: EntryVals[];
}

/** One running timer's pill state, rendered in the top bar. */
export interface TimerPillVals {
  id: string;
  title: string;
  elapsed: string;
  stop: () => void;
  discard: () => void;
}

/** One recently-used title shown as a quick-pick pill (in the entry modal or the timer prompt). */
export interface RecentVals {
  title: string;
  onPick: () => void;
}

/** One hour-mark label in the grid's left gutter. */
export interface HourVals {
  label: string;
}

/** Everything every time-tracker template renders from — assembled once per change by `buildViewModel`. */
export interface ViewModel {
  weekLabel: string;
  weekRange: string;
  prevWeek: () => void;
  nextWeek: () => void;
  reportColumnWidth: (width: number) => void;
  totalHours: string;
  summaryTitle: string;
  goToday: () => void;
  timers: TimerPillVals[];
  timerPromptOpen: boolean;
  timerDraft: string;
  timerStartLabel: string;
  openTimer: () => void;
  closeTimerPrompt: () => void;
  onTimerInput: (event: Event) => void;
  onTimerKey: (event: KeyboardEvent) => void;
  beginTimer: () => void;
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
  days: DayVals[];
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
