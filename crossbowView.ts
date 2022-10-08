import { CrossbowMatchResult, CrossbowPluginSettings, getCrossbowCacheEntityName } from 'main';
import {
  Editor,
  ItemView,
  MarkdownView,
  Notice,
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

  private readonly draw = (): void => {
    const container = this.containerEl.children[1];

    const rootEl = document.createElement('div');

    const navHeader = rootEl.createDiv({ cls: 'nav-header' });
    const resultsDiv = navHeader.createDiv({ cls: 'nav-container' });

    this.results.forEach(result => {

      resultsDiv.createEl('h3', { text: result.word });

      const span = resultsDiv.createEl('span', { text: `${result.wordCount} occurrence${(result.wordCount > 1 ? 's' : '')}` });
      span.style.fontStyle = 'italic';
      
      result.matches.forEach(match => {
        const matchDiv = resultsDiv.createDiv({ cls: 'nav-item' });
        matchDiv.createEl('p', { text: `${getCrossbowCacheEntityName(match)} in File ${match.file.basename}` });
        matchDiv.addEventListener('click', () => this.app.workspace.openLinkText(getCrossbowCacheEntityName(match), '', false));
      });
      resultsDiv.createDiv({ cls: 'nav-divider' });
    })

    container.empty();
    container.appendChild(rootEl);
  };

  private readonly drawBtn = (
    parent: HTMLDivElement,
    iconName: string,
    title: string,
    fn: () => void,
  ): void => {
    const button = parent.createDiv({ cls: 'nav-action-button', title });
    button.onClickEvent(() => new Notice("Click!"));
    // button.appendChild(Element(icons[iconName]));
  };
}