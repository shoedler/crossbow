import { ButtonComponent } from "obsidian";

export class TreeItemLeaf<TData> extends HTMLElement {
  private readonly inner: HTMLDivElement;
  private readonly buttons: ButtonComponent[] = [];
  protected readonly mainWrapper: HTMLDivElement;

  private _data: TData;
  public get data(): TData { return this._data; }
  public set data(v: TData) { 
    this._data = v; 
    this.inner.innerText = this.textGetter(this.data);
  }
  
  constructor(parent: HTMLElement | TreeItem<any, any>, data: TData, textGetter: (data: TData) => string) {
    super();

    this.textGetter = textGetter;
    
    this.addClass("tree-item");
    this.mainWrapper = this.createDiv({ cls: 'tree-item-self is-clickable' });
    
    this.inner = this.mainWrapper.createDiv({ cls: 'tree-item-inner tree-item-inner-extensions' });
    
    (parent instanceof TreeItem ? parent.childrenWrapper : parent).appendChild(this);
    this.data = data;
  }
  
  public static register = () => customElements.define("tree-item-leaf", TreeItemLeaf);

  private readonly textGetter: (data: TData) => string;

  public setDisable = () => {
    this.mainWrapper.style.textDecoration = 'line-through';
    this.buttons.forEach(button => button.setDisabled(true));
  }

  public addOnClick = (listener: (this: HTMLDivElement, ev: HTMLElementEventMap['click']) => any) => {
    this.mainWrapper.addEventListener('click', listener);
  }

  public addFlair = (text: string) => {
    const flairWrapper = this.mainWrapper.createDiv({ cls: 'tree-item-flair-outer' });
    const flair = flairWrapper.createEl('span', { cls: 'tree-item-flair' });
    flair.innerText = text;
  }

  public addTextSuffix = (text: string) => {
    const textEl = this.inner.createEl('span', { cls: 'tree-item-inner-suffix' });
    textEl.innerText = text;
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
  public readonly childrenWrapper: HTMLDivElement;
  private readonly iconWrapper: HTMLDivElement;

  public constructor(parent: HTMLElement | TreeItem<any, any>, data: TData, textGetter: (data: TData) => string) {
    super(parent, data, textGetter);

    this.addClass('is-collapsed');
    this.mainWrapper.addClass('mod-collapsible');

    this.childrenWrapper = document.createElement('div');
    this.childrenWrapper.addClass('tree-item-children');
    this.childrenWrapper.style.display = 'none';

    this.iconWrapper = document.createElement('div');
    this.iconWrapper.addClass('tree-item-icon', 'collapse-icon');
    this.iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
      <path d="M3 8L12 17L21 8"></path>
    </svg>
    `;

    this.appendChild(this.childrenWrapper);
    this.mainWrapper.prepend(this.iconWrapper);

    // Collapse / Fold
    this.mainWrapper.addEventListener('click', () => this.isCollapsed() ? this.expand() : this.collapse());
  }

  public static register = () => customElements.define("tree-item", TreeItem);

  public getChildren = () => Array.from(this.childrenWrapper.children) as TChild[];

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