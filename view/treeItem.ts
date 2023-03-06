import { ButtonComponent } from "obsidian";

export abstract class TreeItemLeaf extends HTMLElement {
  protected readonly mainWrapper: HTMLDivElement;
  private readonly inner: HTMLDivElement;
  private readonly buttons: ButtonComponent[] = [];

  constructor(parent: HTMLElement) {
    super();

    this.addClass("tree-item");
    this.mainWrapper = this.createDiv({ cls: 'tree-item-self is-clickable' });

    this.inner = this.mainWrapper.createDiv({ cls: 'tree-item-inner tree-item-inner-extensions' });

    parent.appendChild(this);
  }

  get text(): string { return this.inner.innerText; }
  set text(v: string) { this.inner.innerText = v; }

  public abstract getText: () => string;
  public setText = () => this.inner.innerText = this.getText();

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

export abstract class TreeItem extends TreeItemLeaf {
  protected readonly childrenWrapper: HTMLDivElement;
  private readonly iconWrapper: HTMLDivElement;

  public constructor(parent: HTMLElement) {
    super(parent);

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

  public getChildrenContainer = (): Readonly<HTMLDivElement> => Object.freeze(this.childrenWrapper);

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
    Array.from(this.childrenWrapper.children).forEach(child => (child as TreeItem).setDisable());
  }

  public delete = () => {
    this.remove();
  }
}