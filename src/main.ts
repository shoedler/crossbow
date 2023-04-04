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
import { CrossbowSettingTab } from './settings';
import './editorExtension';
import { Match, Occurrence, Suggestion } from './suggestion';

export interface CrossbowPluginSettings {
  ignoredWords: string[];
  suggestReferencesInSameFile: boolean;
  ignoreSuggestionsWhichStartWithLowercaseLetter: boolean;
  suggestedReferencesMinimumWordLength: number;

  useLogging: boolean;
}

const DEFAULT_SETTINGS: CrossbowPluginSettings = {
  ignoredWords: ['image', 'the', 'always', 'some'],
  suggestReferencesInSameFile: false,
  ignoreSuggestionsWhichStartWithLowercaseLetter: true,
  suggestedReferencesMinimumWordLength: 3,
  useLogging: false,
};

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

  private updateTimeout: ReturnType<typeof setTimeout>;

  private readonly crossbowCache: CustomCache = {};

  public runWithCacheUpdate(fileHasChanged: boolean): void {
    const files = this.app.vault.getFiles();
    files.forEach((file) => this.updateCrossbowCacheEntitiesOfFile(file));
    this.runWithoutCacheUpdate(fileHasChanged);
  }

  public runWithoutCacheUpdate(fileHasChanged: boolean): void {
    const data = this.getCrossbowSuggestionsInCurrentEditor();
    this.getCrossbowView()?.updateSuggestions(data, fileHasChanged);
  }

  public async onload(): Promise<void> {
    await this.loadSettings();

    // Register view elements
    registerCrossbowIcons();
    Suggestion.register();
    Occurrence.register();
    Match.register();
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
    this.updateCrossbowCacheEntitiesOfFile(file, cache);
    this.debugLog(`Metadata cache updated for ${file.basename}.`);

    if (this.updateTimeout) clearTimeout(this.updateTimeout);

    this.updateTimeout = setTimeout(() => {
      this.runWithoutCacheUpdate(false);
    }, 700);
  };

  private onFileOpen = (): void => {
    const prevCurrentFile = this._currentFile;

    this.setActiveEditorAndFile();
    this.debugLog('File opened.');

    if (this.updateTimeout) clearTimeout(this.updateTimeout);

    this.updateTimeout = setTimeout(() => {
      if (!prevCurrentFile) this.runWithCacheUpdate(true); // Initial run
      else if (this._currentFile !== prevCurrentFile) this.runWithoutCacheUpdate(true); // Opened a different file
    }, 200);
  };

  private getCrossbowView(): CrossbowView {
    return app.workspace.getLeavesOfType(CrossbowView.viewType)[0]?.view as CrossbowView;
  }

  private addOrUpdateCacheEntity(entity: CacheEntry): void {
    this.crossbowCache[entity.text] = entity;
  }

  private getCrossbowSuggestionsInCurrentEditor(): Suggestion[] {
    const result: Suggestion[] = [];
    const targetEditor = this.app.workspace.activeEditor?.editor;

    if (!targetEditor) return result;

    const wordLookup = targetEditor.getWordLookup();

    if (!wordLookup) return result;

    Object.entries(wordLookup).forEach((entry) => {
      const [word, editorPositions] = entry;
      const matchSet: Set<CacheMatch> = new Set();

      // Find matches
      Object.keys(this.crossbowCache).forEach((cacheKey) => {
        // If reference is in the same file, and we don't want to suggest references in the same file, skip
        if (!this.settings.suggestReferencesInSameFile && this.crossbowCache[cacheKey].file === this._currentFile)
          return;

        // If we have a complete match, we always add it, even if it does not satisfy the other filters. Say we have a chapter with a heading 'C' (the programming language)
        // We do want to match a word 'C' in the current editor, even if it is too short or is on the ignore list.
        if (cacheKey === word) {
          matchSet.add({ ...this.crossbowCache[cacheKey], rank: '🏆' });
          return;
        }
        if (cacheKey.toLowerCase() === word.toLowerCase()) {
          matchSet.add({ ...this.crossbowCache[cacheKey], rank: '🥇' });
          return;
        }

        // Hard-filters on words of current editor:
        // If the word is too short, skip
        if (word.length <= 3) return;
        if (this.settings.ignoredWords.includes(word)) return;

        // Hard-filters on cache keys:
        // If the cache key is too short, skip
        if (cacheKey.length <= this.settings.suggestedReferencesMinimumWordLength) return;
        // If the word is not a substring of the key or the key is not a substring of the word, skip
        if (
          (cacheKey.toLowerCase().includes(word.toLowerCase()) ||
            word.toLowerCase().includes(cacheKey.toLowerCase())) === false
        )
          return;
        // If the word does not start with an uppercase letter, skip
        if (
          this.settings.ignoreSuggestionsWhichStartWithLowercaseLetter &&
          word.charCodeAt(0) === word.charAt(0).toLowerCase().charCodeAt(0)
        )
          return;

        // Soft-filters:
        // If the lengths differ too much, add as not-very-good suggestion
        if ((1 / cacheKey.length) * word.length <= 0.2) {
          matchSet.add({ ...this.crossbowCache[cacheKey], rank: '🥉' });
          return;
        }

        // Else, add as a mediocre suggestion
        matchSet.add({ ...this.crossbowCache[cacheKey], rank: '🥈' });
      });

      if (matchSet.size > 0) {
        result.push(this.getCrossbowView().createSuggestion(word, editorPositions, Array.from(matchSet), targetEditor));
      }
    });

    return result;
  }

  // 'cache' can be passed in, if this is called from an event handler which already has the cache
  // This will prevent the cache from being retrieved twice
  private updateCrossbowCacheEntitiesOfFile(file: TFile, cache?: CachedMetadata): void {
    if (file.extension !== 'md') return;

    const metadata = cache ? cache : app.metadataCache.getFileCache(file);

    if (file.basename.length >= this.settings.suggestedReferencesMinimumWordLength)
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

  private setActiveEditorAndFile(): void {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView) {
      this._currentFile = leaf.view.file;
    } else console.warn('🏹: Unable to determine current editor.');
  }
}
