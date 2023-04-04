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
import CrossbowPlugin, { CrossbowPluginSettings } from './main';

export class CrossbowSettingTab extends PluginSettingTab {
  plugin: CrossbowPlugin;

  constructor(app: App, plugin: CrossbowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'Crossbow Settings 🏹' });

    new Setting(containerEl)
      .setName('Ignored Words')
      .setDesc(
        'A case-sensitive, comma separated list of words to ignore when searching for linkables. (Whitepaces will be trimmed)'
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.ignoredWords?.join(', ') ?? '')
          .onChange(
            async (value) =>
              await this.updateSettingValue(
                'ignoredWords',
                value.split(',').map((word) => word.trim())
              )
          )
      );

    new Setting(containerEl)
      .setName('Ignore suggestions which start with a lowercase letter')
      .setDesc(
        'If checked, suggestions which start with a lowercase letter will be ignored'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.settings.ignoreSuggestionsWhichStartWithLowercaseLetter
          )
          .onChange(
            async (value) =>
              await this.updateSettingValue(
                'ignoreSuggestionsWhichStartWithLowercaseLetter',
                value
              )
          )
      );

    new Setting(containerEl)
      .setName('Suggest references in same file')
      .setDesc(
        'If checked, references (Headers, Tags) to items in the same file will be suggested'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.suggestReferencesInSameFile)
          .onChange(
            async (value) =>
              await this.updateSettingValue(
                'suggestReferencesInSameFile',
                value
              )
          )
      );

    new Setting(containerEl)
      .setName('Minimum word length of suggestions')
      .setDesc(
        'Defines the min. length a cached word must have for it to be considered a suggestion'
      )
      .addText((text) =>
        text
          .setValue(
            this.plugin.settings.suggestedReferencesMinimumWordLength.toString()
          )
          .onChange(async (value) => {
            if (!/^\s*\d+\s*$/.test(value))
              console.error(
                `Cannot set "suggestedReferencesMinimumWordLength" to NaN. Must be integer`
              );
            else
              await this.updateSettingValue(
                'suggestedReferencesMinimumWordLength',
                parseInt(value, 10)
              );
          })
      );

    new Setting(containerEl)
      .setName('Enable logging')
      .setDesc('If checked, debug logs will be printed to the console')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useLogging)
          .onChange(
            async (value) => await this.updateSettingValue('useLogging', value)
          )
      );
  }

  private updateSettingValue = async <K extends keyof CrossbowPluginSettings>(
    key: K,
    value: CrossbowPluginSettings[K]
  ) => {
    this.plugin.settings[key] = value;
    await this.plugin.saveSettings();
    this.plugin.runWithCacheUpdate(true);
  };
}