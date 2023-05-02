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

import { EditorPosition } from 'obsidian';
import { ITreeVisualizable } from '../view/treeItem';
import { CacheMatch } from 'src/services/indexingService';

export class Suggestion implements ITreeVisualizable {
  public constructor(public readonly word: string, public readonly occurrences: Occurrence[]) {}

  public get hash(): string {
    return this.word;
  }
  public get text(): string {
    return this.word;
  }

  public get matches(): Match[] {
    return this.occurrences[0].matches;
  }

  public sortChildren(): void {
    this.occurrences.sort((a, b) => a.editorPosition.line - b.editorPosition.line).forEach((occ) => occ.sortChildren());
  }
}

export class Occurrence implements ITreeVisualizable {
  public constructor(public readonly editorPosition: EditorPosition, public readonly matches: Match[]) {}

  public get hash(): string {
    return `${this.editorPosition.line}:${this.editorPosition.ch}`;
  }
  public get text(): string {
    return `On line ${this.editorPosition.line}:${this.editorPosition.ch}`;
  }

  public sortChildren(): void {
    this.matches.sort((a, b) => a.cacheMatch.rank.codePointAt(0)! - b.cacheMatch.rank.codePointAt(0)!);
  }
}

export class Match implements ITreeVisualizable {
  public constructor(public readonly cacheMatch: CacheMatch) {}

  public get hash(): string {
    return `${this.cacheMatch.text}|${this.cacheMatch.file.path}`;
  }

  public get text(): string {
    return `${this.cacheMatch.rank} ${this.cacheMatch.text}`;
  }

  public sortChildren(): void {}
}
