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

export abstract class TreeItemBase<TData> extends HTMLElement {
  private readonly inner: HTMLDivElement;
  private readonly suffix: HTMLSpanElement;
  private readonly flair: HTMLSpanElement;
  private readonly buttons: ButtonComponent[] = [];
  protected readonly mainWrapper: HTMLDivElement;
  protected readonly flairWrapper: HTMLDivElement;
  public readonly value: TData;

  public abstract get hash(): string;
  public abstract get text(): string;

  constructor(value: TData) {
    super();
    this.value = value;

    this.addClass('tree-item');
    this.mainWrapper = this.createDiv({
      cls: 'tree-item-self is-clickable',
    });

    this.inner = this.mainWrapper.createDiv({
      cls: 'tree-item-inner tree-item-inner-extensions',
    });
    this.flairWrapper = this.mainWrapper.createDiv({
      cls: 'tree-item-flair-outer',
    });

    this.suffix = this.inner.createEl('span', {
      cls: 'tree-item-inner-suffix',
    });
    this.flair = this.flairWrapper.createEl('span', {
      cls: 'tree-item-flair',
    });
  }

  public connectedCallback() {
    console.log(this.text, this.parentElement, this.parentNode);

    this.inner.setText(this.text);
  }

  public abstract sortChildren(): void;

  public setDisable() {
    this.mainWrapper.style.textDecoration = 'line-through';
    this.buttons.forEach((button) => button.setDisabled(true));
  }

  public addOnClick = (
    listener: (this: HTMLDivElement, ev: HTMLElementEventMap['click']) => any
  ) => {
    this.mainWrapper.addEventListener('click', listener);
  };

  public addFlair = (text: string) => {
    this.flair.innerText = text;
  };

  public addTextSuffix = (text: string) => {
    this.suffix.innerText = text;
  };

  public addButton = (
    label: string,
    iconName: string,
    onclick: (this: HTMLDivElement, ev: MouseEvent) => any
  ) => {
    const button = new ButtonComponent(this.mainWrapper);

    button.setTooltip(label);
    button.setIcon(iconName);
    button.setClass('tree-item-button');
    button.onClick(onclick);

    this.buttons.push(button);
  };
}

export abstract class TreeItem<TData> extends TreeItemBase<TData> {
  protected readonly childrenWrapper: HTMLDivElement;
  private readonly iconWrapper: HTMLDivElement;

  public constructor(value: TData) {
    super(value);

    this.addClass('is-collapsed');
    this.mainWrapper.addClass('mod-collapsible');

    this.childrenWrapper = this.createDiv({ cls: 'tree-item-children' });
    this.childrenWrapper.style.display = 'none';

    this.iconWrapper = this.createDiv({
      cls: ['tree-item-icon', 'collapse-icon'],
    });
    this.iconWrapper.appendChild(getIcon('right-triangle')!);

    this.appendChild(this.childrenWrapper);
    this.mainWrapper.prepend(this.iconWrapper);

    // Collapse / Fold
    this.mainWrapper.addEventListener('click', () =>
      this.isCollapsed() ? this.expand() : this.collapse()
    );
  }

  public abstract getChildren(): TreeItemBase<any>[];

  public isCollapsed() {
    return this.hasClass('is-collapsed');
  }

  public expand() {
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
    Array.from(this.childrenWrapper.children).forEach((child) =>
      (child as TreeItemBase<any>).setDisable()
    );
  }

  public addChildren(children: TreeItemBase<any>[]) {
    this.childrenWrapper.replaceChildren(...children);
  }
}
