import CrossbowPlugin, { CrossbowCacheMatch, CrossbowSuggestion } from 'main';
import {
  EditorPosition,
  ItemView,
  WorkspaceLeaf,
} from 'obsidian';
import { TreeItem, TreeItemLeaf } from './treeItem';

export class CrossbowView extends ItemView {
  private readonly crossbow: CrossbowPlugin;

  constructor(leaf: WorkspaceLeaf, crossbow: CrossbowPlugin) {
    TreeItemLeaf.register();
    TreeItem.register();

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
    this.addSuggestionTreeItems(suggestions);
  }

  public updateSuggestions = (newSuggestions: CrossbowSuggestion[]): void => {
    this.addSuggestionTreeItems(newSuggestions);
  };

  public clear = (): void => this.contentEl.empty();

  private getCurrentSuggestionTreeItems = (): TreeItem<CrossbowSuggestion, TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>>[] => 
    this.contentEl.children.length > 0 ? Array.from(this.contentEl.children) as TreeItem<CrossbowSuggestion, TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>>[] : [];

  private arrayCompare = <TOld, TNew>(old: TOld[], _new: TNew[], hashGetterOld: (inp: TOld) => string, hashGetterNew: (inp: TNew) => string): { onlyInOld: TOld[], onlyInNew: TNew[], inBoth: { old: TOld, _new: TNew }[] } => {
    const map: { [key: string]: { old?: TOld, _new?: TNew }} = {};

    for (let i = 0; i < old.length; i++) {
      const key = hashGetterOld(old[i]);
      map[key] ? map[key]['old'] = old[i] : map[key] = { old: old[i] };
    }

    for (let i = 0; i < _new.length; i++) {
      const key = hashGetterNew(_new[i]);
      map[key] ? map[key]['_new'] = _new[i] : map[key] = { _new: _new[i] };
    }

    const onlyInOld: TOld[] = [];
    const onlyInNew: TNew[] = [];
    const inBoth: { old: TOld, _new: TNew }[] = [];

    Object.values(map).forEach(value => {
      if ('old' in value && '_new' in value && value.old && value._new)
        inBoth.push(value as { old: TOld, _new: TNew });
      else if (value.old && !value._new)
        onlyInOld.push(value.old);
      else if (!value.old && value._new)
        onlyInNew.push(value._new);
      else 
        throw new Error("Inconsistent Data");
    });

    return { onlyInOld, onlyInNew, inBoth };
  }

  private addSuggestionTreeItems = (suggestions: CrossbowSuggestion[]) => {
    const currentSuggestionTreeItems = this.getCurrentSuggestionTreeItems();

    suggestions.forEach(suggestion => {
      // Find if this treeItem already exists
      const existingSuggestionTreeItem = currentSuggestionTreeItems.find(item => item.data.word === suggestion.word);

      if (existingSuggestionTreeItem) {
        const occurrenceHash = (o: EditorPosition) => `${o.line}:${o.ch}`;
        const matchHash = (m: CrossbowCacheMatch) => m.file.path;

        // Check if we need to update occurrences
        const existingOccurrenceTreeItems = existingSuggestionTreeItem.getChildren();
        const occurrencesDiff = this.arrayCompare(existingOccurrenceTreeItems, suggestion.occurrences, item => occurrenceHash(item.data), occ => occurrenceHash(occ));

        // Check if we need to update matches
        const existingMatches = existingSuggestionTreeItem.data.matches;
        const matchesDiff = this.arrayCompare(existingMatches, suggestion.matches, match => matchHash(match), match => matchHash(match));

        // States
        const doAddNewOccurrences = occurrencesDiff.onlyInNew.length > 0;
        const doUpdateMatches = 
          matchesDiff.onlyInNew.length !== 0 || 
          matchesDiff.onlyInOld.length !== 0 || // TODO: Optimize, in this case we can just remove the old ones
          matchesDiff.inBoth.length !== existingMatches.length;

        // Execute update
        occurrencesDiff.onlyInOld.forEach(item => item.remove()); // No brainer, this is always allowed

        if (doAddNewOccurrences) {
          occurrencesDiff.onlyInNew.forEach(occurrence => {
            const occurrenceTreeItem = this.createOccurrenceTreeItem(existingSuggestionTreeItem, occurrence);
            this.createMatchTreeItemLeafes(occurrenceTreeItem, suggestion);
          });
        }

        if (doUpdateMatches) {
          // In this case, we'll just re-generate all match tree items using the new-suggestion's matches
          existingOccurrenceTreeItems.forEach(occurrenceTreeItem => {
            // Clear children
            occurrenceTreeItem.deleteChildren();
            this.createMatchTreeItemLeafes(occurrenceTreeItem, suggestion);
          });
        }
      }
      else {
        const ranks = new Set<CrossbowCacheMatch['rank']>();
        suggestion.matches.forEach(match => ranks.add(match.rank));
    
        const availableMatchRanks = Array.from(ranks).sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('');
    
        const suggestionTreeItem = new TreeItem<CrossbowSuggestion, TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>>(this.contentEl, suggestion, data => data.word);
        suggestionTreeItem.addFlair(availableMatchRanks);
        suggestionTreeItem.addTextSuffix(`(${suggestion.occurrences.length.toString()})`);
      
        // Occurrences
        suggestion.occurrences.forEach(occurrence => {
          const occurrenceItem = this.createOccurrenceTreeItem(suggestionTreeItem, occurrence);
          this.createMatchTreeItemLeafes(occurrenceItem, suggestion);
        });
      }

    });
  }

