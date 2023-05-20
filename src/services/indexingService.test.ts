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
import { CrossbowIndexingService } from './indexingService';
import { CrossbowLoggingService } from './loggingService';
import { CrossbowSettingsService, DEFAULT_SETTINGS } from './settingsService';

const proto = CrossbowIndexingService.prototype;

describe('indexingService', () => {
  describe(`${proto.indexFile.name}()`, () => {
    it('should generate cache entries for headings, tags and one for the file itself', () => {
      const fileName = 'testFile';
      const file = createFileMock(fileName);
      const metadata = createMetadataCacheMock();
      const service = createServiceMock();

      service.indexFile(file, metadata);
      const cache = service.getCache();

      // Key count
      expect(Object.keys(cache)).toHaveLength(5);
      expect(Object.values(cache).filter((value) => value.type === 'File')).toHaveLength(1);
      expect(Object.values(cache).filter((value) => value.type === 'Heading')).toHaveLength(3);
      expect(Object.values(cache).filter((value) => value.type === 'Tag')).toHaveLength(1);

      expect(Object.keys(getSourceLookup(service))).toHaveLength(1);

      // Should contain file cache entry
      expect(cache[fileName]).toBeDefined();
      expect(cache[fileName].type).toBe('File');

      if (metadata.headings === undefined) {
        throw new Error('Metadata headings are undefined');
      }

      // Should contain heading cache entries
      metadata.headings.forEach((headingCache) => {
        expect(cache[headingCache.heading]).toBeDefined();
        expect(cache[headingCache.heading].type).toBe('Heading');
        expect(cache[headingCache.heading].file).toBe(file);
        expect(cache[headingCache.heading].text).toBe(headingCache.heading);
      });

      if (metadata.tags === undefined) {
        throw new Error('Metadata tags are undefined');
      }

      // Should contain tag cache entries
      metadata.tags.forEach((tagCache) => {
        expect(cache[tagCache.tag]).toBeDefined();
        expect(cache[tagCache.tag].type).toBe('Tag');
        expect(cache[tagCache.tag].file).toBe(file);
        expect(cache[tagCache.tag].text).toBe(tagCache.tag);
      });
    });

    it('should not duplicate cache entries when file cache is provided', () => {
      const file = createFileMock('testFile');
      const metadata = createMetadataCacheMock();
      const service = createServiceMock();

      service.indexFile(file, metadata);
      expect(Object.keys(service.getCache())).toHaveLength(5);

      service.indexFile(file, metadata);
      expect(Object.keys(service.getCache())).toHaveLength(5);
    });
  });

  describe(`${proto.clearCacheFromFile.name}()`, () => {
    it('should clear cache entries (headings, tags and the file)', () => {
      const file: TFile = createFileMock('testFile');
      const metadata = createMetadataCacheMock();
      const service = createServiceMock();

      service.indexFile(file, metadata);
      expect(Object.keys(service.getCache())).toHaveLength(5);
      expect(Object.keys(getSourceLookup(service))).toHaveLength(1);

      service.clearCacheFromFile(file);
      expect(Object.keys(service.getCache())).toHaveLength(0);
      expect(Object.keys(getSourceLookup(service))).toHaveLength(0);
    });

    it("shouldn't clear cache entries (headings, tags and the file) of other files", () => {
      const file = createFileMock('testFile');
      const metadata = createMetadataCacheMock();
      const service = createServiceMock();

      service.indexFile(file, metadata);
      expect(Object.keys(service.getCache())).toHaveLength(5);
      expect(Object.keys(getSourceLookup(service))).toHaveLength(1);

      service.clearCacheFromFile(file);
      expect(Object.keys(service.getCache())).toHaveLength(0);
      expect(Object.keys(getSourceLookup(service))).toHaveLength(0);
    });
  });

  describe(`${proto.clearCache.name}()`, () => {
    it('should clear cache (and sourceFileLookup)', () => {
      const fileName1 = 'testFile';
      const file1 = createFileMock(fileName1);
      const metadata1 = createMetadataCacheMock();

      const fileName2 = 'testFile2';
      const file2 = createFileMock(fileName2);
      const metadata2 = createMetadataCacheMock();

      const service = createServiceMock();

      service.indexFile(file1, metadata1);
      service.indexFile(file2, metadata2);

      expect(Object.keys(service.getCache())).toHaveLength(10);
      expect(Object.keys(getSourceLookup(service))).toHaveLength(2);

      service.clearCache();
      expect(Object.keys(service.getCache())).toHaveLength(5);
      expect(Object.keys(getSourceLookup(service))).toHaveLength(1);
    });
  });
});

const settingsServiceMock = new CrossbowSettingsService((settings) => Promise.resolve());
const loggingService = new CrossbowLoggingService(settingsServiceMock);

settingsServiceMock.saveSettings(DEFAULT_SETTINGS);

const createServiceMock = (): CrossbowIndexingService =>
  new CrossbowIndexingService(settingsServiceMock, loggingService);

const getSourceLookup = (service: CrossbowIndexingService): object => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (service as any).sourceFileLookup as object;
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
