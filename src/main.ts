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
import { MarkdownView, Plugin, TFile, CachedMetadata, App, PluginManifest } from 'obsidian';
import { CrossbowSettingTab } from './settings';
import { registerTreeItemElements } from './view/treeItem';
import { CrossbowPluginSettings, CrossbowSettingsService, DEFAULT_SETTINGS } from './services/settingsService';
import { CrossbowIndexingService } from './services/indexingService';
import { CrossbowLoggingService } from './services/loggingService';
import { CrossbowTokenizationService } from './services/tokenizationService';
import { CrossbowSuggestionsService } from './services/suggestionsService';
import { CrossbowViewController } from './controllers/viewController';

export default class CrossbowPlugin extends Plugin {
  private readonly settingsService: CrossbowSettingsService;
  private readonly loggingService: CrossbowLoggingService;
  private readonly indexingService: CrossbowIndexingService;
  private readonly tokenizationService: CrossbowTokenizationService;
  private readonly suggestionsService: CrossbowSuggestionsService;
  private readonly viewController: CrossbowViewController;

  private currentFile: TFile;
  private metadataChangedTimeout: ReturnType<typeof setTimeout>;
  private fileOpenTimeout: ReturnType<typeof setTimeout>;

  public constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);

    this.settingsService = new CrossbowSettingsService(this.onSettingsChanged);
    this.loggingService = new CrossbowLoggingService(this.settingsService);
    this.indexingService = new CrossbowIndexingService(this.settingsService);
    this.tokenizationService = new CrossbowTokenizationService();
    this.suggestionsService = new CrossbowSuggestionsService(this.settingsService, this.indexingService);

    this.viewController = new CrossbowViewController(this.settingsService);
  }

  public async onload(): Promise<void> {
    // Load settings
    const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as CrossbowPluginSettings;
    this.settingsService.setSettings(settings); // Set, but don't save so we don't trigger a run

    // Register view elements
    registerCrossbowIcons();
    registerTreeItemElements();
    this.registerView(CrossbowView.viewType, (leaf) => new CrossbowView(leaf, this.onManualRefreshButtonClick));

    // Ribbon icon to access the crossbow pane
    this.addRibbonIcon('crossbow', 'Crossbow', async (ev: MouseEvent) => {
      await this.viewController.revealOrCreateView();

      // Run initially
      this.setActiveFile();
      this.runWithCacheUpdate(true);
    });

    // Settings-tab to configure crossbow
    this.addSettingTab(new CrossbowSettingTab(this.app, this, this.settingsService));

    // Register event handlers
    this.registerEvent(this.app.workspace.on('file-open', this.onFileOpen));
    this.registerEvent(this.app.metadataCache.on('changed', this.onMetadataChange));

    this.loggingService.debugLog('Crossbow is ready.');
  }

  public onunload(): void {
    this.viewController.unloadView();
    this.indexingService.clearCache();
    this.loggingService.debugLog('Unloaded Crossbow.');
  }

  private onMetadataChange = (file: TFile, data: string, cache: CachedMetadata): void => {
    if (this.metadataChangedTimeout) clearTimeout(this.metadataChangedTimeout);

    if (!this.settingsService.getSettings().useAutoRefresh) return;
    if (!this.viewController.doesCrossbowViewExist()) return;

    this.metadataChangedTimeout = setTimeout(() => {
      // Only update cache for the current file
      this.indexingService.indexFile(file, cache);
      this.runWithoutCacheUpdate(false);
      this.loggingService.debugLog(`Metadata cache updated for ${file.basename}.`);
    }, this.settingsService.getSettings().autoRefreshDelayMs); // This value is arbitrary (Min. 2600ms). 'onMetadataChange' get's triggerd every ~2 to ~2.5 seconds.
  };

  private onFileOpen = (): void => {
    if (!this.viewController.doesCrossbowViewExist()) return;

    const prevCurrentFile = this.currentFile;

    this.setActiveFile();
    this.loggingService.debugLog('File opened.');

    if (this.fileOpenTimeout) clearTimeout(this.fileOpenTimeout);

    this.fileOpenTimeout = setTimeout(() => {
      if (!prevCurrentFile) this.runWithCacheUpdate(true); // Initial run
      else if (this.currentFile !== prevCurrentFile) this.runWithoutCacheUpdate(true); // Opened a different file
    }, 100);
  };

  private onSettingsChanged = async (settings: CrossbowPluginSettings) => {
    this.loggingService.debugLog('Settings saved.');
    await this.saveData(settings);
    this.runWithCacheUpdate(true);
  };

  private onManualRefreshButtonClick = (): void => {
    this.loggingService.debugLog('Manually triggered update.');
    this.runWithoutCacheUpdate(true);
  }

  public runWithCacheUpdate(fileHasChanged: boolean): void {
    this.indexingService.indexVault(this.app.vault);
    this.runWithoutCacheUpdate(fileHasChanged);
  }

  public runWithoutCacheUpdate(fileHasChanged: boolean): void {
    const targetEditor = this.app.workspace.activeEditor?.editor;
    if (!targetEditor) return;

    const wordLookup = this.tokenizationService.getWordLookupFromEditor(targetEditor);
    const suggestions = this.suggestionsService.getSuggestionsFromWordlookup(wordLookup, this.currentFile);
    this.viewController.addOrUpdateSuggestions(suggestions, targetEditor, fileHasChanged);
  }

  private setActiveFile(): void {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView) {
      this.currentFile = leaf.view.file;
    } else console.warn('🏹: Unable to determine current editor.');
  }
}
