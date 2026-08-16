import { Component, input } from '@angular/core';
import { TimerIcon } from '../../../timer-icon/timer-icon';
import type { EventVals } from '../../../../model/view-model';

@Component({
  selector: 'app-event-block',
  imports: [TimerIcon],
  templateUrl: './event-block.html',
  styleUrl: './event-block.scss',
})
export class EventBlock {
  readonly ev = input.required<EventVals>();
}
