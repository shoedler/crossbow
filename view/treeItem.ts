import { ButtonComponent, getIcon } from "obsidian";

export class TreeItemLeaf<TData> extends HTMLElement {
  private readonly inner: HTMLDivElement;
  private readonly suffix: HTMLSpanElement;
  private readonly flair: HTMLSpanElement;
  private readonly buttons: ButtonComponent[] = [];
  protected readonly mainWrapper: HTMLDivElement;
  protected readonly flairWrapper: HTMLDivElement;
  public readonly data: TData;
  
  constructor(data: TData, textGetter: (data: TData) => string) {
    super();
    
    this.addClass("tree-item");
    this.mainWrapper = this.createDiv({ cls: 'tree-item-self is-clickable' });
    
    this.inner = this.mainWrapper.createDiv({ cls: 'tree-item-inner tree-item-inner-extensions' });
    this.flairWrapper = this.mainWrapper.createDiv({ cls: 'tree-item-flair-outer' });

    this.data = data;
    this.inner.setText(textGetter(data));
    
    this.suffix = this.inner.createEl('span', { cls: 'tree-item-inner-suffix' });
    this.flair = this.flairWrapper.createEl('span', { cls: 'tree-item-flair' });

  }
  
  public static register = () => customElements.define("tree-item-leaf", TreeItemLeaf);

  public attach = (parent: HTMLElement) => {
    parent.appendChild(this);
  }

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
}

export class TreeItem<TData, TChild extends TreeItemLeaf<any>> extends TreeItemLeaf<TData> {
  protected readonly childrenWrapper: HTMLDivElement;
  private readonly iconWrapper: HTMLDivElement;

  public constructor(data: TData, textGetter: (data: TData) => string) {
    super(data, textGetter);

    this.addClass('is-collapsed');
    this.mainWrapper.addClass('mod-collapsible');

    this.childrenWrapper = createEl('div', { cls: 'tree-item-children'});
    this.childrenWrapper.style.display = 'none';

    this.iconWrapper = createEl('div', { cls: ['tree-item-icon', 'collapse-icon']})
    this.iconWrapper.appendChild(getIcon('right-triangle')!);

    this.appendChild(this.childrenWrapper);
    this.mainWrapper.prepend(this.iconWrapper);

    // Collapse / Fold
    this.mainWrapper.addEventListener('click', () => this.isCollapsed() ? this.expand() : this.collapse());
  }

  public static register = () => customElements.define("tree-item", TreeItem);

  public getChildren = () => Array.from(this.childrenWrapper.children) as TChild[];

  public addChild = (child: TreeItemLeaf<any>) => this.childrenWrapper.appendChild(child);

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
    Array.from(this.childrenWrapper.children).forEach(child => (child as TreeItem<any, any>).setDisable());
  }

  public delete = () => {
    this.remove();
  }

  public deleteChildren = () => {
    this.childrenWrapper.replaceChildren();
  }
}