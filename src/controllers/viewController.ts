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

import { ButtonComponent, Editor, EditorPosition, MarkdownView } from 'obsidian';
import { Match, Occurrence, Suggestion } from 'src/model/suggestion';
import { CacheMatch } from 'src/services/indexingService';
import { CrossbowLoggingService } from 'src/services/loggingService';
import { CrossbowSettingsService } from 'src/services/settingsService';
import { TreeItem, TreeItemButtonIcon, TreeItemLeaf } from 'src/view/treeItem';
import { CrossbowView } from 'src/view/view';

export class CrossbowViewController {
  public static MANUAL_REFRESH_BUTTON_ID = "cb-refresh-button";

  constructor(private readonly settingsService: CrossbowSettingsService) {}

  public async revealOrCreateView(): Promise<void> {
    const existing = app.workspace.getLeavesOfType(CrossbowView.viewType);

    if (existing.length) {
      app.workspace.revealLeaf(existing[0]);
      return;
    }

    await app.workspace.getRightLeaf(false).setViewState({
      type: CrossbowView.viewType,
      active: true,
    });

    app.workspace.revealLeaf(app.workspace.getLeavesOfType(CrossbowView.viewType)[0]);
  }

  public doesCrossbowViewExist(): boolean {
    return app.workspace.getLeavesOfType(CrossbowView.viewType).length > 0;
  }

  public unloadView(): void {
    this.getCrossbowView()?.unload();
  }

  private getCrossbowView(): CrossbowView | undefined {
    return app.workspace.getLeavesOfType(CrossbowView.viewType)[0]?.view as CrossbowView;
  }

  public addOrUpdateSuggestions(suggestions: Suggestion[], targetEditor: Editor, fileHasChanged: boolean): void {
    const view = this.getCrossbowView();

    if (!view) return;
    if (fileHasChanged) view.clear();

    const showManualRefreshButton = !this.settingsService.getSettings().useAutoRefresh;
    view.update(suggestions, targetEditor, showManualRefreshButton);
  }

  public static createManualRefreshButton(parentEl: HTMLElement, onClick: (ev: MouseEvent) => any): ButtonComponent {
    const button = new ButtonComponent(parentEl);

    button.buttonEl.id = CrossbowViewController.MANUAL_REFRESH_BUTTON_ID;
    button.setTooltip("Refresh suggestions");
    button.setIcon("lucide-rotate-cw");
    button.setClass("cb-tree-item-button")
    button.onClick(onClick);

    return button;
  }

  public static createSuggestionTreeItem(suggestion: Suggestion, targetEditor: Editor): TreeItem<Suggestion> {
    const lazySuggestionChildrenBuilder = () =>
      CrossbowViewController.createOccurrenceTreeItems(suggestion, targetEditor);

    const suggestionTreeItem = new TreeItem(suggestion, lazySuggestionChildrenBuilder);

    // Add flair
    const ranks = new Set<CacheMatch['rank']>();
    suggestion.matches.forEach((match) => ranks.add(match.cacheMatch.rank));

    const availableMatchRanks = Array.from(ranks)
      .sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
      .join('');

    suggestionTreeItem.addFlair(availableMatchRanks);
    suggestionTreeItem.addTextSuffix(`(${suggestion.occurrences.length.toString()})`);

    return suggestionTreeItem;
  }

  public static createOccurrenceTreeItems(suggestion: Suggestion, targetEditor: Editor): TreeItem<Occurrence>[] {
    return suggestion.occurrences.map((occurrence) => {
      const occurrenceEnd = {
        ch: occurrence.editorPosition.ch + suggestion.word.length,
        line: occurrence.editorPosition.line,
      } as EditorPosition;

      const lazyOccurrenceChildrenBuilder = (self: TreeItem<Occurrence>) =>
        CrossbowViewController.createMatchTreeItems(suggestion.word, self, occurrenceEnd, targetEditor);

      const occurrenceTreeItem = new TreeItem(occurrence, lazyOccurrenceChildrenBuilder);

      // Configure Occurrences
      // Scroll into view action...
      const scrollIntoView = () => {
        targetEditor.setSelection(occurrence.editorPosition, occurrenceEnd);
        targetEditor.scrollIntoView({ from: occurrence.editorPosition, to: occurrenceEnd }, true);
      };

      // ...Can be invoked via flair button...
      occurrenceTreeItem.addButton('Scroll into View', TreeItemButtonIcon.Scroll, (ev: MouseEvent) => {
        scrollIntoView();
        ev.preventDefault();
        ev.stopPropagation();
      });

      // ...As well as when expanding the suggestions, if it's collapsed. Greatly improves UX
      occurrenceTreeItem.addOnClick(() => {
        if (!occurrenceTreeItem.isCollapsed()) scrollIntoView();
      });

      return occurrenceTreeItem;
    });
  }

  public static createMatchTreeItems(
    word: Suggestion['word'],
    occurrenceTreeItem: TreeItem<Occurrence>,
    occurrenceEnd: EditorPosition,
    targetEditor: Editor
  ): TreeItemLeaf<Match>[] {
    return occurrenceTreeItem.value.matches.map((match) => {
      const matchTreeItem = new TreeItemLeaf(match);

      const link = match.cacheMatch.item
        ? app.fileManager.generateMarkdownLink(
            match.cacheMatch.file,
            match.cacheMatch.text,
            '#' + match.cacheMatch.text,
            word
          )
        : app.fileManager.generateMarkdownLink(match.cacheMatch.file, match.cacheMatch.text, undefined, word);

      // 'Use' button inserts backlink & disables the occurrence
      matchTreeItem.addButton('Use', TreeItemButtonIcon.Inspect, () => {
        occurrenceTreeItem.setDisable();
        targetEditor.replaceRange(link, occurrenceTreeItem.value.editorPosition, occurrenceEnd);
      });

      // Go to source action
      matchTreeItem.addButton('Go To Source', TreeItemButtonIcon.Search, () => {
        const leaf = app.workspace.getLeaf(true);
        app.workspace.setActiveLeaf(leaf);
        leaf.openFile(match.cacheMatch.file).then(() => {
          if (leaf.view instanceof MarkdownView) {
            if (match.cacheMatch.item?.position) {
              const { line, col } = match.cacheMatch.item.position.start
              leaf.view.editor.setCursor(line, col);
            }
          }
          else {
            CrossbowLoggingService.forceLog('warn', 'Could not go to source, not a markdown file');
          }
        });
      });

      matchTreeItem.addTextSuffix(match.cacheMatch.type);

      return matchTreeItem;
    });
  }
}
