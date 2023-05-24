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

import { App, PluginSettingTab, Setting } from 'obsidian';
import CrossbowPlugin from './main';
import { CrossbowPluginSettings, CrossbowSettingsService } from './services/settingsService';
import { CrossbowUtilsService } from './services/utilsService';

export class CrossbowSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: CrossbowPlugin,
    private settingsService: CrossbowSettingsService,
    private utilsService: CrossbowUtilsService
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'Crossbow Settings 🏹' });

    this.addIndexingSettings(containerEl);
    this.addSuggestionsSettings(containerEl);
    this.addAutoRefreshSettings(containerEl);
    this.addLoggingSettings(containerEl);
  }

  private addIndexingSettings(containerEl: HTMLElement) {
    containerEl.createEl('h3', { text: 'Indexing' });

    new Setting(containerEl)
      .setName('Ignored Vault Folders')
      .setDesc(
        'A case-sensitive, comma separated list of folders (or paths, separated by "/") to ignore when indexing. (Whitepaces around commas will be trimmed)'
      )
      .addTextArea((textArea) => {
        textArea
          .setValue(this.settingsService.getSettings().ignoreVaultFolders?.join(', ') ?? '')
          .onChange(
            async (value) =>
              await this.updateSettingValue('ignoreVaultFolders', this.utilsService.toArrayOfPaths(value))
          );

        textArea.inputEl.setAttr('style', 'height: 10vh; width: 25vw;');
      });
  }

  private addSuggestionsSettings(containerEl: HTMLElement) {
    containerEl.createEl('h3', { text: 'Suggestions' });

    new Setting(containerEl)
      .setName('Ignored Words')
      .setDesc(
        'A case-sensitive, comma separated list of words to ignore when searching for items (Headers, tags). (Whitepaces around commas will be trimmed)'
      )
      .addTextArea((textArea) => {
        textArea
          .setValue(this.settingsService.getSettings().ignoredWordsCaseSensisitve?.join(', ') ?? '')
          .onChange(
            async (value) =>
              await this.updateSettingValue('ignoredWordsCaseSensisitve', this.utilsService.toWordList(value))
          );

        textArea.inputEl.setAttr('style', 'height: 10vh; width: 25vw;');
      });

    new Setting(containerEl)
      .setName('Ignore occurrences which start with a lowercase letter')
      .setDesc(
        'If checked, occurrences (Words in the active editor) which start with a lowercase letter will be ignored'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsService.getSettings().ignoreOccurrencesWhichStartWithLowercaseLetter)
          .onChange(
            async (value) => await this.updateSettingValue('ignoreOccurrencesWhichStartWithLowercaseLetter', value)
          )
      );

    new Setting(containerEl)
      .setName('Ignore suggestions which start with a lowercase letter')
      .setDesc('If checked, suggestions which start with a lowercase letter will be ignored')
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsService.getSettings().ignoreSuggestionsWhichStartWithLowercaseLetter)
          .onChange(
            async (value) => await this.updateSettingValue('ignoreSuggestionsWhichStartWithLowercaseLetter', value)
          )
      );

    new Setting(containerEl)
      .setName('Make suggestions to items in the same file')
      .setDesc('If checked, suggestions to items (Headers, Tags) in the same file be created')
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsService.getSettings().suggestInSameFile)
          .onChange(async (value) => await this.updateSettingValue('suggestInSameFile', value))
      );

    new Setting(containerEl)
      .setName('Minimum word length of suggestions')
      .setDisabled(!this.settingsService.getSettings().useAutoRefresh)
      .setDesc('Defines the min. length an item (Header, File, Tag) must have for it to be considered a suggestion')
      .addSlider((slider) => {
        slider
          .setLimits(1, 20, 1)
          .setValue(this.settingsService.getSettings().minimumSuggestionWordLength)
          .onChange(async (value) => await this.updateSettingValue('minimumSuggestionWordLength', value))
          .setDynamicTooltip();
      });
  }

  private addLoggingSettings(containerEl: HTMLElement) {
    containerEl.createEl('h3', { text: 'Debug' });

    new Setting(containerEl)
      .setName('Enable logging')
      .setDesc('If checked, debug logs will be printed to the console')
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsService.getSettings().useLogging)
          .onChange(async (value) => await this.updateSettingValue('useLogging', value))
      );
  }

  private addAutoRefreshSettings(containerEl: HTMLElement) {
    containerEl.createEl('h3', { text: 'Auto refresh' });

    const autoRefreshSetting = new Setting(containerEl)
      .setName('Enable auto refresh')
      .setDesc('If checked, crossbow will automatically refresh if the current note has been edited');

    const autoRefreshDelaySetting = new Setting(containerEl)
      .setName('Auto refresh delay')
      .setDesc('A delay in ms after which crossbow will refresh if the current note has been edited');

    let autoRefreshSettingUpdateTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

    autoRefreshSetting.addToggle((toggle) =>
      toggle.setValue(this.settingsService.getSettings().useAutoRefresh).onChange(async (value) => {
        autoRefreshDelaySetting.setDisabled(!value);
        await this.updateSettingValue('useAutoRefresh', value);
      })
    );

    autoRefreshDelaySetting.addSlider((slider) => {
      slider
        .setLimits(2600, 20000, 100)
        .setValue(this.settingsService.getSettings().autoRefreshDelayMs)
        .onChange(async (value) => {
          if (autoRefreshSettingUpdateTimeout) {
            clearTimeout(autoRefreshSettingUpdateTimeout);
          }

          autoRefreshSettingUpdateTimeout = setTimeout(async () => {
            await this.updateSettingValue('autoRefreshDelayMs', value);
          }, 1000);
        })
        .setDynamicTooltip();
    });
  }

  private updateSettingValue = async <K extends keyof CrossbowPluginSettings>(
    key: K,
    value: CrossbowPluginSettings[K]
  ) => {
    const settings = this.settingsService.getSettings();
    settings[key] = value;
    await this.settingsService.saveSettings(settings);
  };
}
