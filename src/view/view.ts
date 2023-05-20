// Copyright (C) 2023 - shoedler - github.com/shoedler
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

import { Editor, ItemView, WorkspaceLeaf } from 'obsidian';
import { CrossbowViewController } from 'src/controllers/viewController';
import { Suggestion } from 'src/model/suggestion';
import { ITreeVisualizable, TreeItem } from './treeItem';
import { viewBuilder } from './viewBuilder';

export class CrossbowView extends ItemView {
  private readonly treeEl: HTMLElement;
  private readonly controlsEl: HTMLElement;

  constructor(leaf: WorkspaceLeaf, private readonly onManualRefreshButtonClick: (evt: MouseEvent) => void) {
    super(leaf);
    this.controlsEl = this.contentEl.createDiv({ cls: 'cb-view-controls' });
    this.treeEl = this.contentEl.createDiv({ cls: 'cb-view-tree' });

    viewBuilder.createManualRefreshButton(this.controlsEl, this.onManualRefreshButtonClick);
    this.treeEl.createSpan({ text: 'Open a note to run crossbow', cls: 'cb-view-empty' });
  }

  public static viewType = 'crossbow-toolbar';

  public getViewType(): string {
    return CrossbowView.viewType;
  }

  public getDisplayText(): string {
    return 'Crossbow';
  }

  public getIcon(): string {
    return 'crossbow';
  }

  public load(): void {
    super.load();
    this.navigation = false;
  }

  public clear(): void {
    this.treeEl.empty();
  }

  public update(suggestions: Suggestion[], targetEditor: Editor, showManualRefreshButton: boolean): void {
    showManualRefreshButton ? this.getManualRefreshButton().show() : this.getManualRefreshButton().hide();

    this.addOrUpdateSuggestions(suggestions, targetEditor);
  }

  public addOrUpdateSuggestions(suggestions: Suggestion[], targetEditor: Editor): void {
    const currentSuggestionTreeItems = this.getCurrentSuggestions();

    suggestions.forEach((suggestion) => {
      // Find if this Suggestion already exists
      const index = currentSuggestionTreeItems.findIndex((item) => item.hash === suggestion.hash);
      const existingSuggestion = index !== -1 ? currentSuggestionTreeItems.splice(index, 1)[0] : undefined;

      const suggestionTreeItem = viewBuilder.createSuggestionTreeItem(suggestion, targetEditor);

      if (existingSuggestion) {
        const expandedOccurrencesHashes = existingSuggestion
          .getTreeItems()
          .filter((item) => !(item as TreeItem<ITreeVisualizable>).isCollapsed())
          .map((item) => item.hash);

        suggestionTreeItem.getTreeItems().forEach((occurrence) => {
          // Toggle expanded state, if it was expanded before
          if (expandedOccurrencesHashes.includes(occurrence.hash)) {
            (occurrence as TreeItem<ITreeVisualizable>).expand();
          }
        });

        // Insert / append the new suggestion, depending on whether it already existed
        this.treeEl.insertAfter(suggestionTreeItem, existingSuggestion);
        existingSuggestion.isCollapsed() ? suggestionTreeItem.collapse() : suggestionTreeItem.expand();
        existingSuggestion.remove();
      } else {
        // Insert the new suggestion at the correct position. They are sorted by localeCompare of their 'hash' property
        const index = currentSuggestionTreeItems.findIndex((item) => suggestion.hash.localeCompare(item.hash) < 0);
        if (index === -1) {
          this.treeEl.appendChild(suggestionTreeItem);
        } else {
          this.treeEl.insertBefore(suggestionTreeItem, currentSuggestionTreeItems[index]);
        }
      }
    });

    // Now, we're left with the existing suggestions that we need to remove
    currentSuggestionTreeItems.forEach((item) => item.remove());
  }

  private getManualRefreshButton(): HTMLElement {
    return this.controlsEl.querySelector('#' + CrossbowViewController.MANUAL_REFRESH_BUTTON_ID) as HTMLElement;
  }

  private getCurrentSuggestions(): TreeItem<Suggestion>[] {
    return this.treeEl.children.length > 0 ? (Array.from(this.treeEl.children) as TreeItem<Suggestion>[]) : [];
  }
}