  private createOccurrenceTreeItem = (suggestionTreeItem: TreeItem<CrossbowSuggestion, TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>>, occurrence: EditorPosition) => {
    const occurrenceItem = new TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>(suggestionTreeItem, occurrence, data => `On line ${data.line}:${data.ch}`);

    // Scroll into view action
    const scrollIntoView = () => {
      const occurrenceEnd = { ch: occurrence.ch + suggestionTreeItem.data.word.length, line: occurrence.line } as EditorPosition
      this.crossbow.currentEditor.setSelection(occurrence, occurrenceEnd);
      this.crossbow.currentEditor.scrollIntoView({ from: occurrence, to: occurrenceEnd }, true)
    }

    // Can be invoked via flair button
    occurrenceItem.addButton("Scroll into View", "lucide-scroll", (ev: MouseEvent) => {
      scrollIntoView();
      ev.preventDefault();
      ev.stopPropagation();
    });

    // As well as when expanding the suggestions, if it's collapsed. Greatly improves UX
    occurrenceItem.addOnClick(() => {
      if (!occurrenceItem.isCollapsed())
        scrollIntoView();
    });

    return occurrenceItem;
  }

  private createMatchTreeItemLeafes = (occurrenceTreeItem: TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>, suggestion: CrossbowSuggestion) => {
    suggestion.matches
      .sort((a, b) => a.rank.codePointAt(0)! - b.rank.codePointAt(0)!)
      .forEach(match => {
        const matchItem = new TreeItemLeaf(occurrenceTreeItem, match, data => `${data.rank} ${data.text}`);

        // Add backlink & remove action
        matchItem.addButton("Use", 'lucide-inspect', () => {
          occurrenceTreeItem.getChildren()
            .forEach(ti => ti.setDisable());

          const occurrenceEnd = { ch: occurrenceTreeItem.data.ch + suggestion.word.length, line: occurrenceTreeItem.data.line } as EditorPosition
          const link = match.item ? 
            this.app.fileManager.generateMarkdownLink(match.file, match.text, "#" + match.text, suggestion.word) : 
            this.app.fileManager.generateMarkdownLink(match.file, match.text, undefined, suggestion.word);

          this.crossbow.currentEditor.replaceRange(link, occurrenceTreeItem.data, occurrenceEnd);
        });

        // Go to source action
        matchItem.addButton("Source", 'lucide-search', () => {
          console.warn("🏹: Go To Source is not yet implemented");
        });
      });
  }

  private addSuggestionTreeItem = (suggestion: CrossbowSuggestion) => {
    const ranks = new Set<CrossbowCacheMatch['rank']>();
    suggestion.matches.forEach(match => ranks.add(match.rank));

    const availableMatchRanks = Array.from(ranks).sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('');

    const rootItem = new TreeItem<CrossbowSuggestion, TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>>(this.contentEl, suggestion, data => data.word);
    rootItem.addFlair(availableMatchRanks);
    rootItem.addTextSuffix(`(${suggestion.occurrences.length.toString()})`);
  
    // Occurrences
    suggestion.occurrences.forEach(occurrence => {
      const childItem = new TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>(rootItem, occurrence, data => `On line ${data.line}:${data.ch}`);

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
          const leafChildItem = new TreeItemLeaf(childItem, match, data => `${data.rank} ${data.text}`);

          // Add backlink & remove action
          leafChildItem.addButton("Use", 'lucide-inspect', () => {
            childItem.getChildren()
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


class TreeItemView {
  public suggestions: TreeItem<CrossbowSuggestion, TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>>[] = [];
  public update = (newSuggestions: CrossbowSuggestion[]) => {

  }
}