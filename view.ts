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

  private results: CrossbowMatchResult[] = [];
  public updateResults = (results: CrossbowMatchResult[]): void => {
    this.results = results
    this.draw();
  };

  private truncate = (text: string, length: number = 20): string => {
    if (text.length > length)
      return text.substring(0, length - 3) + '...';
    else
      return text;
  }

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

    this.results.forEach(result => {
      result.occurrences.forEach(occurrence => {
        const treeItemDiv = container.createDiv({ cls: 'tree-item' });
  
        const treeItemSelfDiv = treeItemDiv.createDiv({ cls: 'tree-item-self is-clickable' });
        const treeItemChildrenDiv = treeItemDiv.createDiv({ cls: 'tree-item-children' });
  
        const treeItemInnerDiv = treeItemSelfDiv.createDiv({ cls: 'tree-item-inner' });
        const treeItemFlairDiv = treeItemSelfDiv.createDiv({ cls: 'tree-item-flair-outer' });
        const treeItemFlairSpan = treeItemFlairDiv.createEl('span', { cls: 'tree-item-flair' });
        const treeItemInnerH = treeItemInnerDiv.createEl('h5');
  
        treeItemInnerH.style.margin = '0px';
        treeItemInnerH.innerText = result.word;
        treeItemFlairSpan.innerText = "L" + occurrence.line + ":" + occurrence.ch;

        treeItemInnerH.addEventListener('dblclick', () => {
          if (treeItemInnerH.getAttribute('clicked')) {
            treeItemInnerH.removeAttribute('clicked');
            treeItemChildrenDiv.style.display = 'none';
            return;
          }
          else {
            treeItemInnerH.setAttribute('clicked', 'true');
            treeItemChildrenDiv.style.display = 'block';
          }
        });

        treeItemInnerH.addEventListener('click', () => {
          const occurrenceEnd = { ch: occurrence.ch + result.word.length, line: occurrence.line } as EditorPosition
          this.crossbow.currentEditor.setSelection(occurrence, occurrenceEnd);
          this.crossbow.currentEditor.scrollIntoView({ from: occurrence, to: occurrenceEnd }, true)
        })

        treeItemChildrenDiv.style.display = 'none';

        // Create candidate tags
        result.matches.forEach(match => {
          const treeItemChildDiv = treeItemChildrenDiv.createDiv({ cls: 'tree-item' });
          const treeItemChildSelfDiv = treeItemChildDiv.createDiv({ cls: 'tree-item-self is-clickable' });
  
          const treeItemChildInnerDiv = treeItemChildSelfDiv.createDiv({ cls: 'tree-item-inner' });
          const treeItemChildFlairDiv = treeItemChildSelfDiv.createDiv({ cls: 'tree-item-flair-outer' });
          const treeItemChildInnerSpan = treeItemChildInnerDiv.createEl('span');
          const treeItemChildFlairSpan = treeItemChildFlairDiv.createEl('span', { cls: 'tree-item-flair' });
  
          treeItemChildInnerSpan.innerText = "🔗 " + match.text;
          treeItemChildFlairSpan.innerText = `In File '${this.truncate(match.file.basename)}'`;
  
          treeItemChildSelfDiv.addEventListener('click', () => {
            treeItemChildrenDiv.remove();
            treeItemInnerH.style.textDecoration = 'line-through';

            const occurrenceEnd = { ch: occurrence.ch + result.word.length, line: occurrence.line } as EditorPosition
            const link = match.item ? 
              this.app.fileManager.generateMarkdownLink(match.file, match.text, "#" + match.text, result.word) : 
              this.app.fileManager.generateMarkdownLink(match.file, match.text, undefined, result.word);

            this.crossbow.currentEditor.replaceRange(link, occurrence, occurrenceEnd);
          })
        })
      });

    })
  };
}