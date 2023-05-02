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

import { Match, Occurrence, Suggestion } from 'src/model/suggestion';
import { WordLookup } from './tokenizationService';
import { CrossbowSettingsService } from './settingsService';
import { CacheMatch, CrossbowIndexingService } from './indexingService';
import { TFile } from 'obsidian';

export class CrossbowSuggestionsService {
  public constructor(
    private readonly settingsService: CrossbowSettingsService,
    private readonly indexingService: CrossbowIndexingService
  ) {}

  public getSuggestionsFromWordlookup(wordLookup: WordLookup, currentFile: TFile): Suggestion[] {
    if (!wordLookup) return [];

    const result: Suggestion[] = [];
    const cache = this.indexingService.getCache();

    Object.entries(wordLookup).forEach((entry) => {
      const [word, editorPositions] = entry;
      const matchSet: Set<CacheMatch> = new Set();

      // Find matches
      Object.keys(cache).forEach((cacheKey) => {
        const lowercaseWord = word.toLowerCase();
        const lowercaseCacheKey = cacheKey.toLowerCase();

        // If reference is in the same file, and we don't want to suggest references in the same file, skip
        if (!this.settingsService.getSettings().suggestInSameFile && cache[cacheKey].file === currentFile) return;

        // If we have a case-sensitive exact match, we always add it, even if it does not satisfy the other filters. Say we have a chapter with a heading 'C' (eg. the programming language)
        // We want to match a word 'C' in the current editor, even if it is too short or is on the ignore list.
        if (cacheKey === word) {
          matchSet.add({ ...cache[cacheKey], rank: '🏆' });
          return;
        }

        // If the word is on the ignore list, skip
        if (this.settingsService.getSettings().ignoredWordsCaseSensisitve.includes(word)) return;

        // If the word is too short, skip
        if (word.length <= 3) return;

        // If the cache key is too short, skip
        if (cacheKey.length <= this.settingsService.getSettings().minimumSuggestionWordLength) return;

        // If the word is not a substring of the key or the key is not a substring of the word, skip
        if ((lowercaseCacheKey.includes(lowercaseWord) || lowercaseWord.includes(lowercaseCacheKey)) === false) return;

        // If the word does not start with an uppercase letter, skip
        if (
          this.settingsService.getSettings().ignoreOccurrencesWhichStartWithLowercaseLetter &&
          cacheKey[0] === lowercaseCacheKey[0]
        )
          return;

        // If the cache key does not start with an uppercase letter, skip
        if (
          this.settingsService.getSettings().ignoreSuggestionsWhichStartWithLowercaseLetter &&
          word[0] === lowercaseWord[0]
        )
          return;

        // If the word is a case-insensitive exact match, add as a very good suggestion
        if (lowercaseCacheKey === lowercaseWord) {
          matchSet.add({ ...cache[cacheKey], rank: '🥇' });
          return;
        }

        // If the lengths differ too much, add as not-very-good suggestion
        if ((1 / cacheKey.length) * word.length <= 0.2) {
          matchSet.add({ ...cache[cacheKey], rank: '🥉' });
          return;
        }

        // Else, add as a mediocre suggestion
        matchSet.add({ ...cache[cacheKey], rank: '🥈' });
      });

      if (matchSet.size > 0) {
        const matches = Array.from(matchSet).map((m) => new Match(m));
        const occurrences = editorPositions.map((p) => new Occurrence(p, matches));
        result.push(new Suggestion(word, occurrences));
      }
    });

    // Sort the result
    result.sort((a, b) => a.hash.localeCompare(b.hash)).forEach((suggestion) => suggestion.sortChildren());

    return result;
  }
}
