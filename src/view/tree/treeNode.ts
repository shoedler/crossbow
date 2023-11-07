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

import { ButtonComponent, Editor, getIcon } from 'obsidian';
import { ITreeContextProvider } from './tree';
import { IComparable } from './treeUpdater';

export enum TreeItemButtonIcon {
  Scroll = 'lucide-scroll',
  Inspect = 'lucide-inspect',
  Search = 'lucide-search',
}

export interface ITreeNodeContext {
  targetEditor: Editor;
  self: TreeNode<ITreeNodeData>;
}

export interface ITreeNodeData extends IComparable {
  readonly parent: ITreeNodeData | null;
  readonly children?: ITreeNodeData[];

  get text(): string;
  get suffix(): string | null;
  get flair(): string | null;
  get subtitle(): string | null;
  get actions(): {
    name: string;
    icon: TreeItemButtonIcon;
    callback(this: ITreeNodeData, ev: MouseEvent, ctx: ITreeNodeContext): void;
  }[];

  onClick?(this: ITreeNodeData, ctx: ITreeNodeContext): void;
}

export class TreeNode<TData extends ITreeNodeData> extends HTMLElement {
  private readonly manager: ITreeContextProvider;
  protected readonly childrenWrapper: HTMLDivElement | null = null;
  private readonly iconWrapper: HTMLDivElement | null = null;
  private readonly inner: HTMLDivElement;
  private readonly mainWrapper: HTMLDivElement;
  private readonly flairWrapper: HTMLDivElement;
  private suffix: HTMLSpanElement;
  private subtitle: HTMLSpanElement;
  private flair: HTMLSpanElement;
  private buttons: ButtonComponent[] = [];
  public readonly value: TData;

  public constructor(value: TData, manager: ITreeContextProvider) {
    super();

    this.value = value;
    this.manager = manager;
    const isLeaf = this.value.children === undefined;

    this.addClass('tree-item');

    this.mainWrapper = this.createDiv({
      cls: 'tree-item-self is-clickable mod-collapsible',
    });

    if (!isLeaf) {
      this.iconWrapper = this.mainWrapper.createDiv({
        cls: 'tree-item-icon collapse-icon is-collapsed',
      });
      this.iconWrapper.appendChild(getIcon('right-triangle') ?? new SVGElement());
    }

    this.inner = this.mainWrapper.createDiv({
      cls: 'tree-item-inner cb-tree-item-inner-extensions',
      text: this.value.text,
    });

    if (this.value.flair !== null) {
      this.flairWrapper = this.mainWrapper.createDiv({
        cls: 'tree-item-flair-outer',
      });
      this.flair = this.flairWrapper.createEl('span', {
        cls: 'tree-item-flair',
        text: this.value.flair,
      });
    }

    if (this.value.suffix !== null) {
      this.suffix = this.inner.createSpan({
        cls: 'cb-tree-item-inner-suffix',
        text: this.value.suffix,
      });
    }

    if (this.value.subtitle !== null) {
      this.subtitle = this.inner.createEl('span', {
        cls: 'cb-tree-item-inner-subtitle',
        text: this.value.subtitle,
      });
    }

    if (this.value.onClick !== undefined) {
      const boundOnClick = this.value.onClick.bind(this.value);
      this.mainWrapper.addEventListener('click', () => boundOnClick(this.context()));
    }

    if (!isLeaf) {
      this.childrenWrapper = this.createDiv({ cls: 'tree-item-children' });
      this.childrenWrapper.style.display = 'none';

      // collapse / expand
      this.mainWrapper.addEventListener('click', () => (this.isCollapsed() ? this.expand() : this.collapse()));

      // lazy-create children nodes
      this.mainWrapper.addEventListener('click', () => this.generateChildren(), { once: true });
    }

    if (this.value.actions.length > 0) {
      this.value.actions.forEach((action) => {
        const boundCallback = action.callback.bind(this.value);
        this.addButton(action.name, action.icon, (ev) => boundCallback(ev, this.context()));
      });
    }
  }

  public get childTreeNodes(): TreeNode<ITreeNodeData>[] {
    return this.childrenWrapper ? (Array.from(this.childrenWrapper.children) as TreeNode<ITreeNodeData>[]) : [];
  }

  public static register(): void {
    if (!customElements.get('crossbow-tree-item')) {
      customElements.define('crossbow-tree-item', TreeNode);
    }
  }

  public context(): ITreeNodeContext {
    return {
      targetEditor: this.manager.targetEditor,
      self: this,
    };
  }

  public generateChildren(): void {
    if (!this.childrenWrapper || !this.value.children) return;
    if (this.childrenWrapper.children.length > 0) return;

    const nodes = this.value.children.map((child) => new TreeNode(child, this.manager));
    this.childrenWrapper.replaceChildren(...nodes);
  }

  public isCollapsed() {
    if (!this.childrenWrapper || !this.iconWrapper) return true;

    return this.iconWrapper.hasClass('is-collapsed');
  }

  public expand() {
    if (!this.childrenWrapper || !this.iconWrapper) return;

    this.iconWrapper.removeClass('is-collapsed');
    this.childrenWrapper.style.display = 'block';
  }

  public collapse() {
    if (!this.childrenWrapper || !this.iconWrapper) return;

    this.iconWrapper.addClass('is-collapsed');
    this.childrenWrapper.style.display = 'none';
  }

  public setDisable() {
    this.mainWrapper.style.textDecoration = 'line-through';
    this.mainWrapper.style.color = 'var(--text-muted)';
    this.style.cursor = 'wait';

    this.buttons.forEach((button) => {
      button.setDisabled(true);
      button.disabled = true;
    });

    this.childTreeNodes.forEach((child) => child.setDisable());
  }

  public addButton(
    label: string,
    iconName: TreeItemButtonIcon,
    onclick: (this: HTMLDivElement, ev: MouseEvent) => void
  ): void {
    const button = new ButtonComponent(this.mainWrapper);

    button.setTooltip(label);
    button.setIcon(iconName);
    button.setClass('cb-tree-item-button');
    button.onClick(onclick);

    this.buttons.push(button);
  }
}
