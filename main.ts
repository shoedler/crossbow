import { CrossbowView, CrossbowViewType } from 'crossbowView';
import { addCrossbowIcons } from 'icons';
import { App, CachedMetadata, CacheItem, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, HeadingCache, Vault, TagCache, MetadataCache } from 'obsidian';
import { stripMarkdown, StripMarkdownOptions } from 'stripMarkdown';

// Remember to rename these classes and interfaces!

export interface CrossbowPluginSettings {
	mySetting: string;
	suggestReferencesInSameFile: boolean;
}

const DEFAULT_SETTINGS: CrossbowPluginSettings = {
	mySetting: 'default',
	suggestReferencesInSameFile: false
}

export type CrossbowCacheEntity = { item?: CacheItem, file: TFile }
export type CrossbowCacheLookup = { [key: string]: CrossbowCacheEntity }
export type CrossbowMatchResult = {
	word: string,
	wordCount: number,
	matches: CrossbowCacheEntity[]
}

export const getCrossbowCacheEntityName = (entity: CrossbowCacheEntity): string => {
	if (!entity.item)
		return entity.file.basename;
	else if ('heading' in entity.item!)
		return (entity.item as HeadingCache).heading;
	else if ('tag' in entity.item!)
		return (entity.item as TagCache).tag;
	else {
		console.log(entity);
		throw new Error(`Unknown cache item type`)
	}
}

export default class CrossbowPlugin extends Plugin {
	public settings: CrossbowPluginSettings;
	private view: CrossbowView;

	private cache: CrossbowCacheLookup = {}
	private get keys(): string[] { return Object.keys(this.cache) }

	private add = (entity: CrossbowCacheEntity): void => {
		const name = getCrossbowCacheEntityName(entity);
		this.cache[name] = entity;
	}

	private getCrossbowCacheMatchesForWord = (query: string, source: TFile): CrossbowCacheEntity[] => {
		const matches: Set<CrossbowCacheEntity> = new Set()
		this.keys.forEach(key => {
			if (!this.settings.suggestReferencesInSameFile && this.cache[key].file === source)
				return

			if ((key.toLowerCase().includes(query.toLowerCase()) || 
			     query.toLowerCase().includes(key.toLowerCase())) === false)
				return
			
			if ((1 / key.length * query.length) <= 0.1)
				return
				
			if (query.length <= 3)
				return;

			matches.add(this.cache[key])
		})		

		return Array.from(matches)
	}

	private getCrossbowCacheMatchesForEditor = (editor: Editor, view: MarkdownView): CrossbowMatchResult[] => {
		const md = editor.getValue();
		const plainText = stripMarkdown(md)

		const wordLookup: { [key: string]: number } = {}
		plainText
			.split(/\s+/)
			.filter(w => w.length > 0)
			.filter(w => !w.startsWith('[[') && !w.endsWith(']]'))
			.forEach(w => {
				if (w in wordLookup)
					wordLookup[w]++
				else
					wordLookup[w] = 1
			})

		const result: CrossbowMatchResult[] = []

		Object.entries(wordLookup).forEach(entry => {
			const [word, wordCount] = entry
			const matches = this.getCrossbowCacheMatchesForWord(word, view.file)
			if (matches.length > 0) {
				result.push({
					word,
					wordCount,
					matches: matches
				})
			}
		})

		return result
	}

	private updateCrossbowCache = () => {
		const files = this.app.vault.getFiles();

		files.forEach((file) => {
			const metadata = app.metadataCache.getFileCache(file);
		
			this.add({file});
		
			if (metadata) {
				if (metadata.headings) 
					metadata.headings.forEach((heading) => this.add({ item: heading, file }));
				if (metadata.tags) 
					metadata.tags.forEach((tag) => this.add({ item: tag, file }));
			}
		});
	}

	async onload() {
		await this.loadSettings();

		addCrossbowIcons()

		this.registerView(
      CrossbowViewType,
      (leaf) => (this.view = new CrossbowView(leaf, this.settings)),
    );

		this.addRibbonIcon('crossbow', 'Crossbow', async (evt: MouseEvent) => {
				const existing = this.app.workspace.getLeavesOfType(CrossbowViewType);
				
				if (existing.length) {
					this.app.workspace.revealLeaf(existing[0]);
					return;
				}
		
				await this.app.workspace.getRightLeaf(false).setViewState({
					type: CrossbowViewType,
					active: true,
				});
		
				this.app.workspace.revealLeaf(
					this.app.workspace.getLeavesOfType(CrossbowViewType)[0],
				);
		});

		this.addCommand({
			id: 'show-linkables',
			name: 'Show linkables',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.updateCrossbowCache();
				const data = this.getCrossbowCacheMatchesForEditor(editor, view);
				this.view.updateResults(data);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CrossbowSettingTab(this.app, this));
		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });

		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });

		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Crossbow Preview');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

class CrossbowSettingTab extends PluginSettingTab {
	plugin: CrossbowPlugin;

	constructor(app: App, plugin: CrossbowPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', {text: 'Crossbow Settings 🏹'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
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
