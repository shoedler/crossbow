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

import { Editor, EditorPosition } from 'obsidian';
import { CacheMatch } from 'src/main';
import { Match, Occurrence, Suggestion } from 'src/suggestion';
import { TreeItem, TreeItemLeaf } from './treeItem';

export class CrossbowTreeItemBuilder {
  public static createSuggestionTreeItem(
    suggestion: Suggestion,
    markdownLinkGenerator: {
      generateMarkdownLink: (file: CacheMatch['file'], text: string, hash?: string, word?: string) => string;
    },
    targetEditor: Editor
  ): TreeItem<Suggestion> {
    const lazySuggestionChildrenBuilder = () =>
      CrossbowTreeItemBuilder.createOccurrenceTreeItems(suggestion, markdownLinkGenerator, targetEditor);

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

  public static createOccurrenceTreeItems(
    suggestion: Suggestion,
    markdownLinkGenerator: {
      generateMarkdownLink: (file: CacheMatch['file'], text: string, hash?: string, word?: string) => string;
    },
    targetEditor: Editor
  ): TreeItem<Occurrence>[] {
    return suggestion.occurrences.map((occurrence) => {
      const occurrenceEnd = {
        ch: occurrence.editorPosition.ch + suggestion.word.length,
        line: occurrence.editorPosition.line,
      } as EditorPosition;

      const lazyOccurrenceChildrenBuilder = (self: TreeItem<Occurrence>) =>
        CrossbowTreeItemBuilder.createMatchTreeItems(
          suggestion.word,
          self,
          occurrenceEnd,
          markdownLinkGenerator,
          targetEditor
        );

      const occurrenceTreeItem = new TreeItem(occurrence, lazyOccurrenceChildrenBuilder);

      // Configure Occurrences
      // Scroll into view action...
      const scrollIntoView = () => {
        targetEditor.setSelection(occurrence.editorPosition, occurrenceEnd);
        targetEditor.scrollIntoView({ from: occurrence.editorPosition, to: occurrenceEnd }, true);
      };

      // ...Can be invoked via flair button...
      occurrenceTreeItem.addButton('Scroll into View', 'lucide-scroll', (ev: MouseEvent) => {
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
    markdownLinkGenerator: {
      generateMarkdownLink: (file: CacheMatch['file'], text: string, hash?: string, word?: string) => string;
    },
    targetEditor: Editor
  ): TreeItemLeaf<Match>[] {
    return occurrenceTreeItem.value.matches.map((match) => {
      const matchTreeItem = new TreeItemLeaf(match);

      const link = match.cacheMatch.item
        ? markdownLinkGenerator.generateMarkdownLink(
            match.cacheMatch.file,
            match.cacheMatch.text,
            '#' + match.cacheMatch.text,
            word
          )
        : markdownLinkGenerator.generateMarkdownLink(match.cacheMatch.file, match.cacheMatch.text, undefined, word);

      // 'Use' button inserts backlink & disables the occurrence
      matchTreeItem.addButton('Use', 'lucide-inspect', () => {
        occurrenceTreeItem.setDisable();
        targetEditor.replaceRange(link, occurrenceTreeItem.value.editorPosition, occurrenceEnd);
      });

      // Go to source action
      matchTreeItem.addButton('Go To Source', 'lucide-search', () => {
        console.warn("🏹: 'Go To Source' is not yet implemented");
      });

      matchTreeItem.addTextSuffix(match.cacheMatch.type);

      return matchTreeItem;
    });
  }
}
