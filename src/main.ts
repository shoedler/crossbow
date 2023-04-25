// Copyright (C) 2023 - shoedler - github.com/shoedler
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

import { CrossbowView } from './view/view';
import { registerCrossbowIcons } from './icons';
import { CacheItem, Editor, MarkdownView, Plugin, TFile, CachedMetadata } from 'obsidian';
import { CrossbowPluginSettings, CrossbowSettingTab, DEFAULT_SETTINGS } from './settings';
import './editorExtension';
import { Match, Occurrence, Suggestion } from './suggestion';
import { registerTreeItemElements } from './view/treeItem';

type CustomCache = { [key: string]: CacheEntry };

export interface CacheEntry {
  file: TFile;
  item?: CacheItem;
  text: string;
  type: 'Tag' | 'File' | 'Heading';
}

export interface CacheMatch extends CacheEntry {
  rank: '🏆' | '🥇' | '🥈' | '🥉';
}

export default class CrossbowPlugin extends Plugin {
  public settings: CrossbowPluginSettings;

  private _currentFile: TFile;
  public get currentFile(): TFile {
    return this._currentFile;
  }

  private metadataChangedTimeout: ReturnType<typeof setTimeout>;
  private fileOpenTimeout: ReturnType<typeof setTimeout>;

  private readonly crossbowCache: CustomCache = {};

  public async onload(): Promise<void> {
    await this.loadSettings();

    // Register view elements
    registerCrossbowIcons();
    registerTreeItemElements();
    this.registerView(CrossbowView.viewType, (leaf) => new CrossbowView(leaf, this));

    // Ribbon icon to access the crossbow pane
    this.addRibbonIcon('crossbow', 'Crossbow', async (ev: MouseEvent) => {
      const existing = this.app.workspace.getLeavesOfType(CrossbowView.viewType);

      if (existing.length) {
        this.app.workspace.revealLeaf(existing[0]);
        return;
      }

      await this.app.workspace.getRightLeaf(false).setViewState({
        type: CrossbowView.viewType,
        active: true,
      });

      this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(CrossbowView.viewType)[0]);
    });

    // Settings-tab to configure crossbow
    this.addSettingTab(new CrossbowSettingTab(this.app, this));

    // Register event handlers
    this.registerEvent(this.app.workspace.on('file-open', this.onFileOpen));
    this.registerEvent(this.app.metadataCache.on('changed', this.onMetadataChange));

