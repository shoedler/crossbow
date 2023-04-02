import { ButtonComponent, getIcon } from "obsidian";

export abstract class TreeItemBase<TData> extends HTMLElement {
  private inner: HTMLDivElement;
  private suffix: HTMLSpanElement;
  private flair: HTMLSpanElement;
  private buttons: ButtonComponent[] = [];
  protected mainWrapper: HTMLDivElement;
  protected flairWrapper: HTMLDivElement;
  public readonly value: TData;

  constructor(value: TData) {
    super();
    this.value = value;

    this.addClass("tree-item");
    this.mainWrapper = this.createDiv({ cls: 'tree-item-self is-clickable' });

    this.inner = this.mainWrapper.createDiv({ cls: 'tree-item-inner tree-item-inner-extensions' });
    this.flairWrapper = this.mainWrapper.createDiv({ cls: 'tree-item-flair-outer' });

    this.suffix = this.inner.createEl('span', { cls: 'tree-item-inner-suffix' });
    this.flair = this.flairWrapper.createEl('span', { cls: 'tree-item-flair' });
  }

  public abstract sortChildren(): void;

  public abstract get hash(): string;

  public abstract get text(): string;

  public setDisable = () => {
    this.mainWrapper.style.textDecoration = 'line-through';
    this.buttons.forEach(button => button.setDisabled(true));
  }

  public addOnClick = (listener: (this: HTMLDivElement, ev: HTMLElementEventMap['click']) => any) => {
    this.mainWrapper.addEventListener('click', listener);
  }

  public addFlair = (text: string) => {
    this.flair.innerText = text;
  }

  public addTextSuffix = (text: string) => {
    this.suffix.innerText = text;
  }

  public addButton = (label: string, iconName: string, onclick: (this: HTMLDivElement, ev: MouseEvent) => any) => {
    const button = new ButtonComponent(this.mainWrapper);

    button.setTooltip(label);
    button.setIcon(iconName);
    button.setClass('tree-item-button');
    button.onClick(onclick);

    this.buttons.push(button);
  }

  public attach = (parent: HTMLElement, insertBeforeIndex?: number) => {   
    this.inner.setText(this.text);
    insertBeforeIndex === undefined ? parent.appendChild(this) : parent.insertBefore(this, parent.children[insertBeforeIndex]);
  }
}

export abstract class TreeItem<TData> extends TreeItemBase<TData> {
  protected childrenWrapper: HTMLDivElement;
  private iconWrapper: HTMLDivElement;

  public constructor(value: TData) {
    super(value);

    this.addClass('is-collapsed');
    this.mainWrapper.addClass('mod-collapsible');

    this.childrenWrapper = createEl('div', { cls: 'tree-item-children' });
    this.childrenWrapper.style.display = 'none';

    this.iconWrapper = createEl('div', { cls: ['tree-item-icon', 'collapse-icon'] })
    this.iconWrapper.appendChild(getIcon('right-triangle')!);

    this.appendChild(this.childrenWrapper);
    this.mainWrapper.prepend(this.iconWrapper);

    // Collapse / Fold
    this.mainWrapper.addEventListener('click', () => this.isCollapsed() ? this.expand() : this.collapse());
  }

  public abstract getChildren() : TreeItemBase<any>[];

  public abstract addChildren(children: TreeItemBase<any>[]): void;

  public isCollapsed = () => this.hasClass("is-collapsed");

  public expand = () => {
    this.removeClass("is-collapsed");
    this.childrenWrapper.style.display = "block";
  }

  public collapse = () => {
    this.addClass("is-collapsed");
    this.childrenWrapper.style.display = 'none';
  }

  public setDisable = () => {
    super.setDisable();
    this.mainWrapper.style.textDecoration = 'line-through';
    Array.from(this.childrenWrapper.children).forEach(child => (child as TreeItemBase<any>).setDisable());
  }
}
