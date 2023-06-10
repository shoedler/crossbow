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

import { Editor } from 'obsidian';
import { ITreeNodeData, TreeNode } from './treeNode';
import { TreeUpdater } from './treeUpdater';

export const registerTreeElements = (): void => {
  TreeNode.register();
  Tree.register();
};

export type ITreeContextProvider = {
  readonly targetEditor: Editor;
};

export class Tree extends HTMLElement implements ITreeContextProvider {
  public readonly targetEditor: Editor;
  private readonly treeUpdater: TreeUpdater;

  public constructor(targetEditor: Editor) {
    super();
    this.targetEditor = targetEditor;
    this.treeUpdater = new TreeUpdater();
  }

  public static register(): void {
    if (!customElements.get('crossbow-tree')) {
      customElements.define('crossbow-tree', Tree);
    }
  }

  public update<T extends ITreeNodeData>(data: T[]): void {
    const oldNodes = this.getChildTreeNodes();
    const newNodes = data.map((d) => new TreeNode<T>(d, this));
    const batch = this.treeUpdater.update(newNodes, oldNodes);

    requestAnimationFrame(() => {
      batch.forEach((update) => update(this));
    });
  }

  private getChildTreeNodes<T extends ITreeNodeData>(): TreeNode<T>[] {
    return this.children.length > 0 ? (Array.from(this.children) as TreeNode<T>[]) : [];
  }
}
