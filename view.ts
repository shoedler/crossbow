import CrossbowPlugin, { CrossbowCacheMatch, CrossbowSuggestion } from 'main';
import {
  ButtonComponent,
  EditorPosition,
  ItemView,
  setIcon,
  WorkspaceLeaf,
} from 'obsidian';

export class CrossbowView extends ItemView {
  private readonly crossbow: CrossbowPlugin;
  private results: CrossbowSuggestion[];

  constructor(leaf: WorkspaceLeaf, crossbow: CrossbowPlugin) {
    CrossbowTreeItem.register();
    CrossbowTreeItemLeaf.register();

    super(leaf);
    this.crossbow = crossbow;
  }

  public static viewType = 'crossbow-toolbar';

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
    this.draw();
  }

  public updateResults = (results: CrossbowSuggestion[]): void => {
    this.results = results
    this.draw();
  };

  public clear = (): void => this.containerEl.empty();

  private getRankEmoji = (rank: CrossbowCacheMatch['rank']): string => 
    rank >= 8 ? '🏆' :
    rank >= 5 ? '🥇' :
    rank >= 2 ? '🥈' :
    '🥉';

  private readonly draw = (): void => {
    this.clear();

    const nav = this.containerEl.createDiv({ cls: 'nav-header' });
    const container = this.containerEl.createDiv({ cls: 'tag-container' });

    // Build nav header
    const navButtons = nav.createDiv({ cls: 'nav-buttons-container' });
    const navButton = navButtons.createDiv({ cls: 'clickable-icon nav-action-button', attr: { 'aria-label': 'Run Crossbow' } });
    setIcon(navButton, 'reset');
    navButton.addEventListener('click', () => this.crossbow.runWithCacheUpdate());

    // Build tree items
    if (this.results)
      this.results.forEach(result => this.addResultTreeItem(container, result));
  };

  private addResultTreeItem = (
    container: Readonly<HTMLDivElement>, 
    result: CrossbowSuggestion,
  ) => {
    const ranks = new Set<number>();
    result.matches.forEach(match => ranks.add(match.rank));
    const availableMatchRanks = Array.from(ranks).sort((a,b) => b - a).map(rank => this.getRankEmoji(rank as CrossbowCacheMatch['rank'])).join('');

    const item = new CrossbowTreeItem(container, result.word);
    item.addFlair(availableMatchRanks);
    item.addTextSuffix(`(${result.occurrences.length.toString()})`);
  
    result.occurrences.forEach(occurrence => this.addResultWordOccurrenceTreeItem(item.getChildrenContainer(), result.word, result.matches, occurrence));
    return item;
  }

  private addResultWordOccurrenceTreeItem = (
    parent: Readonly<HTMLDivElement>,
    resultWord: CrossbowSuggestion['word'],
    resultMatches: CrossbowSuggestion['matches'],
    occurrence: EditorPosition,
  ) => {
    const item = new CrossbowTreeItem(parent, `On line ${occurrence.line}:${occurrence.ch}`);
    
    // Scroll into view action
    const scrollIntoView = () => {
      const occurrenceEnd = { ch: occurrence.ch + resultWord.length, line: occurrence.line } as EditorPosition
      this.crossbow.currentEditor.setSelection(occurrence, occurrenceEnd);
      this.crossbow.currentEditor.scrollIntoView({ from: occurrence, to: occurrenceEnd }, true)
    }

    // Can be invoked via flair button
    item.addButton("Scroll into View", "lucide-scroll", (ev: MouseEvent) => {
      scrollIntoView();
      ev.preventDefault();
      ev.stopPropagation();
    });

    // As well as when expanding the suggestions, if it's collapsed. Greatly improves UX
    item.addOnClick(() => {
      if (!item.isCollapsed())
        scrollIntoView();
    });

    resultMatches.forEach(match => {
      const childItem = new CrossbowTreeItemLeaf(item.getChildrenContainer(), `${this.getRankEmoji(match.rank)} ${match.text}`);

      // Add backlink & remove action
      childItem.addButton("Use", 'lucide-inspect', () => {
        item.disable();

        const occurrenceEnd = { ch: occurrence.ch + resultWord.length, line: occurrence.line } as EditorPosition
        const link = match.item ? 
          this.app.fileManager.generateMarkdownLink(match.file, match.text, "#" + match.text, resultWord) : 
          this.app.fileManager.generateMarkdownLink(match.file, match.text, undefined, resultWord);

        this.crossbow.currentEditor.replaceRange(link, occurrence, occurrenceEnd);
      });

      // Go to source
      childItem.addButton("Source", 'lucide-search', () => {
        console.warn("🏹: Go To Source is not yet implemented");
      });
    });

    return item;
  }
}

class CrossbowTreeItemLeaf extends HTMLElement {
  protected readonly mainWrapper: HTMLDivElement;
  private readonly inner: HTMLDivElement; 
  private readonly buttons: ButtonComponent[] = [];

  constructor(parent: HTMLDivElement, text: string = "") {
    super();

    this.addClass("tree-item");
    this.mainWrapper = this.createDiv({ cls: 'tree-item-self is-clickable' });

    this.inner = this.mainWrapper.createDiv({ cls: 'tree-item-inner tree-item-inner-extensions' });

    parent.appendChild(this);

    this.setText(text);
  }

  public setText = (text: string) => this.inner.innerText = text;

  public disable = () => {
    this.mainWrapper.style.textDecoration = 'line-through';
    this.buttons.forEach(button => button.disabled = true);
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

  public addButton = (label: string, iconName:string, onclick: (this: HTMLDivElement, ev: MouseEvent) => any) => {
    const button = new ButtonComponent(this.mainWrapper);
    button.setTooltip(label);
    button.setIcon(iconName);
    button.setClass('tree-item-button');
    button.onClick(onclick);

    this.buttons.push(button);
  }

  public static register = () => customElements.define("crossbow-tree-item-leaf", CrossbowTreeItemLeaf);
}

class CrossbowTreeItem extends CrossbowTreeItemLeaf {
  private readonly childrenWrapper: HTMLDivElement;
  private readonly iconWrapper: HTMLDivElement;

  public constructor(parent: HTMLDivElement, text: string = "") {
    super(parent, text);

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

  public getChildrenContainer = (): Readonly<HTMLDivElement> => {
    return Object.freeze(this.childrenWrapper);
  }

  public disable = () => {
    super.disable();
    this.childrenWrapper.remove();
  }

  public isCollapsed = () => this.hasClass("is-collapsed");

  public expand = () => {
    this.removeClass("is-collapsed");
    this.childrenWrapper.style.display = "block";
  }

  public collapse = () => {
    this.addClass("is-collapsed");
    this.childrenWrapper.style.display = 'none';
  }

  public static register = () => customElements.define("crossbow-tree-item", CrossbowTreeItem);
}