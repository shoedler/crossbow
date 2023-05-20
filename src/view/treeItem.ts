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

import { ButtonComponent, getIcon } from 'obsidian';

export interface ITreeVisualizable {
  get hash(): string;
  get text(): string;

  sortChildren(): void;
}

export const registerTreeItemElements = () => {
  TreeItem.register();
  TreeItemLeaf.register();
};

export enum TreeItemButtonIcon {
  Scroll = 'lucide-scroll',
  Inspect = 'lucide-inspect',
  Search = 'lucide-search',
}

export class TreeItemLeaf<TData extends ITreeVisualizable> extends HTMLElement {
  private readonly inner: HTMLDivElement;
  private readonly suffix: HTMLSpanElement;
  private readonly flair: HTMLSpanElement;
  protected readonly buttons: ButtonComponent[] = [];
  protected readonly mainWrapper: HTMLDivElement;
  protected readonly flairWrapper: HTMLDivElement;
  public readonly value: TData;

  public get hash(): string {
    return this.value.hash;
  }
  public get text(): string {
    return this.value.text;
  }

  public static register(): void {
    customElements.define('crossbow-tree-item-leaf', TreeItemLeaf);
  }

  constructor(value: TData) {
    super();
    this.value = value;

    this.addClass('tree-item');
    this.mainWrapper = this.createDiv({
      cls: 'tree-item-self is-clickable',
    });

    this.inner = this.mainWrapper.createDiv({
      cls: 'tree-item-inner cb-tree-item-inner-extensions',
      text: this.text,
    });
    this.flairWrapper = this.mainWrapper.createDiv({
      cls: 'tree-item-flair-outer',
    });

    this.suffix = this.inner.createEl('span', {
      cls: 'cb-tree-item-inner-suffix',
    });
    this.flair = this.flairWrapper.createEl('span', {
      cls: 'tree-item-flair',
    });
  }

  public setDisable() {
    this.mainWrapper.style.textDecoration = 'line-through';
    this.buttons.forEach((button) => button.setDisabled(true));
  }

  public addOnClick(listener: (this: HTMLDivElement, ev: HTMLElementEventMap['click']) => void): void {
    this.mainWrapper.addEventListener('click', listener);
  }

  public addFlair(text: string): void {
    this.flair.innerText = text;
  }

  public addTextSuffix(text: string): void {
    this.suffix.innerText = text;
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

export class TreeItem<TData extends ITreeVisualizable> extends TreeItemLeaf<TData> {
  protected readonly childrenWrapper: HTMLDivElement;
  private readonly iconWrapper: HTMLDivElement;

  private childrenFactory: ((self: TreeItem<TData>) => TreeItemLeaf<ITreeVisualizable>[]) | null = null;

  public static register(): void {
    customElements.define('crossbow-tree-item', TreeItem);
  }

  public constructor(value: TData, childrenFactory: (self: TreeItem<TData>) => TreeItemLeaf<ITreeVisualizable>[]) {
    super(value);
    this.childrenFactory = childrenFactory;

    this.addClass('is-collapsed');
    this.mainWrapper.addClass('mod-collapsible');

    this.childrenWrapper = this.createDiv({ cls: 'tree-item-children' });
    this.childrenWrapper.style.display = 'none';

    this.iconWrapper = this.createDiv({
      cls: ['tree-item-icon', 'collapse-icon'],
    });
    this.iconWrapper.appendChild(getIcon('right-triangle') ?? new SVGElement());

    this.appendChild(this.childrenWrapper);
    this.mainWrapper.prepend(this.iconWrapper);

    // Collapse / Fold
    this.mainWrapper.addEventListener('click', () => (this.isCollapsed() ? this.expand() : this.collapse()));
  }

  public isCollapsed() {
    return this.hasClass('is-collapsed');
  }

  public expand() {
    if (this.childrenFactory) {
      this.addTreeItems(this.childrenFactory(this));
      this.childrenFactory = null;
    }

    this.removeClass('is-collapsed');
    this.childrenWrapper.style.display = 'block';
  }

  public collapse() {
    this.addClass('is-collapsed');
    this.childrenWrapper.style.display = 'none';
  }

  public setDisable() {
    super.setDisable();
    this.mainWrapper.style.textDecoration = 'line-through';
    this.buttons.forEach((button) => (button.disabled = true));
    this.getTreeItems().forEach((child) => child.setDisable());
  }

  public addTreeItems(children: TreeItemLeaf<ITreeVisualizable>[]) {
    this.childrenWrapper.replaceChildren(...children);
  }

  public getTreeItems(): TreeItemLeaf<ITreeVisualizable>[] {
    return Array.from(this.childrenWrapper.children) as TreeItemLeaf<ITreeVisualizable>[];
  }
}
