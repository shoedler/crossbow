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

import { CacheItem, CachedMetadata, TFile, Vault } from 'obsidian';
import { CrossbowSettingsService } from './settingsService';

type CacheEntryLookup = { [key: string]: CacheEntry };

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
  private readonly crossbowCache: CacheEntryLookup = {};

  public constructor(private readonly settingsService: CrossbowSettingsService) {}

  private addOrUpdateCacheEntry(entry: CacheEntry): void {
    this.crossbowCache[entry.text] = entry;
  }

  public getCache(): CacheEntryLookup {
    return this.crossbowCache;
  }

  public indexVault(vault: Vault): void {
    const files = vault.getFiles();
    files.forEach((file) => this.indexFile(file));
  }

  // 'cache' can be passed in, if this is called from an event handler which already has the cache
  // This will prevent the cache from being retrieved twice
  public indexFile(file: TFile, cache?: CachedMetadata): void {
    if (file.extension !== 'md') return;

    const metadata = cache ? cache : app.metadataCache.getFileCache(file);

    if (file.basename.length >= this.settingsService.getSettings().minimumSuggestionWordLength)
      this.addOrUpdateCacheEntry({ file, text: file.basename, type: 'File' });

    if (metadata) {
      if (metadata.headings)
        metadata.headings.forEach((headingCache) =>
          this.addOrUpdateCacheEntry({
            item: headingCache,
            file,
            text: headingCache.heading,
            type: 'Heading',
          })
        );
      if (metadata.tags)
        metadata.tags.forEach((tagCache) =>
          this.addOrUpdateCacheEntry({
            item: tagCache,
            file,
            text: tagCache.tag,
            type: 'Tag',
          })
        );
    }
  }

  public clearCache(): void {
    Object.assign(this.crossbowCache, {});
  }
}
