import { Component, inject } from '@angular/core';
import { EntryModal } from './components/entry-modal/entry-modal';
import { SettingsModal } from './components/settings-modal/settings-modal';
import { Sidebar } from './components/sidebar/sidebar';
import { TimerPromptModal } from './components/timer-prompt-modal/timer-prompt-modal';
import { TopBar } from './components/top-bar/top-bar';
import { WeekGrid } from './components/week-grid/week-grid';
import { TimeTrackerEntries } from './services/time-tracker-entries';
import { TimeTrackerSettings } from './services/time-tracker-settings';
import { TimeTrackerStorage } from './services/time-tracker-storage';
import { TimeTrackerTimer } from './services/time-tracker-timer';
import { TimeTrackerStore } from './time-tracker-store';

@Component({
  selector: 'app-time-tracker',
  imports: [TopBar, SettingsModal, TimerPromptModal, EntryModal, WeekGrid, Sidebar],
  providers: [TimeTrackerStorage, TimeTrackerSettings, TimeTrackerTimer, TimeTrackerEntries, TimeTrackerStore],
  templateUrl: './time-tracker.html',
  styleUrl: './time-tracker.scss',
})
export class TimeTracker {
  protected readonly store = inject(TimeTrackerStore);
}
