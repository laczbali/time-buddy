import { Component, input } from '@angular/core';
import { EntryGroup } from './entry-group/entry-group';
import type { GroupVals } from '../../model/view-model';

@Component({
  selector: 'app-sidebar',
  imports: [EntryGroup],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly asideW = input.required<string>();
  readonly summaryTitle = input.required<string>();
  readonly totalHours = input.required<string>();
  readonly summary = input.required<GroupVals[]>();
  readonly summaryEmpty = input.required<boolean>();
  readonly hasExcluded = input.required<boolean>();
  readonly excludedTotal = input.required<string>();
  readonly excludedGroups = input.required<GroupVals[]>();
}
