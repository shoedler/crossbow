import CrossbowPlugin, { CrossbowMatchResult, CrossbowPluginSettings } from 'main';
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
  private results: CrossbowMatchResult[];
  public updateResults = (results: CrossbowMatchResult[]): void => {
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

    this.results.forEach(result => this.addResult(container, result));
  };

  private addResult = (
    container: HTMLDivElement, 
    result: CrossbowMatchResult,
  ) => {
    const item = CrossbowView.createTreeItem(container);
    item.inner.innerText = "🏹 " + result.word
    item.flair.innerText = result.occurrences.length.toString();

    result.occurrences.forEach(occurrence => this.addResultOccurrence(item.children, result.word, result.matches, occurrence));
    
    return item;
  }

  private addResultOccurrence = (
    parent: HTMLDivElement,
    resultWord: CrossbowMatchResult['word'],
    resultMatches: CrossbowMatchResult['matches'],
    occurrence: EditorPosition,
  ) => {
    const item = CrossbowView.createTreeItem(parent);
    item.inner.innerText = resultWord;
    item.flair.innerText = "L" + occurrence.line + ":" + occurrence.ch;

    // Scroll into View
    item.self.addEventListener('click', () => {
      const occurrenceEnd = { ch: occurrence.ch + resultWord.length, line: occurrence.line } as EditorPosition
      this.crossbow.currentEditor.setSelection(occurrence, occurrenceEnd);
      this.crossbow.currentEditor.scrollIntoView({ from: occurrence, to: occurrenceEnd }, true)
    })

    resultMatches.forEach(match => {
      const child = CrossbowView.createTreeLeafItem(item.children);
      child.inner.innerText = "🔗 " + match.text;
      child.flair.innerText = `In File '${this.truncate(match.file.basename)}'`;

      // Add backlink & remove
      child.self.addEventListener('dblclick', () => {
        item.children.remove();
        item.self.style.textDecoration = 'line-through';

        const occurrenceEnd = { ch: occurrence.ch + resultWord.length, line: occurrence.line } as EditorPosition
        const link = match.item ? 
          this.app.fileManager.generateMarkdownLink(match.file, match.text, "#" + match.text, resultWord) : 
          this.app.fileManager.generateMarkdownLink(match.file, match.text, undefined, resultWord);

        this.crossbow.currentEditor.replaceRange(link, occurrence, occurrenceEnd);
      })
    });

    return item;
  }
  
  private static createTreeItem = (parent: HTMLDivElement) => {
    const root = parent.createDiv({ cls: 'tree-item is-collapsed' });
    const self = root.createDiv({ cls: 'tree-item-self mod-collapsible is-clickable' });
    const children = root.createDiv({ cls: 'tree-item-children' });

    const icon = self.createDiv({ cls: 'tree-item-icon collapse-icon' });
    icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
      <path d="M3 8L12 17L21 8"></path>
    </svg>
    `;

    const inner = self.createDiv({ cls: 'tree-item-inner' });
    const flairWrapper = self.createDiv({ cls: 'tree-item-flair-outer' });
    const flair = flairWrapper.createEl('span', { cls: 'tree-item-flair' });

    // Collapse / Uncollapse
    self.addEventListener('click', () => {
      if (root.hasClass("is-collapsed")) {
        root.removeClass("is-collapsed");
        children.style.display = "block";
      }
      else {
        root.addClass("is-collapsed");
        children.style.display = 'none';
      }
    });

    children.style.display = 'none';

    return { root, self, children, inner, flair };
  }



  private static createTreeLeafItem = (parent: HTMLDivElement) => {
    const root = parent.createDiv({ cls: 'tree-item' });
    const self = root.createDiv({ cls: 'tree-item-self is-clickable' });
    const inner = self.createDiv({ cls: 'tree-item-inner' });

    const flairWrapper = self.createDiv({ cls: 'tree-item-flair-outer' });
    const flair = flairWrapper.createEl('span', { cls: 'tree-item-flair' });

    return { root, self, inner, flair };
  }
}

class CrossbowTreeItemLeaf extends HTMLDivElement {
  public readonly mainWrapper: HTMLDivElement;
  private readonly flair: HTMLSpanElement;
  private readonly inner: HTMLDivElement; 

  constructor(parent: HTMLDivElement) {
    super();

    this.addClasses(['tree-item']);

    this.mainWrapper = this.createDiv({ cls: 'tree-item-self is-clickable' });

    const flairWrapper = this.mainWrapper.createDiv({ cls: 'tree-item-flair-outer' });
    this.inner = this.mainWrapper.createDiv({ cls: 'tree-item-inner' });

    this.flair = flairWrapper.createEl('span', { cls: 'tree-item-flair' });

    parent.appendChild(this);
  }

  public setSecondaryText = (text: string) => this.flair.innerText = text;

  public setText = (text: string) => this.inner.innerText = text;
}

class CrossbowTreeItem extends CrossbowTreeItemLeaf {
  public readonly childrenWrapper: HTMLDivElement;
  public readonly iconWrapper: HTMLDivElement;

  constructor(parent: HTMLDivElement) {
    super(parent);

    this.addClass('is-collapsed');
    this.mainWrapper.addClass('mod-collapsible');

    this.childrenWrapper = document.createElement('div');
    this.childrenWrapper.addClass('tree-item-children');

    this.iconWrapper = document.createElement('div');
    this.iconWrapper.addClass('tree-item-icon collapse-icon');
    this.iconWrapper.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
      <path d="M3 8L12 17L21 8"></path>
    </svg>
    `;

    this.appendChild(this.childrenWrapper);
    this.mainWrapper.prepend(this.iconWrapper);
  }

  public addTreeItem = (item: CrossbowTreeItem) => this.childrenWrapper.appendChild(item);
}