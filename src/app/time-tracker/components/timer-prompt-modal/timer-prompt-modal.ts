import { Component, ElementRef, afterNextRender, input, viewChild } from '@angular/core';
import type { RecentVals } from '../../model/view-model';

@Component({
  selector: 'app-timer-prompt-modal',
  imports: [],
  templateUrl: './timer-prompt-modal.html',
  styleUrl: './timer-prompt-modal.scss',
})
export class TimerPromptModal {
  readonly closeTimerPrompt = input.required<() => void>();
  readonly stop = input.required<(e: Event) => void>();
  readonly timerStartLabel = input.required<string>();
  readonly timerDraft = input.required<string>();
  readonly onTimerInput = input.required<(e: Event) => void>();
  readonly onTimerKey = input.required<(e: KeyboardEvent) => void>();
  readonly hasRecents = input.required<boolean>();
  readonly timerRecents = input.required<RecentVals[]>();
  readonly beginTimer = input.required<() => void>();

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  constructor() {
    afterNextRender(() => this.titleInput()?.nativeElement.focus());
  }
}
