import { CrossbowView, CrossbowViewType } from 'view';
import { addCrossbowIcons } from 'icons';
import { CacheItem, Editor, MarkdownView, Plugin, TFile, EditorPosition, CachedMetadata } from 'obsidian';
import { CrossbowSettingTab } from './settings';
import './editorExtension';

export interface CrossbowPluginSettings {
  ignoredWords: string[];
  suggestReferencesInSameFile: boolean;
  ignoreSuggestionsWhichStartWithLowercaseLetter: boolean;
  suggestedReferencesMinimumWordLength: number;
}

const DEFAULT_SETTINGS: CrossbowPluginSettings = {
  ignoredWords: ["image", "the", "always", "some"],
  suggestReferencesInSameFile: false,
  ignoreSuggestionsWhichStartWithLowercaseLetter: true,
  suggestedReferencesMinimumWordLength: 3,
}

export interface CrossbowCacheEntity {
  file: TFile;
  item?: CacheItem;
  text: string;
}

export type CrossbowCache = { [key: string]: CrossbowCacheEntity }

export type CrossbowCacheMatch = CrossbowCacheEntity & { rank: (1|2|3|4|5|6|7|8|9|10) & number }

export class CrossbowSuggestion {
  public word: string;
  public occurrences: EditorPosition[];
  public matches: CrossbowCacheMatch[];
}

export default class CrossbowPlugin extends Plugin {
  public settings: CrossbowPluginSettings;
  private view: CrossbowView;

  private _currentEditor: Editor;
  public get currentEditor(): Editor { return this._currentEditor; } 
  private _currentFile: TFile;
  public get currentFile(): TFile { return this._currentFile; }

  private timeout: NodeJS.Timeout

  private readonly crossbowCache: CrossbowCache = {}

  private addOrUpdateCacheEntity = (entity: CrossbowCacheEntity) => this.crossbowCache[entity.text] = entity;
  
  private getCrossbowCacheMatchesInCurrentEditor = (): CrossbowSuggestion[] => {
    const result: CrossbowSuggestion[] = [];
    const wordLookup = this.currentEditor.getWordLookup();

    Object.entries(wordLookup).forEach(entry => {
      const [word, occurrences] = entry;
      const matchSet: Set<CrossbowCacheMatch> = new Set();

      // Find matches 
      Object.keys(this.crossbowCache).forEach(crossbowCacheKey => {
        // If we have a complete match, we always add it, even if it does not satisfy the filters. Say we have a chapter with a heading 'C' (the programming language)
        // We do want to match a word 'C' in the current editor.
        if (crossbowCacheKey === word) {
          matchSet.add({ ...this.crossbowCache[crossbowCacheKey], rank: 10 });
          return;
        }
        if (crossbowCacheKey.toLowerCase() === word.toLowerCase()) {
          matchSet.add({ ...this.crossbowCache[crossbowCacheKey], rank: 7 });
          return;
        }

        // Hard-filters on words of current editor:
        // If the word is too short, skip
        if (word.length <= 3)
          return;
        // If the word is an obsidian link, skip
        if (word.startsWith('[[') && word.endsWith(']]')) 
          return;
        // If the word is a link, skip
        if (word.startsWith('[') || word.startsWith('![') || word.endsWith(']'))
          return;
        if (word.startsWith('#')) 
          return;
        if (this.settings.ignoredWords.includes(word)) 
          return;
      
        // Hard-filters on cache keys:
        // If the cache key is too short, skip
        if (crossbowCacheKey.length <= this.settings.suggestedReferencesMinimumWordLength)
          return;
        // If reference is in the same file, and we don't want to suggest references in the same file, skip
        if (!this.settings.suggestReferencesInSameFile && this.crossbowCache[crossbowCacheKey].file === this._currentFile)
          return;
        // If the word is not a substring of the key or the key is not a substring of the word, skip
        if ((crossbowCacheKey.toLowerCase().includes(word.toLowerCase()) || word.toLowerCase().includes(crossbowCacheKey.toLowerCase())) === false)
          return;
        // If the word does not start with an uppercase letter, skip
        if (this.settings.ignoreSuggestionsWhichStartWithLowercaseLetter && (word.charCodeAt(0) === word.charAt(0).toLowerCase().charCodeAt(0)))
          return;

        // Soft-filters:
        // If the lengths differ too much, add as not-very-good suggestion
        if ((1 / crossbowCacheKey.length * word.length) <= 0.2) {
          matchSet.add({...this.crossbowCache[crossbowCacheKey], rank: 2 });
          return;
        }

        matchSet.add({...this.crossbowCache[crossbowCacheKey], rank: 5 });
      })
  
      const matches = Array.from(matchSet);

      if (matches.length > 0) {
        result.push({ word, occurrences, matches });
      }
    })

    return result;
    // Update cached entries in the editor. Each editor has a `matches` Array prop.
    // Instead of always re-pointing to the new matches array, we update the affected items.

    // The matches array on the editor needs to be some sort of controller which can observe changes.
    // On changes / new / delete we need to auto-magically update / add / remove tree-items in the view.
    // COMBAK

    // Add a matchType Property to the match results. str === str should be highest classification, str.tolower() === str.tolower() second, etc.
    // Visually mark the match quality
  }

