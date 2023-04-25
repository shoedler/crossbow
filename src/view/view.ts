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
import { Suggestion } from 'src/suggestion';
import CrossbowPlugin from 'src/main';
import { TreeItem } from './treeItem';
import { CrossbowTreeItemBuilder } from './treeItemBuilder';

export class CrossbowView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.contentEl.createSpan({ text: 'Open a note to run crossbow', cls: 'crossbow-view-empty' });
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
    this.contentEl.empty();
  }

  private getCurrentSuggestions(): TreeItem<Suggestion>[] {
    return this.contentEl.children.length > 0 ? (Array.from(this.contentEl.children) as TreeItem<Suggestion>[]) : [];
  }

  public updateSuggestions(suggestions: Suggestion[], targetEditor: Editor, fileHasChanged: boolean): void {
    CrossbowPlugin.debugLog(`${fileHasChanged ? 'Clearing & adding' : 'Updating'} suggestions`);

    if (fileHasChanged) {
      this.clear();
    }

    const currentSuggestionTreeItems = this.getCurrentSuggestions();

    suggestions.forEach((suggestion) => {
      // Find if this Suggestion already exists
      const index = currentSuggestionTreeItems.findIndex((item) => item.hash === suggestion.hash);
      const existingSuggestion = index !== -1 ? currentSuggestionTreeItems.splice(index, 1)[0] : undefined;

      const suggestionTreeItem = CrossbowTreeItemBuilder.createSuggestionTreeItem(
        suggestion,
        this.app.fileManager,
        targetEditor
      );

      if (existingSuggestion) {
        const expandedOccurrencesHashes = existingSuggestion
          .getTreeItems()
          .filter((item) => !(item as TreeItem<any>).isCollapsed())
          .map((item) => item.hash);

        suggestionTreeItem.getTreeItems().forEach((occurrence) => {
          // Toggle expanded state, if it was expanded before
          if (expandedOccurrencesHashes.includes(occurrence.hash)) {
            (occurrence as TreeItem<any>).expand();
          }
        });

        // Insert / append the new suggestion, depending on whether it already existed
        this.contentEl.insertAfter(suggestionTreeItem, existingSuggestion);
        existingSuggestion.isCollapsed() ? suggestionTreeItem.collapse() : suggestionTreeItem.expand();
        existingSuggestion.remove();
      } else {
        // Insert the new suggestion at the correct position. They are sorted by localeCompare of their 'hash' property
        const index = currentSuggestionTreeItems.findIndex((item) => suggestion.hash.localeCompare(item.hash) < 0);
        if (index === -1) {
          this.contentEl.appendChild(suggestionTreeItem);
        } else {
          this.contentEl.insertBefore(suggestionTreeItem, currentSuggestionTreeItems[index]);
        }
      }
    });

    // Now, we're left with the existing suggestions that we need to remove
    currentSuggestionTreeItems.forEach((item) => item.remove());
  }
}
