import { Component, input } from '@angular/core';
import { EventBlock } from './event-block/event-block';
import type { DayVals } from '../../../model/view-model';

@Component({
  selector: 'app-day-column',
  imports: [EventBlock],
  templateUrl: './day-column.html',
  styleUrl: './day-column.scss',
})
export class DayColumn {
  readonly day = input.required<DayVals>();
  readonly colMin = input.required<string>();
  readonly gridLines = input.required<string>();
}
