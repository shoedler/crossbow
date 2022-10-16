import { CrossbowMatchResult, CrossbowPluginSettings } from 'main';
import {
  Editor,
  EditorSelectionOrCaret,
  ItemView,
  MarkdownView,
  Notice,
  setIcon,
  WorkspaceLeaf,
} from 'obsidian';

export const CrossbowViewType = 'crossbow-toolbar';

export class CrossbowView extends ItemView {
  private readonly settings: CrossbowPluginSettings;

  constructor(leaf: WorkspaceLeaf, settings: CrossbowPluginSettings) {
    super(leaf);
    this.settings = settings;
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

  private results: CrossbowMatchResult[] = [];
  public updateResults = (results: CrossbowMatchResult[]): void => {
    this.results = results
    this.draw();
  };

  private getActiveEditor = (): Editor => {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView)
      return leaf.view.editor;
    else
      throw new Error('Crossbow: Unable to determine current editor.');
  }

  private truncate = (text: string, length: number = 20): string => {
    if (text.length > length)
      return text.substring(0, length - 3) + '...';
    else
      return text;
  }

  private readonly draw = (): void => {
    this.containerEl.empty();

    const nav = this.containerEl.createDiv({ cls: 'nav-header' });
    const container = this.containerEl.createDiv({ cls: 'tag-container' });

    // Build nav header
    const navButtons = nav.createDiv({ cls: 'nav-buttons-container' });
    const navButton = navButtons.createDiv({ cls: 'clickable-icon nav-action-button', attr: { 'aria-label': 'Run Crossbow' } });
    setIcon(navButton, 'crossbow');
    navButton.addEventListener('click', () => console.warn("Not implemented yet.")); // TODO: Implement

    this.results.forEach(result => {
      const treeItemDiv = container.createDiv({ cls: 'tree-item' });

      const treeItemSelfDiv = treeItemDiv.createDiv({ cls: 'tree-item-self' });
      const treeItemChildrenDiv = treeItemDiv.createDiv({ cls: 'tree-item-children' });

      const treeItemInnerDiv = treeItemSelfDiv.createDiv({ cls: 'tree-item-inner' });
      const treeItemInnerH = treeItemInnerDiv.createEl('h3');

      treeItemInnerH.style.margin = '0px';
      treeItemInnerH.innerText = result.word;

      // Create location tags
      // const treeItemInnerOccurrencesP = treeItemInnerDiv.createEl('p');
      // treeItemInnerOccurrencesP.style.margin = '2px';
      // treeItemInnerOccurrencesP.style.fontWeight = 'bold';
      // treeItemInnerOccurrencesP.innerText = "Occurrences";
      result.occurrences.forEach(occurrence => {
        const occurenceTagEl = treeItemInnerDiv.createEl('span');

        occurenceTagEl.style.backgroundColor = '#eaeaea';
        occurenceTagEl.style.borderRadius = '5px';
        occurenceTagEl.style.padding = '2px 5px';
        occurenceTagEl.style.margin = '2px 5px';

        occurenceTagEl.style.display = 'inline-block';
        occurenceTagEl.style.cursor = 'pointer';

        // Change color on hover
        occurenceTagEl.addEventListener('mouseenter', () => {
          occurenceTagEl.style.backgroundColor = '#d6d6d6';
        });

        occurenceTagEl.addEventListener('mouseleave', () => {
          occurenceTagEl.style.backgroundColor = '#eaeaea';
        });

        occurenceTagEl.innerText = "L" + occurrence.line + ":" + occurrence.ch;
        occurenceTagEl.addEventListener('click', () => {
          const editor = this.getActiveEditor();
          editor.setSelection(occurrence, { ch: occurrence.ch + result.word.length, line: occurrence.line } );
          editor.focus();
        });
      });

      // Create candidate tags
      // const treeItemInnerCandidatesP = treeItemInnerDiv.createEl('p');
      // treeItemInnerCandidatesP.style.margin = '2px';
      // treeItemInnerCandidatesP.style.fontWeight = 'bold';
      // treeItemInnerCandidatesP.innerText = "Candidates";
      result.matches.forEach(match => {
        const treeItemChildDiv = treeItemChildrenDiv.createDiv({ cls: 'tree-item' });
        const treeItemChildSelfDiv = treeItemChildDiv.createDiv({ cls: 'tree-item-self is-clickable' });

        const treeItemChildInnerDiv = treeItemChildSelfDiv.createDiv({ cls: 'tree-item-inner' });
        const treeItemChildFlairDiv = treeItemChildSelfDiv.createDiv({ cls: 'tree-item-flair-outer' });
        const treeItemChildInnerSpan = treeItemChildInnerDiv.createEl('span');
        const treeItemChildFlairSpan = treeItemChildFlairDiv.createEl('span', { cls: 'tree-item-flair' });

        treeItemChildInnerSpan.innerText = match.text;
        treeItemChildFlairSpan.innerText = `In File '${this.truncate(match.file.basename)}'`;

      })
    })
  };
}