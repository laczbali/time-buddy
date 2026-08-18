import { Component, input } from '@angular/core';
import type { TimerPillVals } from '../../model/view-model';

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
  readonly timers = input.required<TimerPillVals[]>();
  readonly openTimer = input.required<() => void>();
  readonly prevWeek = input.required<() => void>();
  readonly nextWeek = input.required<() => void>();
  readonly goToday = input.required<() => void>();
  readonly openSettings = input.required<() => void>();
}
