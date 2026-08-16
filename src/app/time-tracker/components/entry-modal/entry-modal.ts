import { Component, ElementRef, afterNextRender, input, viewChild } from '@angular/core';
import type { RecentVals } from '../../model/view-model';

@Component({
  selector: 'app-entry-modal',
  imports: [],
  templateUrl: './entry-modal.html',
  styleUrl: './entry-modal.scss',
})
export class EntryModal {
  readonly closeModal = input.required<() => void>();
  readonly stop = input.required<(e: Event) => void>();
  readonly modalTitle = input.required<string>();
  readonly draftDuration = input.required<string>();
  readonly draftTitle = input.required<string>();
  readonly onDraftInput = input.required<(e: Event) => void>();
  readonly onDraftKey = input.required<(e: KeyboardEvent) => void>();
  readonly hasRecents = input.required<boolean>();
  readonly recents = input.required<RecentVals[]>();
  readonly draftNote = input.required<string>();
  readonly onNoteInput = input.required<(e: Event) => void>();
  readonly draftStart = input.required<string>();
  readonly onStartInput = input.required<(e: Event) => void>();
  readonly draftEnd = input.required<string>();
  readonly onEndInput = input.required<(e: Event) => void>();
  readonly draftExcluded = input.required<boolean>();
  readonly onExcludeToggle = input.required<(e: Event) => void>();
  readonly isEditing = input.required<boolean>();
  readonly deleteEntry = input.required<() => void>();
  readonly saveDraft = input.required<() => void>();
  readonly saveLabel = input.required<string>();

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  constructor() {
    afterNextRender(() => this.titleInput()?.nativeElement.focus());
  }
}
