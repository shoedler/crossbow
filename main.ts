import { CrossbowView, CrossbowViewType } from 'view';
import { addCrossbowIcons } from 'icons';
import { CacheItem, Editor, MarkdownView, Plugin, TFile, EditorPosition, CachedMetadata } from 'obsidian';
import { CrossbowSettingTab } from './settings';
import './editorExtension';

export interface CrossbowPluginSettings {
	ignoredWords: string;
	suggestReferencesInSameFile: boolean;
}

const DEFAULT_SETTINGS: CrossbowPluginSettings = {
	ignoredWords: 'image',
	suggestReferencesInSameFile: false
}

export interface CrossbowCacheEntity {
	file: TFile;
	item?: CacheItem;
	text: string;
}

export type CrossbowCacheLookup = { [key: string]: CrossbowCacheEntity }

export type CrossbowMatchResult = {
	word: string,
	occurrences: EditorPosition[],
	matches: CrossbowCacheEntity[]
}

export default class CrossbowPlugin extends Plugin {
	public settings: CrossbowPluginSettings;
	private view: CrossbowView;

	private _currentEditor: Editor;
	public get currentEditor(): Editor { return this._currentEditor; } 
	private _currentFile: TFile;
	public get currentFile(): TFile { return this._currentFile; }

	private timeout: NodeJS.Timeout

	private cache: CrossbowCacheLookup = {}
	private get keys(): string[] { return Object.keys(this.cache) }

	private addOrUpdate = (entity: CrossbowCacheEntity): void => {
		this.cache[entity.text] = entity;
	}
	
	private getCrossbowCacheMatchesForEditor = (): CrossbowMatchResult[] => {
		const ignoredWords = this.settings.ignoredWords.split(',').map(w => w.trim());
		const wordLookup = this.currentEditor.getWordLookup(ignoredWords);

		// For each word, find matches from linkable items in the cache and add them to the result
		const result: CrossbowMatchResult[] = []
		Object.entries(wordLookup).forEach(entry => {
			const [word, occurrences] = entry
			const matchSet: Set<CrossbowCacheEntity> = new Set()

			this.keys.forEach(key => {
				if (!this.settings.suggestReferencesInSameFile && this.cache[key].file === this._currentFile)
					return
				if ((key.toLowerCase().includes(word.toLowerCase()) || word.toLowerCase().includes(key.toLowerCase())) === false)
					return
				if ((1 / key.length * word.length) <= 0.1)
					return
				if (word.length <= 3)
					return;
				matchSet.add(this.cache[key])
			})		
	
			const matches = Array.from(matchSet)

			if (matches.length > 0) {
				result.push({ word, occurrences, matches })
			}
		})

		return result
	}

	// 'cache' can be passed in, if this is called from an event handler which already has the cache
	// This will prevent the cache from being retrieved twice
	private updateCrossbowCacheOfSingleFile = (file: TFile, cache?: CachedMetadata) => {
		if (file.extension !== 'md')
			return;

		const metadata = cache? cache : app.metadataCache.getFileCache(file);		
			
		this.addOrUpdate({ file, text: file.basename });
	
		if (metadata) {
			if (metadata.headings) 
				metadata.headings.forEach((heading) => this.addOrUpdate({ item: heading, file, text: heading.heading }));
			if (metadata.tags) 
				metadata.tags.forEach((tag) => this.addOrUpdate({ item: tag, file, text: tag.tag }));
		}
	}

	private setActiveEditorAndFile = (): void => {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf?.view instanceof MarkdownView) {
			this._currentEditor = leaf.view.editor;
			this._currentFile = leaf.view.file;
		}
    else
      throw new Error('Crossbow: Unable to determine current editor.');
  }

	public runWithCacheUpdate = () => {
		const files = this.app.vault.getFiles();
		files.forEach((file) => this.updateCrossbowCacheOfSingleFile(file));
		this.runWithoutCacheUpdate();
	}

	public runWithoutCacheUpdate = () => {
		this.view.clear();
		const data = this.getCrossbowCacheMatchesForEditor();
		this.view.updateResults(data);
	}

	async onload() {
		await this.loadSettings();
		addCrossbowIcons()

		this.registerView(
      CrossbowViewType,
      (leaf) => (this.view = new CrossbowView(leaf, this)),
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

		//
		// Evenhandler for file-open events
		this.app.workspace.on('file-open', () => {
			this.setActiveEditorAndFile()
			console.log('????: File opened.');
			
			if (this.timeout) 
				clearTimeout(this.timeout)

			this.timeout = setTimeout(() => this.runWithoutCacheUpdate(), 100)
		})

		//
		// Eventhandler for metadata cache updates
		this.app.metadataCache.on('changed', (file, data, cache) => {
			this.updateCrossbowCacheOfSingleFile(file, cache);
			console.log(`????: Metadata cache updated for ${file.basename}.`);

			if (this.timeout)
				clearTimeout(this.timeout)

			this.runWithoutCacheUpdate()
		})

		//
		// SettingTab for crossbow 
		this.addSettingTab(new CrossbowSettingTab(this.app, this));

		//
		// Run initially
		while (!this.currentEditor) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			console.log('????: Waiting for editor to be ready.');
			
			try {
				this.setActiveEditorAndFile()
				this.runWithCacheUpdate();
			}
			catch (e) { /* ignore */ }
		}

		console.log('????: Crossbow is ready.');
	}

	onunload() {
		this.cache = {}
		this.view.unload()
		console.log('????: Crossbow is unloaded.');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}