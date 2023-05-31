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

import type { CacheItem, CachedMetadata, TAbstractFile, TFile, Vault } from 'obsidian';
import type { CrossbowLoggingService } from './loggingService';
import type { CrossbowSettingsService } from './settingsService';

type CacheEntryLookup = { [key: string]: CacheEntry };

export type SourceCacheEntryLookupMap = { [key: TFile['path']]: CacheEntryLookup };

export interface CacheEntry {
  file: TFile;
  item?: CacheItem;
  text: string;
  type: 'Tag' | 'File' | 'Heading';
}

export interface CacheMatch extends CacheEntry {
  rank: '🏆' | '🥇' | '🥈' | '🥉';
}

export class CrossbowIndexingService {
  private crossbowCache: SourceCacheEntryLookupMap = {};

  public constructor(
    private readonly settingsService: CrossbowSettingsService,
    private readonly loggingService: CrossbowLoggingService
  ) {}

  private addOrUpdateCacheEntry(entry: CacheEntry, source: TFile): void {
    this.crossbowCache[source.path] = this.crossbowCache[source.path] ? this.crossbowCache[source.path] : {};
    this.crossbowCache[source.path][entry.text] = entry;
  }

  public getCache(): SourceCacheEntryLookupMap {
    return this.crossbowCache;
  }

  public indexVault(vault: Vault): void {
    this.clearCache();

    const files = vault.getFiles();
    files.forEach((file) => this.indexFile(file));
  }

  public clearCacheFromFile(path: string): void;
  public clearCacheFromFile(file: TAbstractFile): void;
  public clearCacheFromFile(fileOrPath: TAbstractFile | string): void {
    const path = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
    this.loggingService.debugLog(`Clearing cache for file ${path}`);
    delete this.crossbowCache[path];
  }

  // 'cache' can be passed in, if this is called from an event handler which already has the cache
  // This will prevent the cache from being retrieved twice
  public indexFile(file: TFile, cache?: CachedMetadata): void {
    const settings = this.settingsService.getSettings();

    if (file.extension !== 'md') return;
    if (settings.ignoreVaultFolders.some((folderOrPath) => file.path.startsWith(folderOrPath))) return;
    if (cache) this.clearCacheFromFile(file);

    const metadata = cache ? cache : app.metadataCache.getFileCache(file);

    if (file.basename.length >= settings.minimumSuggestionWordLength)
      this.addOrUpdateCacheEntry({ file, text: file.basename, type: 'File' }, file);

    if (metadata) {
      if (metadata.headings)
        metadata.headings.forEach((headingCache) =>
          this.addOrUpdateCacheEntry(
            {
              item: headingCache,
              file,
              text: headingCache.heading,
              type: 'Heading',
            },
            file
          )
        );
      if (metadata.tags)
        metadata.tags.forEach((tagCache) =>
          this.addOrUpdateCacheEntry(
            {
              item: tagCache,
              file,
              text: tagCache.tag,
              type: 'Tag',
            },
            file
          )
        );
    }
  }

  public clearCache(): void {
    this.crossbowCache = {};
  }
}
