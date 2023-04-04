import { EditorPosition, ItemView, WorkspaceLeaf } from 'obsidian';
import { Match, Occurrence, Suggestion } from 'src/suggestion';
import CrossbowPlugin, { CacheMatch } from 'src/main';

export class CrossbowView extends ItemView {
  private readonly crossbow: CrossbowPlugin;

  constructor(leaf: WorkspaceLeaf, crossbow: CrossbowPlugin) {
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

  private getCurrentSuggestions = (): Suggestion[] =>
    this.contentEl.children.length > 0
      ? (Array.from(this.contentEl.children) as Suggestion[])
      : [];

  public updateSuggestions = (
    suggestions: Suggestion[],
    fileHasChanged: boolean
  ) => {
    this.crossbow.debugLog(
      `${fileHasChanged ? 'Clearing & adding' : 'Updating'} suggestions`
    );

    const currentSuggestions = this.getCurrentSuggestions();

    if (fileHasChanged) {
      this.clear();
    }

    // Sort
    suggestions.sort((a, b) => a.hash.localeCompare(b.hash));
    suggestions.forEach((suggestion) => suggestion.sortChildren());

    suggestions.forEach((suggestion, index) => {
      // Find if this Suggestion already exists
      const existingSuggestionIndex = currentSuggestions.findIndex(
        (item) => item.hash === suggestion.hash
      );
      const existingSuggestion =
        existingSuggestionIndex !== -1
          ? currentSuggestions.splice(existingSuggestionIndex, 1)[0]
          : undefined;

      const expandedOccurrencesHashes = existingSuggestion
        ? existingSuggestion
            .getChildren()
            .filter((item) => !item.isCollapsed())
            .map((item) => item.hash)
        : [];

      // Configure Occurrences
      suggestion.getChildren().forEach((occurrence) => {
        // Toggle expanded state, if it was expanded before
        if (expandedOccurrencesHashes.includes(occurrence.hash)) {
          occurrence.expand();
        }
      });

      // Insert / append the new suggestion, depending on whether it already existed
      existingSuggestion
        ? this.contentEl.replaceChild(suggestion, existingSuggestion)
        : this.contentEl.appendChild(suggestion);
      existingSuggestion?.remove();

      // Add flair
      const ranks = new Set<CacheMatch['rank']>();
      suggestion.cacheMatches.forEach((match) => ranks.add(match.rank));

      const availableMatchRanks = Array.from(ranks)
        .sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
        .join('');

      suggestion.addFlair(availableMatchRanks);
      suggestion.addTextSuffix(`(${suggestion.children.length.toString()})`);
    });

    // Now, we're left with the items that we need to remove
    currentSuggestions.forEach((item) => item.remove());
  };

  public createSuggestion = (
    word: string,
    editorPositions: EditorPosition[],
    cacheMatches: CacheMatch[]
  ): Suggestion => {
    const suggestion = new Suggestion(word, cacheMatches);
    const occurrences = editorPositions.map((p) => new Occurrence(p));

    occurrences.forEach((occurrence) => {
      const matches = suggestion.cacheMatches.map((m) => new Match(m));
      occurrence.addChildren(matches);

      // Scroll into view action
      const scrollIntoView = () => {
        const occurrenceEnd = {
          ch: occurrence.value.ch + suggestion.hash.length,
          line: occurrence.value.line,
        } as EditorPosition;
        this.crossbow.currentEditor.setSelection(
          occurrence.value,
          occurrenceEnd
        );
        this.crossbow.currentEditor.scrollIntoView(
          { from: occurrence.value, to: occurrenceEnd },
          true
        );
      };

      // Can be invoked via flair button...
      occurrence.addButton(
        'Scroll into View',
        'lucide-scroll',
        (ev: MouseEvent) => {
          scrollIntoView();
          ev.preventDefault();
          ev.stopPropagation();
        }
      );

      // As well as when expanding the suggestions, if it's collapsed. Greatly improves UX
      occurrence.addOnClick(() => {
        if (!occurrence.isCollapsed()) scrollIntoView();
      });

      // Configure Matches
      occurrence.getChildren().forEach((match) => {
        // Add backlink & remove action
        match.addButton('Use', 'lucide-inspect', () => {
          occurrence.getChildren().forEach((o) => o.setDisable());

          const occurrenceEnd = {
            ch: occurrence.value.ch + suggestion.hash.length,
            line: occurrence.value.line,
          } as EditorPosition;
          const link = match.value.item
            ? this.app.fileManager.generateMarkdownLink(
                match.value.file,
                match.value.text,
                '#' + match.value.text,
                suggestion.hash
              )
            : this.app.fileManager.generateMarkdownLink(
                match.value.file,
                match.value.text,
                undefined,
                suggestion.hash
              );

          this.crossbow.currentEditor.replaceRange(
            link,
            occurrence.value,
            occurrenceEnd
          );
        });

        // Go to source action
        match.addButton('Go To Source', 'lucide-search', () => {
          console.warn("🏹: 'Go To Source' is not yet implemented");
        });
      });
    });

    suggestion.addChildren(occurrences);

    return suggestion;
  };
}
