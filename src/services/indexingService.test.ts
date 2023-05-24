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

import { CachedMetadata, FileStats, HeadingCache, TFile, TFolder, TagCache, Vault } from 'obsidian';
import { CrossbowIndexingService, SourceCacheEntryLookupMap } from './indexingService';
import { CrossbowLoggingService } from './loggingService';
import { CrossbowPluginSettings, CrossbowSettingsService, DEFAULT_SETTINGS } from './settingsService';

const proto = CrossbowIndexingService.prototype;

describe(CrossbowIndexingService.constructor.name, () => {
  describe(`${proto.indexFile.name}()`, () => {
    it('should generate cache entries for headings, tags and one for the file itself', () => {
      const fileName = 'testFile';
      const file = createFileMock(fileName);
      const metadata = createMetadataCacheMock();
      const service = createServiceMock();

      service.indexFile(file, metadata);
      const fileCache = service.getCache()[file.path];

      // Key count
      expect(Object.keys(fileCache)).toHaveLength(5);
      expect(Object.values(fileCache).filter((value) => value.type === 'File')).toHaveLength(1);
      expect(Object.values(fileCache).filter((value) => value.type === 'Heading')).toHaveLength(3);
      expect(Object.values(fileCache).filter((value) => value.type === 'Tag')).toHaveLength(1);

      // Should contain file cache entry
      expect(fileCache[fileName]).toBeDefined();
      expect(fileCache[fileName].type).toBe('File');

      if (metadata.headings === undefined) {
        throw new Error('Metadata headings are undefined');
      }

      // Should contain heading cache entries
      metadata.headings.forEach((headingCache) => {
        expect(fileCache[headingCache.heading]).toBeDefined();
        expect(fileCache[headingCache.heading].type).toBe('Heading');
        expect(fileCache[headingCache.heading].file).toBe(file);
        expect(fileCache[headingCache.heading].text).toBe(headingCache.heading);
      });

      if (metadata.tags === undefined) {
        throw new Error('Metadata tags are undefined');
      }

      // Should contain tag cache entries
      metadata.tags.forEach((tagCache) => {
        expect(fileCache[tagCache.tag]).toBeDefined();
        expect(fileCache[tagCache.tag].type).toBe('Tag');
        expect(fileCache[tagCache.tag].file).toBe(file);
        expect(fileCache[tagCache.tag].text).toBe(tagCache.tag);
      });
    });

    it('should not duplicate cache entries when file cache is provided', () => {
      const file = createFileMock('testFile');
      const metadata = createMetadataCacheMock();
      const service = createServiceMock();

      service.indexFile(file, metadata);
      expect(Object.keys(service.getCache()[file.path])).toHaveLength(5);

      service.indexFile(file, metadata);
      expect(Object.keys(service.getCache()[file.path])).toHaveLength(5);
    });

    it('should not index files which are on the folder ignore list', () => {
      const file = createFileMock('testFile');
      file.path = 'testFolder/testFile';
      const metadata = createMetadataCacheMock();
      const service = createServiceMock({ ignoreVaultFolders: ['testFolder'] });

      service.indexFile(file, metadata);
      expect(service.getCache()).toEqual({});
    });
  });

  describe(`${proto.clearCacheFromFile.name}()`, () => {
    it('should clear cache entries (headings, tags and the file)', () => {
      const file: TFile = createFileMock('testFile');
      const metadata = createMetadataCacheMock();
      const service = createServiceMock();

      service.indexFile(file, metadata);
      expect(Object.keys(service.getCache()[file.path])).toHaveLength(5);

      service.clearCacheFromFile(file);

      expect(service.getCache()[file.path]).toBeUndefined();
      expect(Object.keys(Object.keys(service.getCache()).filter((filePath) => filePath === file.path))).toHaveLength(0);
    });

    it("shouldn't clear cache entries (headings, tags and the file) of other files", () => {
      const fileName1 = 'testFile';
      const file1 = createFileMock(fileName1);
      const metadata1 = createMetadataCacheMock();

      const fileName2 = 'testFile2';
      const file2 = createFileMock(fileName2);
      const metadata2 = createMetadataCacheMock();

      const service = createServiceMock();

      service.indexFile(file1, metadata1);
      service.indexFile(file2, metadata2);

      expect(countCacheEntries(service.getCache())).toEqual(10);
      expect(getCacheSources(service.getCache())).toEqual([file1.path, file2.path]);

      service.clearCacheFromFile(file1);

      expect(countCacheEntries(service.getCache())).toEqual(5);
      expect(getCacheSources(service.getCache())).toEqual([file2.path]);
    });
  });

  describe(`${proto.clearCache.name}()`, () => {
    it('should clear cache', () => {
      const fileName1 = 'testFile';
      const file1 = createFileMock(fileName1);
      const metadata1 = createMetadataCacheMock();

      const fileName2 = 'testFile2';
      const file2 = createFileMock(fileName2);
      const metadata2 = createMetadataCacheMock();

      const service = createServiceMock();

      service.indexFile(file1, metadata1);
      service.indexFile(file2, metadata2);

      expect(countCacheEntries(service.getCache())).toEqual(10);
      expect(getCacheSources(service.getCache())).toEqual([file1.path, file2.path]);

      service.clearCache();

      expect(countCacheEntries(service.getCache())).toEqual(0);
      expect(getCacheSources(service.getCache())).toEqual([]);
    });
  });
});

const settingsServiceMock = new CrossbowSettingsService((settings) => Promise.resolve());
const loggingService = new CrossbowLoggingService(settingsServiceMock);

settingsServiceMock.saveSettings(DEFAULT_SETTINGS);

const createServiceMock = (overrideSettings?: Partial<CrossbowPluginSettings>): CrossbowIndexingService => {
  if (overrideSettings) {
    const settings = settingsServiceMock.getSettings();
    Object.entries(overrideSettings).forEach(([key, value]) => {
      // @ts-ignore
      settings[key] = value;
    });
    settingsServiceMock.saveSettings(settings);
  }
  return new CrossbowIndexingService(settingsServiceMock, loggingService);
};

const createFileMock = (fileName: string): TFile => ({
  basename: fileName,
  name: `${fileName}Name`,
  path: `./${fileName}`,
  extension: 'md',
  stat: null as unknown as FileStats,
  vault: null as unknown as Vault,
  parent: null as unknown as TFolder,
});

const createMetadataCacheMock = (headingsCount = 3, tagsCount = 1): CachedMetadata => {
  const headings: HeadingCache[] = [];
  for (let index = 0; index < headingsCount; index++) {
    headings.push({
      level: index + 1,
      heading: `Heading ${index + 1}`,
      position: {
        start: { line: index, col: 0, offset: 0 },
        end: { line: index, col: 8 + index.toString().length, offset: 0 },
      },
    });
  }

  const tags: TagCache[] = [];
  for (let index = 0; index < tagsCount; index++) {
    tags.push({
      tag: `Tag ${index + 1}`,
      position: {
        start: { line: index + headingsCount, col: 0, offset: 0 },
        end: { line: index + headingsCount, col: 5 + index.toString().length, offset: 0 },
      },
    });
  }

  return { headings, tags };
};

const getCacheSources = (cache: SourceCacheEntryLookupMap): string[] => Object.keys(cache);
const countCacheEntries = (cache: SourceCacheEntryLookupMap): number =>
  Object.values(cache).reduce((a, b) => a + Object.values(b).length, 0);
