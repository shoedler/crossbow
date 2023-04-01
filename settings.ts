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
      .setDesc('A case-sensitive, comma separated list of words to ignore when searching for linkables. (Whitepaces will be trimmed)')
      .addText(text => text
        .setValue(this.plugin.settings.ignoredWords?.join(", ") ?? "")
        .onChange(async value => await this.updateSettingValue('ignoredWords', value.split(",").map(word => word.trim()))));

    new Setting(containerEl)
      .setName('Ignore suggestions which start with a lowercase letter')
      .setDesc('If checked, suggestions which start with a lowercase letter will be ignored')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.ignoreSuggestionsWhichStartWithLowercaseLetter)
        .onChange(async value => await this.updateSettingValue('ignoreSuggestionsWhichStartWithLowercaseLetter', value)));

    new Setting(containerEl)
      .setName('Suggest references in same file')
      .setDesc('If checked, references (Headers, Tags) to items in the same file will be suggested')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.suggestReferencesInSameFile)
        .onChange(async value => await this.updateSettingValue('suggestReferencesInSameFile', value)));

    new Setting(containerEl)
      .setName('Minimum word length of suggestions')
      .setDesc('Defines the min. length a cached word must have for it to be considered a suggestion')
      .addText(text => text
        .setValue(this.plugin.settings.suggestedReferencesMinimumWordLength.toString())
        .onChange(async value => {
          if (!/^\s*\d+\s*$/.test(value)) 
            console.error(`Cannot set "suggestedReferencesMinimumWordLength" to NaN. Must be integer`);
          else 
            await this.updateSettingValue('suggestedReferencesMinimumWordLength', parseInt(value, 10));
        }));
  }

  private updateSettingValue = async <K extends keyof CrossbowPluginSettings>(key: K, value: CrossbowPluginSettings[K]) => {
    this.plugin.settings[key] = value;
    await this.plugin.saveSettings();
    this.plugin.runWithCacheUpdate(true);
  }
}