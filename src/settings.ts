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

export interface CrossbowPluginSettings {
  ignoredWordsCaseSensisitve: string[];
  suggestInSameFile: boolean;
  ignoreSuggestionsWhichStartWithLowercaseLetter: boolean;
  ignoreOccurrencesWhichStartWithLowercaseLetter: boolean;
  minimumSuggestionWordLength: number;

  useLogging: boolean;
}

export const DEFAULT_SETTINGS: CrossbowPluginSettings = {
  ignoredWordsCaseSensisitve: ['image', 'the', 'always', 'some'],
  suggestInSameFile: false,
  ignoreSuggestionsWhichStartWithLowercaseLetter: true,
  ignoreOccurrencesWhichStartWithLowercaseLetter: false,
  minimumSuggestionWordLength: 3,
  useLogging: false,
};

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
        'A case-sensitive, comma separated list of words to ignore when searching for items (Headers, tags). (Whitepaces will be trimmed)'
      )
      .addTextArea((textArea) => {
        textArea.setValue(this.plugin.settings.ignoredWordsCaseSensisitve?.join(', ') ?? '').onChange(
          async (value) =>
            await this.updateSettingValue(
              'ignoredWordsCaseSensisitve',
              value.split(',').map((word) => word.trim())
            )
        );

        textArea.inputEl.setAttr('style', 'height: 10vh; width: 25vw;');
      });

    new Setting(containerEl)
      .setName('Ignore suggestions which start with a lowercase letter')
      .setDesc('If checked, suggestions which start with a lowercase letter will be ignored')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ignoreSuggestionsWhichStartWithLowercaseLetter)
          .onChange(
            async (value) => await this.updateSettingValue('ignoreSuggestionsWhichStartWithLowercaseLetter', value)
          )
      );

    new Setting(containerEl)
      .setName('Ignore occurrences which start with a lowercase letter')
      .setDesc('If checked, occurrences (Words in the active editor) which start with a lowercase letter will be ignored')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ignoreOccurrencesWhichStartWithLowercaseLetter)
          .onChange(
            async (value) => await this.updateSettingValue('ignoreOccurrencesWhichStartWithLowercaseLetter', value)
          )
      );

    new Setting(containerEl)
      .setName('Make suggestions to items in the same file')
      .setDesc('If checked, suggestions to items (Headers, Tags) in the same file be created')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.suggestInSameFile)
          .onChange(async (value) => await this.updateSettingValue('suggestInSameFile', value))
      );

    new Setting(containerEl)
      .setName('Minimum word length of suggestions')
      .setDesc('Defines the min. length an item (Header, Tag) must have for it to be considered a suggestion')
      .addSlider((slider) => {
        slider
          .setLimits(1, 20, 1)
          .setValue(this.plugin.settings.minimumSuggestionWordLength)
          .onChange(async (value) => await this.updateSettingValue('minimumSuggestionWordLength', value))
          .setDynamicTooltip();
      });

    new Setting(containerEl)
      .setName('Enable logging')
      .setDesc('If checked, debug logs will be printed to the console')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useLogging)
          .onChange(async (value) => await this.updateSettingValue('useLogging', value))
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
