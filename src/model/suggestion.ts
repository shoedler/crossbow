// Copyright (C) 2023 - shoedler - github.com/shoedler
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

import { EditorPosition, MarkdownView } from 'obsidian';
import { CacheMatch } from 'src/services/indexingService';
import { CrossbowLoggingService } from 'src/services/loggingService';
import { ITreeNodeContext, ITreeNodeData, TreeItemButtonIcon, TreeNode } from 'src/view/tree/treeNode';

export class Suggestion implements ITreeNodeData {
  public readonly parent: null = null;
  public readonly children: Occurrence[] = [];
  public readonly word: string;

  public get suffix(): string {
    return this.children.length.toString();
  }

  public get flair(): string {
    const ranks = new Set<CacheMatch['rank']>();
    this.children[0].children.forEach((match) => ranks.add(match.cacheMatch.rank));

    return Array.from(ranks)
      .sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0))
      .join('');
  }

  public get subtitle(): null {
    return null;
  }

  public get actions(): {
    name: string;
    icon: TreeItemButtonIcon;
    callback(this: Suggestion, ev: MouseEvent, ctx: ITreeNodeContext): void;
  }[] {
    return [];
  }

  public get uid(): string {
    return this.word;
  }

  public get text(): string {
    return this.word;
  }

  public constructor(word: string, matchSet: Set<CacheMatch>, matchOccurrences: EditorPosition[]) {
    this.word = word;
    this.children = matchOccurrences.map((p) => {
      const matchOccurrenceEnd = { ch: p.ch + word.length, line: p.line } as EditorPosition;
      const matches = Array.from(matchSet);
      return new Occurrence(this, p, matchOccurrenceEnd, matches);
    });
  }

  public sortChildren(): void {
    this.children.sort((a, b) => a.editorPosition.line - b.editorPosition.line).forEach((occ) => occ.sortChildren());
  }
}

export class Occurrence implements ITreeNodeData {
  public readonly parent: Suggestion;
  public readonly children: Match[] = [];
  public readonly editorPosition: EditorPosition;
  public readonly editorEndPosition: EditorPosition;

  public get suffix(): null {
    return null;
  }

  public get flair(): null {
    return null;
  }

  public get subtitle(): null {
    return null;
  }

  public get actions(): {
    name: string;
    icon: TreeItemButtonIcon;
    callback(this: Occurrence, ev: MouseEvent, ctx: ITreeNodeContext): void;
  }[] {
    return [
      {
        name: 'Scroll into View',
        icon: TreeItemButtonIcon.Scroll,
        callback(ev, ctx) {
          this.scrollIntoView(ctx);
          ev.stopPropagation();
          ev.preventDefault();
        },
      },
    ];
  }

  public get uid(): string {
    return `${this.editorPosition.line}:${this.editorPosition.ch}`;
  }

  public get text(): string {
    return `On line ${this.editorPosition.line + 1}:${this.editorPosition.ch + 1}`;
  }

  public constructor(
    parent: Suggestion,
    editorPosition: EditorPosition,
    editorEndPosition: EditorPosition,
    cacheMatches: CacheMatch[]
  ) {
    this.parent = parent;
    this.editorPosition = editorPosition;
    this.editorEndPosition = editorEndPosition;
    this.children = cacheMatches.map((m) => new Match(this, m));
  }

  public sortChildren(): void {
    this.children.sort((a, b) => (a.cacheMatch.rank.codePointAt(0) ?? 0) - (b.cacheMatch.rank.codePointAt(0) ?? 0));
  }

  public onClick(this: Occurrence, ctx: ITreeNodeContext): void {
    if (ctx.self.isCollapsed()) {
      this.scrollIntoView(ctx);
    }
  }

  public scrollIntoView(ctx: ITreeNodeContext): void {
    ctx.targetEditor.setSelection(this.editorPosition, this.editorEndPosition);
    ctx.targetEditor.scrollIntoView({ from: this.editorPosition, to: this.editorEndPosition }, true);
  }
}

export class Match implements ITreeNodeData {
  public readonly parent: Occurrence;
  public readonly cacheMatch: CacheMatch;

  public constructor(parent: Occurrence, cacheMatch: CacheMatch) {
    this.parent = parent;
    this.cacheMatch = cacheMatch;
  }

  public get suffix(): string | null {
    return this.cacheMatch.type;
  }

  public get flair(): string | null {
    return null;
  }

  public get subtitle(): string | null {
    return this.cacheMatch.type === 'File' ? null : this.cacheMatch.file.name;
  }

  public get actions(): {
    name: string;
    icon: TreeItemButtonIcon;
    callback(this: Match, ev: MouseEvent, ctx: ITreeNodeContext): void;
  }[] {
    return [
      {
        name: 'Use',
        icon: TreeItemButtonIcon.Inspect,
        callback(ev, ctx) {
          (ctx.self.parentElement?.parentElement as TreeNode<ITreeNodeData>).setDisable();
          ctx.targetEditor.replaceRange(this.createLink(), this.parent.editorPosition, this.parent.editorEndPosition);
        },
      },
      {
        name: 'Go To Source',
        icon: TreeItemButtonIcon.Search,
        callback(ev, ctx) {
          const leaf = app.workspace.getLeaf(true);

          leaf.openFile(this.cacheMatch.file, { active: false }).then(() => {
            if (leaf.view instanceof MarkdownView) {
              app.workspace.setActiveLeaf(leaf);

              if (this.cacheMatch.item?.position) {
                const from = {
                  ch: this.cacheMatch.item.position.start.col,
                  line: this.cacheMatch.item.position.start.line + 1,
                };
                const to = {
                  ch: this.cacheMatch.item.position.end.col,
                  line: this.cacheMatch.item.position.end.line + 1,
                };

                leaf.view.editor.scrollIntoView({ from, to }, true);
              }
            } else {
              CrossbowLoggingService.forceLog('warn', 'Could not go to source, not a markdown file');
              leaf.detach();
            }
          });
        },
      },
    ];
  }

  public get uid(): string {
    return `${this.cacheMatch.text}|${this.cacheMatch.file.path}`;
  }

  public get text(): string {
    return `${this.cacheMatch.rank} ${this.cacheMatch.text}`;
  }

  public sortChildren(): void {}

  public createLink(): string {
    const word = this.parent.parent.word;

    return this.cacheMatch.item
      ? app.fileManager.generateMarkdownLink(
          this.cacheMatch.file,
          this.cacheMatch.text,
          '#' + this.cacheMatch.text,
          word
        )
      : app.fileManager.generateMarkdownLink(this.cacheMatch.file, this.cacheMatch.text, undefined, word);
  }
}
