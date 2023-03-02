import CrossbowPlugin, { CrossbowCacheMatch, CrossbowSuggestion } from 'main';
import {
  ButtonComponent,
  EditorPosition,
  ItemView,
  WorkspaceLeaf,
} from 'obsidian';

export class CrossbowView extends ItemView {
  private readonly crossbow: CrossbowPlugin;

  constructor(leaf: WorkspaceLeaf, crossbow: CrossbowPlugin) {
    CrossbowMatchTreeItemLeaf.register();
    CrossbowOccurrenceTreeItem.register();
    CrossbowSuggestionTreeItem.register();

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
    this.navigation = false;
  }

  public setSuggestions = (suggestions: CrossbowSuggestion[]): void => {
    if (suggestions)
      suggestions.forEach(suggestion => this.addSuggestionTreeItem(suggestion));
  }

  public updateSuggestions = (newSuggestions: CrossbowSuggestion[]): void => {
    const currentSuggestions = this.getCurrentSuggestionTreeItems();
    
    const suggestionsToAdd = newSuggestions.filter(ns => undefined === currentSuggestions.find(cs => cs.suggestionsReference.word === ns.word));

    currentSuggestions
      .map(ti => { return { ...ti, existsStill: false }})
      .forEach(suggestionTreeItem => {
        const sameButNewSuggestion = newSuggestions.find(s => s.word === suggestionTreeItem.suggestionsReference.word);
        if (!sameButNewSuggestion) {
          // Remove, it's stale
          console.log(suggestionTreeItem);
          suggestionTreeItem.delete();
        }
        else {
          // Test if it requires an Update
          console.log("Should have checked for update: " + suggestionTreeItem.suggestionsReference.word);
          COMBAK
        }
      });

    suggestionsToAdd.forEach(s => this.addSuggestionTreeItem(s));

    // Find suggestions which are new -> New TreeItem
    // Find suggestions which have more / less matches -> Update TreeItem
    // Find suggestions which are stale -> Delete TreeItem
    
    // Update cached entries in the editor. Each editor has a `matches` Array prop.
    // Instead of always re-pointing to the new matches array, we update the affected items.

    // The matches array on the editor needs to be some sort of controller which can observe changes.
    // On changes / new / delete we need to auto-magically update / add / remove tree-items in the view.
    // COMBAK

    // Build tree items
    // if (newSuggestions)
    //   newSuggestions.forEach(result => this.addSuggestionTreeItem(result));
  };

  public clear = (): void => this.contentEl.empty();

  private getCurrentSuggestionTreeItems = (): CrossbowSuggestionTreeItem[] => 
    this.contentEl.children.length > 0 ? Array.from(this.contentEl.children) as CrossbowSuggestionTreeItem[] : [];

  private addSuggestionTreeItem = (suggestion: CrossbowSuggestion) => {
    const ranks = new Set<CrossbowCacheMatch['rank']>();
    suggestion.matches.forEach(match => ranks.add(match.rank));

    const availableMatchRanks = Array.from(ranks).sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('');

    const rootItem = new CrossbowSuggestionTreeItem(this.contentEl, suggestion);
    rootItem.addFlair(availableMatchRanks);
    rootItem.addTextSuffix(`(${suggestion.occurrences.length.toString()})`);
  
    // Occurrences
    suggestion.occurrences.forEach(occurrence => {
      const childItem = new CrossbowOccurrenceTreeItem(rootItem, occurrence);
    
      // Scroll into view action
      const scrollIntoView = () => {
        const occurrenceEnd = { ch: occurrence.ch + suggestion.word.length, line: occurrence.line } as EditorPosition
        this.crossbow.currentEditor.setSelection(occurrence, occurrenceEnd);
        this.crossbow.currentEditor.scrollIntoView({ from: occurrence, to: occurrenceEnd }, true)
      }

      // Can be invoked via flair button
      childItem.addButton("Scroll into View", "lucide-scroll", (ev: MouseEvent) => {
        scrollIntoView();
        ev.preventDefault();
        ev.stopPropagation();
      });

      // As well as when expanding the suggestions, if it's collapsed. Greatly improves UX
      childItem.addOnClick(() => {
        if (!childItem.isCollapsed())
          scrollIntoView();
      });

      // Matches
      suggestion.matches
        .sort((a, b) => a.rank.codePointAt(0)! - b.rank.codePointAt(0)!)
        .forEach(match => {
          const leafChildItem = new CrossbowMatchTreeItemLeaf(childItem, match);

          // Add backlink & remove action
          leafChildItem.addButton("Use", 'lucide-inspect', () => {
            (Array.from(childItem.getChildrenContainer().children) as CrossbowOccurrenceTreeItem[])
              .forEach(ti => ti.setDisable());

            const occurrenceEnd = { ch: occurrence.ch + suggestion.word.length, line: occurrence.line } as EditorPosition
            const link = match.item ? 
              this.app.fileManager.generateMarkdownLink(match.file, match.text, "#" + match.text, suggestion.word) : 
              this.app.fileManager.generateMarkdownLink(match.file, match.text, undefined, suggestion.word);

            this.crossbow.currentEditor.replaceRange(link, occurrence, occurrenceEnd);
          });

          // Go to source action
          leafChildItem.addButton("Source", 'lucide-search', () => {
            console.warn("🏹: Go To Source is not yet implemented");
          });
        });
    });

    return rootItem;
  }
}

abstract class TreeItemLeaf extends HTMLElement {
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

  public addButton = (label: string, iconName:string, onclick: (this: HTMLDivElement, ev: MouseEvent) => any) => {
    const button = new ButtonComponent(this.mainWrapper);
    button.setTooltip(label);
    button.setIcon(iconName);
    button.setClass('tree-item-button');
    button.onClick(onclick);

    this.buttons.push(button);
  }
}

abstract class TreeItem extends TreeItemLeaf {
  private readonly childrenWrapper: HTMLDivElement;
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

class CrossbowMatchTreeItemLeaf extends TreeItemLeaf {
  public readonly matchReference: CrossbowCacheMatch;
  constructor(parent: CrossbowOccurrenceTreeItem, matchReference: CrossbowCacheMatch) {
    super(parent.getChildrenContainer());
    this.matchReference = matchReference;
    this.setText();
  }

  public getText = () => `${this.matchReference.rank} ${this.matchReference.text}`;
  public static register = () => customElements.define("crossbow-match-tree-item-leaf", CrossbowMatchTreeItemLeaf);
}

class CrossbowOccurrenceTreeItem extends TreeItem {
  public readonly occurrenceReference: EditorPosition;
  constructor(parent: CrossbowSuggestionTreeItem, occurrenceReference: EditorPosition) {
    super(parent.getChildrenContainer());
    this.occurrenceReference = occurrenceReference;
    this.setText();
  }

  public getText = () => `On line ${this.occurrenceReference.line}:${this.occurrenceReference.ch}`
  public static register = () => customElements.define("crossbow-match-tree-item", CrossbowOccurrenceTreeItem);
}

class CrossbowSuggestionTreeItem extends TreeItem {
  public readonly suggestionsReference: CrossbowSuggestion;
  constructor(parent: HTMLElement, suggestionsReference: CrossbowSuggestion) { 
    super(parent);
    this.suggestionsReference = suggestionsReference;
    this.setText();
  }

  public getText = () => this.suggestionsReference.word;
  public static register = () => customElements.define("crossbow-suggestion-tree-item", CrossbowSuggestionTreeItem);
}