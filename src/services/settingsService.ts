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

export interface CrossbowPluginSettings {
  ignoredWordsCaseSensisitve: string[];
  suggestInSameFile: boolean;
  ignoreSuggestionsWhichStartWithLowercaseLetter: boolean;
  ignoreOccurrencesWhichStartWithLowercaseLetter: boolean;
  minimumSuggestionWordLength: number;
  useLogging: boolean;
  useAutoRefresh: boolean;
  autoRefreshDelayMs: number;
  ignoreVaultFolders: string[];
}

export const DEFAULT_SETTINGS: CrossbowPluginSettings = {
  ignoredWordsCaseSensisitve: ['image', 'the', 'always', 'some'],
  suggestInSameFile: false,
  ignoreSuggestionsWhichStartWithLowercaseLetter: true,
  ignoreOccurrencesWhichStartWithLowercaseLetter: false,
  minimumSuggestionWordLength: 3,
  useLogging: false,
  useAutoRefresh: true,
  autoRefreshDelayMs: 2600,
  ignoreVaultFolders: [],
};

export class CrossbowSettingsService {
  private settings: CrossbowPluginSettings;

  constructor(private onSettingsChange: (settings: CrossbowPluginSettings) => Promise<void>) {
    this.settings = DEFAULT_SETTINGS;
  }

  public getSettings(): CrossbowPluginSettings {
    return this.settings;
  }

  public setSettings(settings: CrossbowPluginSettings): void {
    this.settings = settings;
  }

  public async saveSettings(settings?: CrossbowPluginSettings): Promise<void> {
    this.settings = settings ?? this.settings;
    await this.onSettingsChange(this.settings);
  }
}
