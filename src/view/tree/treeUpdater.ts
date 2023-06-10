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

import { ITreeNodeData, TreeNode } from './treeNode';

export interface IComparable {
  uid: string;
}

export const equals = (a: IComparable, b: IComparable): boolean => a.uid === b.uid;

export type BatchUpdate = ((container: HTMLElement) => void)[];

export class TreeUpdater {
  public update<T extends ITreeNodeData>(newNodes: TreeNode<T>[], oldNodes: TreeNode<T>[]): BatchUpdate {
    const updates: BatchUpdate = [];

    for (let i = 0; i < newNodes.length; i++) {
      const newNode = newNodes[i];
      const index = oldNodes.findIndex((oldNode) => equals(oldNode.value, newNode.value));
      const existingNode = index !== -1 ? oldNodes.splice(index, 1)[0] : undefined;

      if (existingNode) {
        // Toggle expanded state of children, if it was expanded before
        existingNode.childTreeNodes
          .filter((child) => !child.isCollapsed())
          .forEach((expandedChild) => {
            const child = newNode.childTreeNodes.find((child) => equals(child.value, expandedChild.value));
            if (child) {
              child.expand();
              child.generateChildren();
            }
          });

        // Replace existing node with new node
        updates.push((container) => {
          container.insertAfter(newNode, existingNode);

          if (!existingNode.isCollapsed()) {
            newNode.expand();
            newNode.generateChildren();
          }

          existingNode.remove();
        });
      } else {
        // Insert the new suggestion at the correct position. They are sorted by localeCompare of their 'hash' property
        const insertionIndex = oldNodes.findIndex((oldNode) => newNode.value.uid.localeCompare(oldNode.value.uid) < 0);

        updates.push((container) => {
          if (insertionIndex === -1) {
            container.appendChild(newNode);
          } else {
            container.insertBefore(newNode, oldNodes[insertionIndex]);
          }
        });
      }
    }

    // Now, we're left with the existing suggestions that we need to remove
    updates.push((container) => {
      oldNodes.forEach((item) => {
        item.remove();
      });
    });

    return updates;
  }
}
