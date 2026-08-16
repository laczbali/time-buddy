import { Component, input } from '@angular/core';

@Component({
  selector: 'app-top-bar',
  imports: [],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
})
export class TopBar {
  readonly headOffset = input.required<string>();
  readonly weekLabel = input.required<string>();
  readonly weekRange = input.required<string>();
  readonly timerRunning = input.required<boolean>();
  readonly timerTitle = input.required<string>();
  readonly timerElapsed = input.required<string>();
  readonly stopTimer = input.required<() => void>();
  readonly discardTimer = input.required<() => void>();
  readonly timerIdle = input.required<boolean>();
  readonly openTimer = input.required<() => void>();
  readonly prevWeek = input.required<() => void>();
  readonly nextWeek = input.required<() => void>();
  readonly goToday = input.required<() => void>();
  readonly openSettings = input.required<() => void>();
}
