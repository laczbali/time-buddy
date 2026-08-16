import { Component, input } from '@angular/core';

@Component({
  selector: 'app-settings-modal',
  imports: [],
  templateUrl: './settings-modal.html',
  styleUrl: './settings-modal.scss',
})
export class SettingsModal {
  readonly closeSettings = input.required<() => void>();
  readonly stop = input.required<(e: Event) => void>();
  readonly settingStart = input.required<number>();
  readonly setStartHour = input.required<(e: Event) => void>();
  readonly settingEnd = input.required<number>();
  readonly setEndHour = input.required<(e: Event) => void>();
  readonly settingWeekends = input.required<boolean>();
  readonly setWeekends = input.required<(e: Event) => void>();
}
