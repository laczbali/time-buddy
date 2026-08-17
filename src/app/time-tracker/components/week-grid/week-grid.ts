import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, viewChild } from '@angular/core';
import { DayColumn } from './day-column/day-column';
import type { DayVals, HourVals } from '../../model/view-model';
import { addManagedListener } from '../../model/utils';

@Component({
  selector: 'app-week-grid',
  imports: [DayColumn],
  templateUrl: './week-grid.html',
  styleUrl: './week-grid.scss',
})
export class WeekGrid {
  readonly hiddenWeekendCount = input.required<number>();
  readonly revealWeekends = input.required<() => void>();
  readonly gutterW = input.required<string>();
  readonly days = input.required<DayVals[]>();
  readonly hours = input.required<HourVals[]>();
  readonly gridH = input.required<string>();
  readonly pph = input.required<string>();
  readonly gridLines = input.required<string>();
  readonly colMin = input.required<string>();
  readonly hasHiddenBefore = input.required<boolean>();
  readonly hasHiddenAfter = input.required<boolean>();
  readonly reportColumnWidth = input.required<(width: number) => void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollArea = viewChild<ElementRef<HTMLDivElement>>('scrollArea');
  private readonly gridArea = viewChild<ElementRef<HTMLDivElement>>('gridArea');

  private resizeObserver?: ResizeObserver;

  constructor() {
    // Measures the last rendered day column so the view model can size overlapping entries to fit it.
    afterNextRender(() => {
      const measureColumnWidth = () => {
        const grid = this.gridArea()?.nativeElement;
        // app-day-column's host is `display: contents` (no box of its own), so measure its
        // rendered `.column` child rather than the host element, which always reports 0 width.
        const lastColumn = grid?.lastElementChild?.querySelector('.column') as HTMLElement | null;
        this.reportColumnWidth()(lastColumn?.clientWidth || 120);
      };
      addManagedListener(this.destroyRef, window, 'resize', measureColumnWidth);
      setTimeout(measureColumnWidth, 60);
      const scrollElement = this.scrollArea()?.nativeElement;
      if (window.ResizeObserver && scrollElement) {
        this.resizeObserver = new ResizeObserver(measureColumnWidth);
        this.resizeObserver.observe(scrollElement);
      }
      this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
    });
  }
}
