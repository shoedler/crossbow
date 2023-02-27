import CrossbowPlugin, { CrossbowCacheMatch, CrossbowSuggestion } from 'main';
import {
  EditorPosition,
  ItemView,
  setIcon,
  WorkspaceLeaf,
} from 'obsidian';

export const CrossbowViewType = 'crossbow-toolbar';

export class CrossbowView extends ItemView {
  private readonly crossbow: CrossbowPlugin
  constructor(leaf: WorkspaceLeaf, crossbow: CrossbowPlugin) {
    CrossbowTreeItem.register();
    CrossbowTreeItemLeaf.register();

    super(leaf);
    this.crossbow = crossbow;
  }
  public getViewType(): string {
    return CrossbowViewType;
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
  private results: CrossbowSuggestion[];
  public updateResults = (results: CrossbowSuggestion[]): void => {
    this.results = results
    this.draw();
  };

  private truncate = (text: string, length: number = 20): string => text.length > length ? text.substring(0, length - 3) + '...' : text;

  public clear = (): void => this.containerEl.empty();

  private readonly draw = (): void => {
    this.clear();

    const nav = this.containerEl.createDiv({ cls: 'nav-header' });
    const container = this.containerEl.createDiv({ cls: 'tag-container' });

    // Build nav header
    const navButtons = nav.createDiv({ cls: 'nav-buttons-container' });
    const navButton = navButtons.createDiv({ cls: 'clickable-icon nav-action-button', attr: { 'aria-label': 'Run Crossbow' } });
    setIcon(navButton, 'reset');
    navButton.addEventListener('click', () => this.crossbow.runWithCacheUpdate());

    if (this.results)
      this.results.forEach(result => this.addResult(container, result));
  };

  private getRankEmoji = (rank: CrossbowCacheMatch['rank']): string => rank >= 8 ? '🥇' :
    rank >= 5 ? '🥈' :
    rank >= 2 ? '🥉' :
    '💩';

  private addResult = (
    container: HTMLDivElement, 
    result: CrossbowSuggestion,
  ) => {
    const ranks = new Set<number>();
    result.matches.forEach(match => ranks.add(match.rank));
    const availableMatchRanks = Array.from(ranks).sort().map(rank => this.getRankEmoji(rank as CrossbowCacheMatch['rank'])).join('');

    const item = new CrossbowTreeItem(container, result.word, `${availableMatchRanks} ${result.occurrences.length.toString()}`)
    result.occurrences.forEach(occurrence => this.addResultWordOccurrence(item.childrenWrapper, result.word, result.matches, occurrence));
    return item;
  }

  private addResultWordOccurrence = (
    parent: HTMLDivElement,
    resultWord: CrossbowSuggestion['word'],
    resultMatches: CrossbowSuggestion['matches'],
    occurrence: EditorPosition,
  ) => {
    const item = new CrossbowTreeItem(parent, resultWord, `L${occurrence.line}:${occurrence.ch}`)
    
    // Scroll into View
    item.mainWrapper.addEventListener('dblclick', () => {
      const occurrenceEnd = { ch: occurrence.ch + resultWord.length, line: occurrence.line } as EditorPosition
      this.crossbow.currentEditor.setSelection(occurrence, occurrenceEnd);
      this.crossbow.currentEditor.scrollIntoView({ from: occurrence, to: occurrenceEnd }, true)
    })

    resultMatches.forEach(match => {
      const child = new CrossbowTreeItemLeaf(item.childrenWrapper, /*🔗*/ `${this.getRankEmoji(match.rank)} ${match.text}`, `In File '${this.truncate(match.file.basename)}'`)

      // Add backlink & remove
      child.mainWrapper.addEventListener('dblclick', () => {
        item.childrenWrapper.remove();
        item.mainWrapper.style.textDecoration = 'line-through';

        const occurrenceEnd = { ch: occurrence.ch + resultWord.length, line: occurrence.line } as EditorPosition
        const link = match.item ? 
          this.app.fileManager.generateMarkdownLink(match.file, match.text, "#" + match.text, resultWord) : 
          this.app.fileManager.generateMarkdownLink(match.file, match.text, undefined, resultWord);

        this.crossbow.currentEditor.replaceRange(link, occurrence, occurrenceEnd);
      })
    });

    return item;
  }
}

class CrossbowTreeItemLeaf extends HTMLElement {
  public readonly mainWrapper: HTMLDivElement;
  private readonly flair: HTMLSpanElement;
  private readonly inner: HTMLDivElement; 

  constructor(parent: HTMLDivElement, text: string = "", flairText: string = "") {
    super();

    this.addClass("tree-item");
    this.mainWrapper = this.createDiv({ cls: 'tree-item-self is-clickable' });

    this.inner = this.mainWrapper.createDiv({ cls: 'tree-item-inner' });
    const flairWrapper = this.mainWrapper.createDiv({ cls: 'tree-item-flair-outer' });
    this.flair = flairWrapper.createEl('span', { cls: 'tree-item-flair' });

    parent.appendChild(this);

    this.setText(text);
    this.setFlairText(flairText);
  }

  public setFlairText = (text: string) => this.flair.innerText = text;

  public setText = (text: string) => this.inner.innerText = text;

  public static register = () => customElements.define("crossbow-tree-item-leaf", CrossbowTreeItemLeaf);
}

class CrossbowTreeItem extends CrossbowTreeItemLeaf {
  public readonly childrenWrapper: HTMLDivElement;
  public readonly iconWrapper: HTMLDivElement;

  constructor(parent: HTMLDivElement, text: string = "", flairText: string = "") {
    super(parent, text, flairText);

    this.addClass('is-collapsed');
    this.mainWrapper.addClass('mod-collapsible');

    this.childrenWrapper = document.createElement('div');
    this.childrenWrapper.addClass('tree-item-children');
    this.childrenWrapper.style.display = 'none';

    this.iconWrapper = document.createElement('div');
    this.iconWrapper.addClass('tree-item-icon', 'collapse-icon');
    this.iconWrapper.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
      <path d="M3 8L12 17L21 8"></path>
    </svg>
    `;

    this.appendChild(this.childrenWrapper);
    this.mainWrapper.prepend(this.iconWrapper);

    // Collapse / Uncollapse
    this.mainWrapper.addEventListener('click', () => {
      if (this.hasClass("is-collapsed")) {
        this.removeClass("is-collapsed");
        this.childrenWrapper.style.display = "block";
      }
      else {
        this.addClass("is-collapsed");
        this.childrenWrapper.style.display = 'none';
      }
    });
  }

  public static register = () => customElements.define("crossbow-tree-item", CrossbowTreeItem);
}