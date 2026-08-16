import { Component, input } from '@angular/core';
import { TimerIcon } from '../../timer-icon/timer-icon';
import type { GroupVals } from '../../../model/view-model';

@Component({
  selector: 'app-entry-group',
  imports: [TimerIcon],
  templateUrl: './entry-group.html',
  styleUrl: './entry-group.scss',
})
export class EntryGroup {
  readonly group = input.required<GroupVals>();
  readonly isCompact = input(false);
}
