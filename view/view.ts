import CrossbowPlugin, { CrossbowCacheMatch, CrossbowSuggestion } from 'main';
import {
  ButtonComponent,
  EditorPosition,
  ItemView,
  WorkspaceLeaf,
} from 'obsidian';
import { TreeItem, TreeItemLeaf } from './treeItem';

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
    this.clear();
    if (suggestions)
      suggestions.forEach(suggestion => this.addSuggestionTreeItem(suggestion));
  }

  
  public updateSuggestions = (newSuggestions: CrossbowSuggestion[]): void => {
    const currentSuggestions = this.getCurrentSuggestionTreeItems();
    
    currentSuggestions
      .forEach(suggestionTreeItem => {
        const sameButNewSuggestion = newSuggestions.find(s => s.word === suggestionTreeItem.suggestionsReference.word);
        if (!sameButNewSuggestion) {
          // Remove, it's stale
          console.log(suggestionTreeItem);
          suggestionTreeItem.delete();
        }
        else {
          // Test if it requires an Update
          const isSameOccurrence = (a: EditorPosition, b: EditorPosition) => 
            a.line === b.line && a.ch === b.ch;
          const isSameMatch = (a: CrossbowCacheMatch, b: CrossbowCacheMatch) =>
            a.file.path === b.file.path && a.item?.position.start === b.item?.position.start && a.item?.position.end === b.item?.position.end;

          const newOrChangedOccurrences = sameButNewSuggestion.occurrences.filter(o => !suggestionTreeItem.suggestionsReference.occurrences.find(so => isSameOccurrence(so, o)));
          const sameOccurrences =         sameButNewSuggestion.occurrences.filter(o =>  suggestionTreeItem.suggestionsReference.occurrences.find(so => isSameOccurrence(so, o)));
          const staleOccurrences = suggestionTreeItem.suggestionsReference.occurrences.filter(o => !sameButNewSuggestion.occurrences.find(so => isSameOccurrence(so, o)));

          const newOrChangedMatches = sameButNewSuggestion.matches.filter(m => !suggestionTreeItem.suggestionsReference.matches.find(sm => isSameMatch(sm, m)));
          const sameMatches =         sameButNewSuggestion.matches.filter(m =>  suggestionTreeItem.suggestionsReference.matches.find(sm => isSameMatch(sm, m)));
          const staleMatches = suggestionTreeItem.suggestionsReference.matches.filter(m => !sameButNewSuggestion.matches.find(sm => isSameMatch(sm, m)));

          const noOccurrenceChanges = newOrChangedOccurrences.length === 0 && staleOccurrences.length === 0 && sameOccurrences.length === suggestionTreeItem.suggestionsReference.occurrences.length
          const noMatchChanges = newOrChangedMatches.length === 0 && staleMatches.length === 0 && sameMatches.length === suggestionTreeItem.suggestionsReference.matches.length

          if (noOccurrenceChanges && noMatchChanges) {
            console.log("No Changes for: " + suggestionTreeItem.suggestionsReference.word);
          }
          else {
            console.log("Changes for: " + suggestionTreeItem.suggestionsReference.word);

            if (newOrChangedOccurrences.length > 0) console.log("Should add occurrences: " + newOrChangedOccurrences.length);
            if (staleOccurrences.length > 0) console.log("Should remove occurrences: " + staleOccurrences.length);
            if (newOrChangedMatches.length > 0) console.log("Should add matches: " + newOrChangedMatches.length);
            if (staleMatches.length > 0) console.log("Should remove matches: " + staleMatches.length);
          }
        }
      });

    // Add new suggestions
    const suggestionsToAdd = newSuggestions.filter(ns => undefined === currentSuggestions.find(cs => cs.suggestionsReference.word === ns.word));
    suggestionsToAdd.forEach(s => this.addSuggestionTreeItem(s));
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

class CrossbowMatchTreeItemLeaf extends TreeItemLeaf {
  public readonly match: CrossbowCacheMatch;
  constructor(parent: CrossbowOccurrenceTreeItem, matchReference: CrossbowCacheMatch) {
    super(parent.getChildrenContainer());
    this.match = matchReference;
    this.setText();
  }

  public getText = () => `${this.match.rank} ${this.match.text}`;
  public static register = () => customElements.define("crossbow-match-tree-item-leaf", CrossbowMatchTreeItemLeaf);
}

class CrossbowOccurrenceTreeItem extends TreeItem {
  public readonly occurrence: EditorPosition;
  constructor(parent: CrossbowSuggestionTreeItem, occurrenceReference: EditorPosition) {
    super(parent.getChildrenContainer());
    this.occurrence = occurrenceReference;
    this.setText();
  }

  public getText = () => `On line ${this.occurrence.line}:${this.occurrence.ch}`
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