  // 'cache' can be passed in, if this is called from an event handler which already has the cache
  // This will prevent the cache from being retrieved twice
  private updateCrossbowCacheEntitiesOfFile = (file: TFile, cache?: CachedMetadata) => {
    if (file.extension !== 'md')
      return;

    const metadata = cache? cache : app.metadataCache.getFileCache(file);		

    if (file.basename.length >= this.settings.suggestedReferencesMinimumWordLength) 
      this.addOrUpdateCacheEntity({ file, text: file.basename });
  
    if (metadata) {
      if (metadata.headings) 
        metadata.headings.forEach(headingCache => this.addOrUpdateCacheEntity({ item: headingCache, file, text: headingCache.heading }));
      if (metadata.tags) 
        metadata.tags.forEach(tagCache => this.addOrUpdateCacheEntity({ item: tagCache, file, text: tagCache.tag }));
    }
  }

  private setActiveEditorAndFile = (): void => {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView) {
      this._currentEditor = leaf.view.editor;
      this._currentFile = leaf.view.file;
    }
    else
      console.warn('🏹: Unable to determine current editor.');
  }

  public runWithCacheUpdate = () => {
    const files = this.app.vault.getFiles();
    files.forEach((file) => this.updateCrossbowCacheEntitiesOfFile(file));
    this.runWithoutCacheUpdate();
  }

  public runWithoutCacheUpdate = () => {
    this.view.clear();
    const data = this.getCrossbowCacheMatchesInCurrentEditor();
    this.view.updateResults(data);
  }

  public onload = async () => {
    await this.loadSettings();

    addCrossbowIcons()

    this.registerView(
      CrossbowViewType,
      (leaf) => (this.view = new CrossbowView(leaf, this)),
    );

    this.addRibbonIcon('crossbow', 'Crossbow', async (evt: MouseEvent) => {
      const existing = this.app.workspace.getLeavesOfType(CrossbowViewType);
      
      if (existing.length) {
        this.app.workspace.revealLeaf(existing[0]);
        return;
      }
  
      await this.app.workspace.getRightLeaf(false).setViewState({
        type: CrossbowViewType,
        active: true,
      });
  
      this.app.workspace.revealLeaf(
        this.app.workspace.getLeavesOfType(CrossbowViewType)[0],
      );
    });

    // Evenhandler for file-open events
    this.app.workspace.on('file-open', () => {
      this.setActiveEditorAndFile()
      console.log('🏹: File opened.');
      
      if (this.timeout) 
        clearTimeout(this.timeout)

      this.timeout = setTimeout(() => this.runWithoutCacheUpdate(), 100)
    })

    // Eventhandler for metadata cache updates
    this.app.metadataCache.on('changed', (file, data, cache) => {
      this.updateCrossbowCacheEntitiesOfFile(file, cache);
      console.log(`🏹: Metadata cache updated for ${file.basename}.`);

      if (this.timeout)
        clearTimeout(this.timeout)

      this.runWithoutCacheUpdate()
    })

    // SettingTab for crossbow 
    this.addSettingTab(new CrossbowSettingTab(this.app, this));

    // Run initially
    while (!this.currentEditor) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log('🏹: Waiting for editor to be ready.');
      
      try {
        this.setActiveEditorAndFile()
        this.runWithCacheUpdate();
      }
      catch (e) { /* ignore */ }
    }

    console.log('🏹: Crossbow is ready.');
  }

  public onunload = () => {
    Object.assign(this.crossbowCache, {});
    this.view.unload()
    console.log('🏹: Crossbow is unloaded.');
  }

  public loadSettings = async() => this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

  public saveSettings = async() => await this.saveData(this.settings);
}