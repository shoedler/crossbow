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
import { CacheMatch } from './main';
import { TreeItem, TreeItemBase } from './view/treeItem';

export class Suggestion extends TreeItem<string> {
  public constructor(word: string, public readonly cacheMatches: CacheMatch[]) {
    super(word);
  }

  public static register(): void {
    customElements.define('crossbow-suggestion', Suggestion);
  }

  public get hash(): string {
    return this.value;
  }
  public get text(): string {
    return this.value;
  }

  public getChildren() {
    return Array.from(this.childrenWrapper.children) as Occurrence[];
  }

  public sortChildren(): void {
    this.getChildren()
      .sort((a, b) => a.value.line - b.value.line)
      .forEach((child) => {
        this.childrenWrapper.appendChild(child);
        child.sortChildren();
      });
  }
}

export class Occurrence extends TreeItem<EditorPosition> {
  public constructor(value: EditorPosition) {
    super(value);
  }

  public static register(): void {
    customElements.define('crossbow-occurrence', Occurrence);
  }

  public get hash(): string {
    return `${this.value.line}:${this.value.ch}`;
  }
  public get text(): string {
    return `On line ${this.value.line}:${this.value.ch}`;
  }

  public getChildren() {
    return Array.from(this.childrenWrapper.children) as Match[];
  }

  public sortChildren(): void {
    this.getChildren()
      .sort((a, b) => a.value.rank.codePointAt(0)! - b.value.rank.codePointAt(0)!)
      .forEach((child) => {
        this.childrenWrapper.appendChild(child);
      });
  }
}

export class Match extends TreeItemBase<CacheMatch> {
  public constructor(value: CacheMatch) {
    super(value);
  }

  public static register(): void {
    customElements.define('crossbow-match', Match);
  }

  public get hash(): string {
    return `${this.value.text}|${this.value.file.path}`;
  }

  public get text(): string {
    return `${this.value.rank} ${this.value.text}`;
  }

  public sortChildren(): void {}
}
