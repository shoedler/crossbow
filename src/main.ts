// Copyright (C) 2023 - shoedler - github.com/shoedler
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

import { App, CachedMetadata, MarkdownView, Plugin, PluginManifest, TAbstractFile, TFile } from 'obsidian';
import { CrossbowViewController } from './controllers/viewController';
import { registerCrossbowIcons } from './icons';
import { CrossbowIndexingService } from './services/indexingService';
import { CrossbowLoggingService } from './services/loggingService';
import { CrossbowPluginSettings, CrossbowSettingsService, DEFAULT_SETTINGS } from './services/settingsService';
import { CrossbowSuggestionsService } from './services/suggestionsService';
import { CrossbowTokenizationService } from './services/tokenizationService';
import { CrossbowUtilsService } from './services/utilsService';
import { CrossbowSettingTab } from './settings';
import { registerTreeElements } from './view/tree/tree';
import { CrossbowView } from './view/view';

export default class CrossbowPlugin extends Plugin {
  private readonly settingsService: CrossbowSettingsService;
  private readonly loggingService: CrossbowLoggingService;
  private readonly indexingService: CrossbowIndexingService;
  private readonly tokenizationService: CrossbowTokenizationService;
  private readonly suggestionsService: CrossbowSuggestionsService;
  private readonly utilsService: CrossbowUtilsService;

  private readonly viewController: CrossbowViewController;

  private currentFile: TFile;
  private metadataChangedTimeout: ReturnType<typeof setTimeout>;
  private fileOpenTimeout: ReturnType<typeof setTimeout>;

  public constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);

    this.settingsService = new CrossbowSettingsService(this.onSettingsChanged);
    this.loggingService = new CrossbowLoggingService(this.settingsService);
    this.indexingService = new CrossbowIndexingService(this.settingsService, this.loggingService);
    this.tokenizationService = new CrossbowTokenizationService();
    this.suggestionsService = new CrossbowSuggestionsService(this.settingsService, this.indexingService);
    this.utilsService = new CrossbowUtilsService();

    this.viewController = new CrossbowViewController(this.settingsService);
  }

  /** @implements {@link Plugin.onload} */
  public async onload(): Promise<void> {
    // Load settings
    const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as CrossbowPluginSettings;
    this.settingsService.setSettings(settings); // Set, but don't save so we don't trigger a run

    // Register view elements
    registerCrossbowIcons();
    registerTreeElements();

    this.registerView(CrossbowView.viewType, (leaf) => new CrossbowView(leaf, this.onManualRefreshButtonClick));

    // Ribbon icon to access the crossbow pane
    this.addRibbonIcon('crossbow', 'Crossbow', async (ev: MouseEvent) => {
      await this.viewController.revealOrCreateView();

      // Run initially
      this.setActiveFile();
      this.runWithCacheUpdate(true);
    });

    // Settings-tab to configure crossbow
    this.addSettingTab(new CrossbowSettingTab(this.app, this, this.settingsService, this.utilsService));

    // Register event handlers
    this.registerEvent(this.app.workspace.on('file-open', this.onFileOpen));
    this.registerEvent(this.app.metadataCache.on('changed', this.onMetadataChange));

    this.registerEvent(this.app.vault.on('rename', this.onFileRename));
    this.registerEvent(this.app.vault.on('delete', this.onFileDelete));

    this.loggingService.debugLog('Crossbow is ready.');
  }

  public onunload() {
    this.viewController.unloadView();
    this.indexingService.clearCache();

    this.loggingService.debugLog('Unloaded Crossbow.');
  }

  public runWithCacheUpdate(fileHasChanged: boolean): void {
    this.indexingService.indexVault(this.app.vault);
    this.runWithoutCacheUpdate(fileHasChanged);
  }

  public runWithoutCacheUpdate(fileHasChanged: boolean): void {
    // Get editor of current file
    const fileView = app.workspace
      .getLeavesOfType('markdown')
      .find((leaf) => leaf.view instanceof MarkdownView && leaf.view.file === this.currentFile)?.view as
      | MarkdownView
      | undefined;

    // #26 https://github.com/shoedler/crossbow/issues/26 - Don't know why we cannot set the mode programmatically.
    // console.log('fileView mode', fileView?.getMode()); // 'preview' is 'Reading' mode, 'source' is 'Editing' mode (aka. livePreview)
    // (fileView as any).setMode('source');

    if (!fileView) return;

    const targetEditor = fileView.editor;

    if (!targetEditor) return;

    const wordLookup = this.tokenizationService.getWordLookupFromEditor(targetEditor);
    const suggestions = this.suggestionsService.getSuggestionsFromWordlookup(wordLookup, this.currentFile);

    this.loggingService.debugLog(`Created ${suggestions.length} suggestions.`);

    this.viewController.addOrUpdateSuggestions(suggestions, targetEditor, fileHasChanged);
  }

  private onMetadataChange = (file: TFile, data: string, cache: CachedMetadata): void => {
    if (this.metadataChangedTimeout) clearTimeout(this.metadataChangedTimeout);

    if (!this.settingsService.getSettings().useAutoRefresh) return;
    if (!this.viewController.doesCrossbowViewExist()) return;

    this.metadataChangedTimeout = setTimeout(() => {
      // Only update cache for the current file
      this.indexingService.indexFile(file, cache);
      this.runWithoutCacheUpdate(false);
      this.loggingService.debugLog(`⚡Metadata cache updated. '${file.basename}'`);
    }, this.settingsService.getSettings().autoRefreshDelayMs); // This value is arbitrary (Min. 2600ms). 'onMetadataChange' get's triggerd every ~2 to ~2.5 seconds.
  };

  private onFileDelete = (file: TAbstractFile): void => {
    this.loggingService.debugLog(`⚡File deleted. '${file.name}'`);
    this.indexingService.clearCacheFromFile(file);
  };

  private onFileRename = (file: TAbstractFile, oldPath: string): void => {
    this.loggingService.debugLog(`⚡File renamed. '${file.name}'`);
    this.indexingService.clearCacheFromFile(oldPath);

    // TODO: Verify if we could just use: this.indexingService.indexFile(file as TFile);
    //       Could be problematic since file is TAbstractFile
    this.app.metadataCache.trigger('changed', file as TFile, ''); // Trigger metadata change to update cache
  };

  private onFileOpen = (): void => {
    if (!this.viewController.doesCrossbowViewExist()) return;

    const prevCurrentFile = this.currentFile;

    this.setActiveFile();
    this.loggingService.debugLog(`⚡File opened. '${this.currentFile?.name}'`);

    if (this.fileOpenTimeout) clearTimeout(this.fileOpenTimeout);

    this.fileOpenTimeout = setTimeout(() => {
      if (!prevCurrentFile) this.runWithCacheUpdate(true); // Initial run
      else if (this.currentFile !== prevCurrentFile) this.runWithoutCacheUpdate(true); // Opened a different file
    }, 100);
  };

  private onSettingsChanged = async (settings: CrossbowPluginSettings) => {
    this.loggingService.debugLog('⚡Settings saved.');
    await this.saveData(settings);
    this.runWithCacheUpdate(true);
  };

  private onManualRefreshButtonClick = (): void => {
    this.loggingService.debugLog('Manually triggered update.');
    this.runWithoutCacheUpdate(true);
  };

  private setActiveFile(): void {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView && leaf.view.file) {
      this.currentFile = leaf.view.file;
    } else CrossbowLoggingService.forceLog('warn', 'Unable to determine current editor.');
  }
}