    this.debugLog('Crossbow is ready.');
  }

  public onunload(): void {
    Object.assign(this.crossbowCache, {});

    this.getCrossbowView().unload();
    this.debugLog('Unloaded Crossbow.');
  }

  public async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  public async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  public debugLog(message: string): void {
    this.settings.useLogging && console.log(`🏹: ${message}`);
  }

  private onMetadataChange = (file: TFile, data: string, cache: CachedMetadata): void => {
    if (this.metadataChangedTimeout) clearTimeout(this.metadataChangedTimeout);

    this.metadataChangedTimeout = setTimeout(() => {
      // Only update cache for the current file
      this.updateCrossbowCacheEntitiesOfFile(file, cache);
      this.debugLog(`Metadata cache updated for ${file.basename}.`);
      this.runWithoutCacheUpdate(false);
    }, 2600); // This value is arbitrary, but it seems to work well. 'onMetadataChange' get's triggerd every ~2 to ~2.5 seconds.
  };

  private onFileOpen = (): void => {
    const prevCurrentFile = this._currentFile;

    this.setActiveFile();
    this.debugLog('File opened.');

    if (this.fileOpenTimeout) clearTimeout(this.fileOpenTimeout);

    this.fileOpenTimeout = setTimeout(() => {
      if (!prevCurrentFile) this.runWithCacheUpdate(true); // Initial run
      else if (this._currentFile !== prevCurrentFile) this.runWithoutCacheUpdate(true); // Opened a different file
    }, 100);
  };

  public runWithCacheUpdate(fileHasChanged: boolean): void {
    const files = this.app.vault.getFiles();
    files.forEach((file) => this.updateCrossbowCacheEntitiesOfFile(file));
    this.runWithoutCacheUpdate(fileHasChanged);
  }

  public runWithoutCacheUpdate(fileHasChanged: boolean): void {
    const targetEditor = this.app.workspace.activeEditor?.editor;
    if (!targetEditor) return;

    const data = this.getSuggestionsInEditor(targetEditor);
    this.getCrossbowView()?.updateSuggestions(data, targetEditor, fileHasChanged);
  }

  private getCrossbowView(): CrossbowView {
    return app.workspace.getLeavesOfType(CrossbowView.viewType)[0]?.view as CrossbowView;
  }

  private addOrUpdateCacheEntity(entity: CacheEntry): void {
    this.crossbowCache[entity.text] = entity;
  }

  private getSuggestionsInEditor(targetEditor: Editor): Suggestion[] {
    const result: Suggestion[] = [];
    if (!targetEditor) return result;

    const wordLookup = targetEditor.getWordLookup();
    if (!wordLookup) return result;

    Object.entries(wordLookup).forEach((entry) => {
      const [word, editorPositions] = entry;
      const matchSet: Set<CacheMatch> = new Set();

      // Find matches
      Object.keys(this.crossbowCache).forEach((cacheKey) => {
        const lowercaseWord = word.toLowerCase();
        const lowercaseCacheKey = cacheKey.toLowerCase();

        // If reference is in the same file, and we don't want to suggest references in the same file, skip
        if (!this.settings.suggestInSameFile && this.crossbowCache[cacheKey].file === this._currentFile) return;

        // If we have a case-sensitive exact match, we always add it, even if it does not satisfy the other filters. Say we have a chapter with a heading 'C' (eg. the programming language)
        // We want to match a word 'C' in the current editor, even if it is too short or is on the ignore list.
        if (cacheKey === word) {
          matchSet.add({ ...this.crossbowCache[cacheKey], rank: '🏆' });
          return;
        }

        // If the word is on the ignore list, skip
        if (this.settings.ignoredWordsCaseSensisitve.includes(word)) return;

        // If the word is too short, skip
        if (word.length <= 3) return;

        // If the cache key is too short, skip
        if (cacheKey.length <= this.settings.minimumSuggestionWordLength) return;

        // If the word is not a substring of the key or the key is not a substring of the word, skip
        if ((lowercaseCacheKey.includes(lowercaseWord) || lowercaseWord.includes(lowercaseCacheKey)) === false) return;

        // If the word does not start with an uppercase letter, skip
        if (this.settings.ignoreOccurrencesWhichStartWithLowercaseLetter && cacheKey[0] === lowercaseCacheKey[0])
          return;

        // If the cache key does not start with an uppercase letter, skip
        if (this.settings.ignoreSuggestionsWhichStartWithLowercaseLetter && word[0] === lowercaseWord[0]) return;

        // If the word is a case-insensitive exact match, add as a very good suggestion
        if (lowercaseCacheKey === lowercaseWord) {
          matchSet.add({ ...this.crossbowCache[cacheKey], rank: '🥇' });
          return;
        }

        // If the lengths differ too much, add as not-very-good suggestion
        if ((1 / cacheKey.length) * word.length <= 0.2) {
          matchSet.add({ ...this.crossbowCache[cacheKey], rank: '🥉' });
          return;
        }

        // Else, add as a mediocre suggestion
        matchSet.add({ ...this.crossbowCache[cacheKey], rank: '🥈' });
      });

      if (matchSet.size > 0) {
        const matches = Array.from(matchSet).map((m) => new Match(m));
        const occurrences = editorPositions.map((p) => new Occurrence(p, matches));
        result.push(new Suggestion(word, occurrences));
      }
    });

    // Sort the result
    result.sort((a, b) => a.hash.localeCompare(b.hash)).forEach((suggestion) => suggestion.sortChildren());

    return result;
  }

  // 'cache' can be passed in, if this is called from an event handler which already has the cache
  // This will prevent the cache from being retrieved twice
  private updateCrossbowCacheEntitiesOfFile(file: TFile, cache?: CachedMetadata): void {
    if (file.extension !== 'md') return;

    const metadata = cache ? cache : app.metadataCache.getFileCache(file);

    if (file.basename.length >= this.settings.minimumSuggestionWordLength)
      this.addOrUpdateCacheEntity({ file, text: file.basename, type: 'File' });

    if (metadata) {
      if (metadata.headings)
        metadata.headings.forEach((headingCache) =>
          this.addOrUpdateCacheEntity({
            item: headingCache,
            file,
            text: headingCache.heading,
            type: 'Heading',
          })
        );
      if (metadata.tags)
        metadata.tags.forEach((tagCache) =>
          this.addOrUpdateCacheEntity({
            item: tagCache,
            file,
            text: tagCache.tag,
            type: 'Tag',
          })
        );
    }
  }

  private setActiveFile(): void {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView) {
      this._currentFile = leaf.view.file;
    } else console.warn('🏹: Unable to determine current editor.');
  }
}
