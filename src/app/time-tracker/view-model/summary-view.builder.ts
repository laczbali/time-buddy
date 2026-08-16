import { formatTimeRange, formatDuration, hueForTitle } from '../model/utils';
import type { TrackedEvent } from '../model/types';
import type { EntryVals, GroupVals } from '../model/view-model';

export interface SummaryGroupsParams {
  list: TrackedEvent[];
  isExcluded: boolean;
  openMap: Record<string, boolean>;
  onToggle: (groupKey: string) => void;
  onOpenEntry: (entry: TrackedEvent) => void;
}

/** Groups a day's entries by title into the sidebar's collapsible rows, sorted by total duration (longest first). */
export function buildGroups(params: SummaryGroupsParams): GroupVals[] {
  const { list, isExcluded, openMap } = params;

  const titleOrder: string[] = [];
  const entriesByTitle: Record<string, TrackedEvent[]> = {};
  list.forEach((entry) => {
    if (!entriesByTitle[entry.title]) {
      entriesByTitle[entry.title] = [];
      titleOrder.push(entry.title);
    }
    entriesByTitle[entry.title].push(entry);
  });

  return titleOrder
    .map((title) => {
      const items = entriesByTitle[title].slice().sort((entryA, entryB) => entryA.start - entryB.start);
      const totalMinutes = items.reduce((total, entry) => total + (entry.end - entry.start), 0);
      // Excluded and non-excluded groups for the same title are tracked separately, so their open/closed state
      // doesn't collide. JSON-encoded as a tuple (rather than string-concatenated) so a title that itself starts
      // with the separator can't produce the same key as a different title/isExcluded pair.
      const groupKey = JSON.stringify([title, isExcluded]);
      const isOpen = !!openMap[groupKey];
      return {
        title,
        sortKey: totalMinutes,
        open: isOpen,
        caret: isOpen ? '▾' : '▸',
        onToggle: () => params.onToggle(groupKey),
        accent: isExcluded ? '#3d424b' : 'oklch(0.72 0.11 ' + hueForTitle(title) + ')',
        fg: isExcluded ? '#8b909a' : '#e7e8ea',
        dur: formatDuration(totalMinutes),
        durColor: isExcluded ? '#6f747f' : '#c9ccd3',
        hasNote: items.some((entry) => entry.note && entry.note.trim()),
        border: 'transparent',
        entries: items.map(
          (entry): EntryVals => ({
            id: entry.id,
            viaTimer: !!entry.viaTimer,
            time: formatTimeRange(entry.start, entry.end),
            note: entry.note || 'No note',
            noteColor: entry.note ? '#c9ccd3' : '#585d67',
            dur: formatDuration(entry.end - entry.start),
            durColor: isExcluded ? '#6f747f' : '#9aa0ab',
            onOpen: () => params.onOpenEntry(entry),
          }),
        ),
      };
    })
    .sort((groupA, groupB) => groupB.sortKey - groupA.sortKey);
}
