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

import { ButtonComponent, Editor, ItemView, WorkspaceLeaf } from 'obsidian';
import { CrossbowViewController } from 'src/controllers/viewController';
import { Suggestion } from 'src/model/suggestion';
import { Tree } from './tree/tree';

export class CrossbowView extends ItemView {
  public static viewType = 'crossbow-toolbar';
  private readonly controlsContainer: HTMLDivElement;
  private readonly manualRefreshButton: ButtonComponent;
  private readonly treeContainer: HTMLDivElement;
  private tree: Tree | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly onManualRefreshButtonClick: (evt: MouseEvent) => void) {
    super(leaf);

    this.controlsContainer = this.contentEl.createDiv({ cls: 'cb-view-controls' });
    this.treeContainer = this.contentEl.createDiv({ cls: 'cb-view-tree' });
    this.treeContainer.createSpan({ text: 'Open a note to run crossbow', cls: 'cb-view-empty' });

    this.manualRefreshButton = this.createManualRefreshButton(this.controlsContainer, this.onManualRefreshButtonClick);
  }

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
    this.tree?.remove();
    this.tree = null;
  }

  public update(suggestions: Suggestion[], targetEditor: Editor, showManualRefreshButton: boolean): void {
    showManualRefreshButton ? this.manualRefreshButton.buttonEl.show() : this.manualRefreshButton.buttonEl.hide();

    if (!this.tree) {
      this.createTree(targetEditor);
    } else if (this.tree.targetEditor !== targetEditor) {
      this.tree.remove();
      this.createTree(targetEditor);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.tree!.update(suggestions);
  }

  private createTree(targetEditor: Editor) {
    this.tree = new Tree(targetEditor);
    this.treeContainer.empty();
    this.treeContainer.appendChild(this.tree);
  }

  private createManualRefreshButton(parentEl: HTMLElement, onClick: (ev: MouseEvent) => void): ButtonComponent {
    const button = new ButtonComponent(parentEl);

    button.buttonEl.id = CrossbowViewController.MANUAL_REFRESH_BUTTON_ID;
    button.setTooltip('Refresh suggestions');
    button.setIcon('lucide-rotate-cw');
    button.setClass('cb-tree-item-button');
    button.onClick(onClick);

    return button;
  }
}
