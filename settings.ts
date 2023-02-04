import { App, PluginSettingTab, Setting } from 'obsidian';
import CrossbowPlugin from './main';

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
			.setDesc('A list of words (case-sensitive) to ignore when searching for linkables. (Comma separated)')
			.addText(text => text
				.setPlaceholder("the,always,some")
				.setValue(this.plugin.settings.ignoredWords)
				.onChange(async (value) => {
					this.plugin.settings.ignoredWords = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Ignore suggestions which start with a lowercase letter')
			.setDesc('If checked, suggestions which start with a lowercase letter will be ignored')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.ignoreSuggestionsWhichStartWithLowercaseLetter)
				.onChange(async (value) => {
					console.log('Toggle: ' + value);
					this.plugin.settings.ignoreSuggestionsWhichStartWithLowercaseLetter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Suggest references in same file')
			.setDesc('If checked, references (Headers, Tags) to items in the same file will be suggested')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.suggestReferencesInSameFile)
				.onChange(async (value) => {
					console.log('Toggle: ' + value);
					this.plugin.settings.suggestReferencesInSameFile = value;
					await this.plugin.saveSettings();
				}));
	}
}
