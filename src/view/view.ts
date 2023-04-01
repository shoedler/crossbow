import CrossbowPlugin, { CrossbowCacheMatch, CrossbowSuggestion } from '../main';
import {
  EditorPosition,
  ItemView,
  WorkspaceLeaf,
} from 'obsidian';
import { TreeItem, TreeItemLeaf } from './treeItem';

type LeafTreeItem = TreeItemLeaf<CrossbowCacheMatch>
type OccurrenceTreeItem = TreeItem<EditorPosition, LeafTreeItem>
type SuggestionTreeItem = TreeItem<CrossbowSuggestion, OccurrenceTreeItem>

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

  public clear = (): void => this.contentEl.empty();

  private getCurrentSuggestionTreeItems = (): SuggestionTreeItem[] =>
    this.contentEl.children.length > 0 ? Array.from(this.contentEl.children) as SuggestionTreeItem[] : [];

  private arrayCompare = <TOld, TNew>(old: TOld[], _new: TNew[], hashGetterOld: (inp: TOld) => string, hashGetterNew: (inp: TNew) => string): { onlyInOld: TOld[], onlyInNew: TNew[], inBoth: { old: TOld, _new: TNew }[] } => {
    const map: { [key: string]: { old?: TOld, _new?: TNew } } = {};

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

  public updateSuggestions = (suggestions: CrossbowSuggestion[], fileHasChanged: boolean) => {
    this.crossbow.debugLog(`${fileHasChanged ? "Clearing & adding" : "Updating"} suggestions`);

    const occurrenceHash = (o: EditorPosition) => o.line + ":" + o.ch;
    const matchHash = (o: CrossbowCacheMatch) => o.file.path;
    const compareSuggestion = (a: CrossbowSuggestion, b: CrossbowSuggestion) => a.word === b.word;

    const currentSuggestionTreeItems = this.getCurrentSuggestionTreeItems()

    if (fileHasChanged) {
      this.clear();
    }

    // Sort suggestions
    suggestions.sort((a, b) => a.word.localeCompare(b.word));
    suggestions.forEach(suggestion => {
      suggestion.occurrences.sort((a, b) => a.line - b.line);
      suggestion.matches.sort((a, b) => a.rank.codePointAt(0)! - b.rank.codePointAt(0)!);
    });

    suggestions.forEach((suggestion, index) => {
      // Find if this treeItem already exists
      const existingSuggestionTreeItemIndex = currentSuggestionTreeItems.findIndex(item => compareSuggestion(item.data, suggestion));
      const existingSuggestionTreeItem = existingSuggestionTreeItemIndex !== -1 ?
        currentSuggestionTreeItems.splice(existingSuggestionTreeItemIndex, 1)[0] :
        undefined;

      if (existingSuggestionTreeItem) {
        // Check if we need to update occurrences
        const existingOccurrenceTreeItems = existingSuggestionTreeItem.getChildren();
        const occurrencesDiff = this.arrayCompare(existingOccurrenceTreeItems, suggestion.occurrences, item => occurrenceHash(item.data), occ => occurrenceHash(occ));

        // Check if we need to update matches
        const existingMatches = existingSuggestionTreeItem.data.matches;
        const matchesDiff = this.arrayCompare(existingMatches, suggestion.matches, match => matchHash(match), match => matchHash(match));

        // States
        const needToUpdateMatches =
          matchesDiff.onlyInNew.length !== 0 ||
          matchesDiff.onlyInOld.length !== 0 ||
          matchesDiff.inBoth.length !== existingMatches.length;

        // Execute update
        occurrencesDiff.onlyInOld.forEach(item => item.remove()); // No brainer, this is always allowed

        if (occurrencesDiff.onlyInNew.length > 0) {
          occurrencesDiff.onlyInNew.forEach(occurrence => {
            const occurrenceTreeItem = this.createOccurrenceTreeItem(existingSuggestionTreeItem, occurrence);
            this.createMatchTreeItemLeafes(occurrenceTreeItem, suggestion);
          });
        }

        if (needToUpdateMatches) {
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

        const suggestionTreeItem = new TreeItem<CrossbowSuggestion, TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>>(suggestion, data => data.word);
        suggestionTreeItem.addFlair(availableMatchRanks);
        suggestionTreeItem.addTextSuffix(`(${suggestion.occurrences.length.toString()})`);

        // Insert index, so we keep the sorted order
        this.contentEl.insertBefore(suggestionTreeItem, this.contentEl.children[index]);

        // Occurrences
        suggestion.occurrences.forEach(occurrence => {
          const occurrenceItem = this.createOccurrenceTreeItem(suggestionTreeItem, occurrence);
          this.createMatchTreeItemLeafes(occurrenceItem, suggestion);
        });
      }
    });

    // Now, we're left with the items that we need to remove
    currentSuggestionTreeItems.forEach(item => item.remove());
  }

  private createOccurrenceTreeItem = (suggestionTreeItem: SuggestionTreeItem, occurrence: EditorPosition) => {
    const occurrenceItem = new TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>(occurrence, data => `On line ${data.line}:${data.ch}`);

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

    suggestionTreeItem.addChild(occurrenceItem);

    return occurrenceItem;
  }

  private createMatchTreeItemLeafes = (occurrenceTreeItem: TreeItem<EditorPosition, TreeItemLeaf<CrossbowCacheMatch>>, suggestion: CrossbowSuggestion) => {
    suggestion.matches
      .sort((a, b) => a.rank.codePointAt(0)! - b.rank.codePointAt(0)!)
      .forEach(match => {
        const matchItem = new TreeItemLeaf(match, data => `${data.rank} ${data.text}`);

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
        matchItem.addButton("Go To Source", 'lucide-search', () => {
          console.warn("🏹: 'Go To Source' is not yet implemented");
        });

        occurrenceTreeItem.addChild(matchItem);
      });
  }
}
